import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSMSJob } from '@/lib/queues/sms.queue';
import crypto from 'crypto';

function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const secret = process.env.AIRTEL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook:AirtelMoney] AIRTEL_WEBHOOK_SECRET not configured');
    return false;
  }
  const signature =
    request.headers.get('x-airtel-signature') ?? request.headers.get('x-callback-signature') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(request, rawBody)) {
        console.error('[Webhook:AirtelMoney] Invalid webhook signature');
        return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);

    // Airtel Money callback payload structure
    const { transaction } = body;

    const transactionId = transaction?.id ?? body.transactionId ?? body.transaction_id;
    const status = transaction?.status ?? body.status;
    const reference = transaction?.reference ?? body.reference ?? body.externalId;
    const amount = transaction?.amount ?? body.amount;
    const phone = transaction?.phone ?? body.msisdn ?? body.phoneNumber;

    console.log(
      `[Webhook:AirtelMoney] Received callback: ref=${reference}, status=${status}, txId=${transactionId}`
    );

    if (!reference && !transactionId) {
      console.error('[Webhook:AirtelMoney] Missing reference and transactionId in callback');
      return NextResponse.json({ success: true, message: 'Acknowledged' }, { status: 200 });
    }

    // Find the booking by reference
    const booking = reference
      ? await prisma.booking.findUnique({
          where: { reference },
          include: {
            journey: {
              select: {
                route: { select: { fromCity: true, toCity: true } },
                departureTime: true,
              },
            },
          },
        })
      : null;

    if (!booking) {
      console.warn(`[Webhook:AirtelMoney] Booking not found for reference: ${reference}`);
      return NextResponse.json({ success: true, message: 'Acknowledged' }, { status: 200 });
    }

    const isSuccess = status === 'SUCCESS' || status === 'TS' || status === 'TIP';
    const isFailed = status === 'FAILED' || status === 'TF' || status === 'TA';

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

      console.log(`[Webhook:AirtelMoney] Payment SUCCESS for booking ${booking.reference}`);
    } else if (isFailed) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'FAILED',
          paymentTransactionId: transactionId,
        },
      });

      // Restore the seat
      await prisma.journey.update({
        where: { id: booking.journeyId },
        data: { availableSeats: { increment: 1 } },
      });

      await addSMSJob(
        booking.passengerPhone,
        `[Twende] Payment failed for booking ${booking.reference}. Your seat has been released. Please try again.`
      );

      console.log(`[Webhook:AirtelMoney] Payment FAILED for booking ${booking.reference}`);
    } else {
      // Pending or other status - log and acknowledge
      console.log(
        `[Webhook:AirtelMoney] Unhandled status ${status} for booking ${booking.reference}`
      );
    }

    // Always return 200 to acknowledge the webhook
    return NextResponse.json({ success: true, message: 'Processed' }, { status: 200 });
  } catch (error) {
    console.error('[Webhook:AirtelMoney] Processing error:', error);
    // Still return 200 to prevent retries for parsing errors
    return NextResponse.json({ success: true, message: 'Acknowledged' }, { status: 200 });
  }
}
