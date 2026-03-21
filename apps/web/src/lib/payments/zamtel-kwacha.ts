import axios, { type AxiosInstance } from 'axios';
import { prisma } from '../prisma';

const ZAMTEL_BASE_URL = process.env.ZAMTEL_BASE_URL ?? 'https://api.zamtel.co.zm';
const ZAMTEL_API_KEY = process.env.ZAMTEL_API_KEY ?? '';
const ZAMTEL_MERCHANT_ID = process.env.ZAMTEL_MERCHANT_ID ?? '';
const ZAMTEL_CURRENCY = 'ZMW';

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: ZAMTEL_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ZAMTEL_API_KEY,
      'X-Merchant-Id': ZAMTEL_MERCHANT_ID,
    },
    timeout: 30000,
  });
}

const client = createClient();

export interface ZamtelPaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  error?: string;
}

export async function initiatePayment(
  phone: string,
  amount: number,
  reference: string
): Promise<ZamtelPaymentResponse> {
  try {
    const subscriberPhone = phone.replace(/^\+?260/, '');

    const response = await client.post('/payments/initiate', {
      msisdn: subscriberPhone,
      amount: amount.toFixed(2),
      currency: ZAMTEL_CURRENCY,
      reference,
      merchantId: ZAMTEL_MERCHANT_ID,
      narration: `ZedPulse bus ticket: ${reference}`,
    });

    const { data } = response;
    const transactionId = data?.transactionId ?? data?.data?.transactionId ?? reference;

    console.log(`[ZamtelKwacha] Payment initiated: ref=${reference}, txId=${transactionId}`);

    return {
      success: true,
      transactionId,
      status: 'PENDING',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Payment initiation failed';
    console.error(`[ZamtelKwacha] Payment failed for ${reference}:`, msg);
    return {
      success: false,
      transactionId: '',
      status: 'FAILED',
      error: msg,
    };
  }
}

export interface ZamtelPaymentStatus {
  status: string;
  transactionId: string;
  success: boolean;
}

export async function checkStatus(transactionId: string): Promise<ZamtelPaymentStatus> {
  try {
    const response = await client.get(`/payments/status/${transactionId}`);

    const status = response.data?.status ?? response.data?.data?.status ?? 'UNKNOWN';

    return {
      status,
      transactionId,
      success: status === 'COMPLETED' || status === 'SUCCESS',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    console.error(`[ZamtelKwacha] Status check failed for ${transactionId}:`, msg);
    return {
      status: 'ERROR',
      transactionId,
      success: false,
    };
  }
}

export interface ZamtelWebhookPayload {
  transactionId: string;
  reference: string;
  status: string;
  amount?: number;
}

export async function handleWebhook(body: ZamtelWebhookPayload): Promise<void> {
  const { reference, status, transactionId } = body;

  console.log(
    `[ZamtelKwacha] Webhook received: txId=${transactionId}, ref=${reference}, status=${status}`
  );

  const isSuccess = status === 'COMPLETED' || status === 'SUCCESS';

  const booking = await prisma.booking.findFirst({
    where: { reference },
  });

  if (!booking) {
    console.warn(`[ZamtelKwacha] No booking found for reference: ${reference}`);
    return;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: isSuccess ? 'PAID' : 'FAILED',
      status: isSuccess ? 'CONFIRMED' : booking.status,
    },
  });

  if (isSuccess) {
    await prisma.journey.update({
      where: { id: booking.journeyId },
      data: {
        availableSeats: { decrement: 1 },
      },
    });
  }

  console.log(
    `[ZamtelKwacha] Booking ${booking.reference} updated: payment=${isSuccess ? 'PAID' : 'FAILED'}`
  );
}
