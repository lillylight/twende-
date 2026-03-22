import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSMSJob } from '@/lib/queues/sms.queue';
import crypto from 'crypto';

function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const secret = process.env.MTN_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook:MTN] MTN_WEBHOOK_SECRET not configured');
    return false;
  }
  const signature =
    request.headers.get('x-mtn-signature') ?? request.headers.get('x-callback-signature') ?? '';
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
        console.error('[Webhook:MTN] Invalid webhook signature');
        return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);

    // MTN MoMo callback payload structure
    const referenceId = body.referenceId ?? body.externalId ?? body.financialTransactionId;
    const status = body.status ?? body.reason;
    const externalId = body.externalId ?? body.reference;
    const amount = body.amount;
    const phone = body.payer?.partyId ?? body.msisdn;

    console.log(
      `[Webhook:MTNMoMo] Received callback: ref=${externalId}, referenceId=${referenceId}, status=${status}`
    );

    if (!externalId && !referenceId) {
      console.error('[Webhook:MTNMoMo] Missing reference in callback');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Find the booking by reference
    const booking = externalId
      ? await prisma.booking.findUnique({
          where: { reference: externalId },
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
      console.warn(`[Webhook:MTNMoMo] Booking not found for reference: ${externalId}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const isSuccess = status === 'SUCCESSFUL' || status === 'COMPLETED';
    const isFailed =
      status === 'FAILED' || status === 'REJECTED' || status === 'TIMEOUT' || status === 'EXPIRED';

    if (isSuccess) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          paymentTransactionId: referenceId,
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

      console.log(`[Webhook:MTNMoMo] Payment SUCCESS for booking ${booking.reference}`);
    } else if (isFailed) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'FAILED',
          paymentTransactionId: referenceId,
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

      console.log(`[Webhook:MTNMoMo] Payment FAILED for booking ${booking.reference}`);
    } else {
      console.log(`[Webhook:MTNMoMo] Unhandled status ${status} for booking ${booking.reference}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook:MTNMoMo] Processing error:', error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
