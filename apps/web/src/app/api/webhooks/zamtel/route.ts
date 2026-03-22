import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSMSJob } from '@/lib/queues/sms.queue';
import crypto from 'crypto';

function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const secret = process.env.ZAMTEL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook:Zamtel] ZAMTEL_WEBHOOK_SECRET not configured');
    return false;
  }
  const signature =
    request.headers.get('x-zamtel-signature') ?? request.headers.get('x-callback-signature') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(request, rawBody)) {
        console.error('[Webhook:Zamtel] Invalid webhook signature');
        return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);

    // Zamtel Kwacha callback payload structure
    const transactionId = body.transactionId ?? body.transaction_id ?? body.txnId;
    const status = body.status ?? body.transactionStatus;
    const reference = body.reference ?? body.externalReference ?? body.merchantReference;
    const amount = body.amount;
    const phone = body.msisdn ?? body.phoneNumber ?? body.subscriberNumber;

    console.log(
      `[Webhook:Zamtel] Received callback: ref=${reference}, status=${status}, txId=${transactionId}`
    );

    if (!reference) {
      console.error('[Webhook:Zamtel] Missing reference in callback');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Find the booking by reference
    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        journey: {
          select: {
            route: { select: { fromCity: true, toCity: true } },
            departureTime: true,
          },
        },
      },
    });

    if (!booking) {
      console.warn(`[Webhook:Zamtel] Booking not found for reference: ${reference}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const isSuccess =
      status === 'SUCCESS' || status === 'COMPLETED' || status === 'APPROVED' || status === '0'; // Some Zamtel integrations use '0' for success

    const isFailed =
      status === 'FAILED' ||
      status === 'REJECTED' ||
      status === 'CANCELLED' ||
      status === 'TIMEOUT' ||
      status === 'EXPIRED';

    if (isSuccess) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          paymentTransactionId: transactionId,
          paidAt: new Date(),
        },
      });

      const routeName = booking.journey
        ? `${booking.journey.route.fromCity} -> ${booking.journey.route.toCity}`
        : 'your journey';

      const departureTime = booking.journey?.departureTime
        ? new Date(booking.journey.departureTime).toLocaleString('en-ZM', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '';

      await addSMSJob(
        booking.passengerPhone,
        `[Twende] Payment confirmed! Booking ${booking.reference} for ${routeName}${departureTime ? ` departing ${departureTime}` : ''} is confirmed. Fare: K${booking.price.toFixed(2)}. Show this reference when boarding.`
      );

      console.log(`[Webhook:Zamtel] Payment SUCCESS for booking ${booking.reference}`);
    } else if (isFailed) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'FAILED',
          paymentTransactionId: transactionId,
        },
      });

      await prisma.journey.update({
        where: { id: booking.journeyId },
        data: { availableSeats: { increment: 1 } },
      });

      await addSMSJob(
        booking.passengerPhone,
        `[Twende] Payment failed for booking ${booking.reference}. Your seat has been released. Please try again.`
      );

      console.log(`[Webhook:Zamtel] Payment FAILED for booking ${booking.reference}`);
    } else {
      console.log(`[Webhook:Zamtel] Unhandled status ${status} for booking ${booking.reference}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook:Zamtel] Processing error:', error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
