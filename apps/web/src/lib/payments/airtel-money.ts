import axios, { type AxiosInstance } from 'axios';
import { prisma } from '../prisma';

const AIRTEL_BASE_URL = process.env.AIRTEL_BASE_URL ?? 'https://openapi.airtel.africa';
const AIRTEL_CLIENT_ID = process.env.AIRTEL_CLIENT_ID ?? '';
const AIRTEL_CLIENT_SECRET = process.env.AIRTEL_CLIENT_SECRET ?? '';
const AIRTEL_COUNTRY = 'ZM';
const AIRTEL_CURRENCY = 'ZMW';

let cachedToken: { token: string; expiresAt: number } | null = null;

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: AIRTEL_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-Country': AIRTEL_COUNTRY,
      'X-Currency': AIRTEL_CURRENCY,
    },
    timeout: 30000,
  });
}

const client = createClient();

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const response = await client.post('/auth/oauth2/token', {
      client_id: AIRTEL_CLIENT_ID,
      client_secret: AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    });

    const { access_token, expires_in } = response.data;

    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000,
    };

    return access_token;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Token request failed';
    console.error('[AirtelMoney] Failed to get access token:', msg);
    throw new Error(`Airtel Money auth failed: ${msg}`);
  }
}

export interface AirtelPaymentRequest {
  phone: string;
  amount: number;
  reference: string;
  callbackUrl: string;
}

export interface AirtelPaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  error?: string;
}

export async function initiatePayment(
  phone: string,
  amount: number,
  reference: string,
  callbackUrl: string
): Promise<AirtelPaymentResponse> {
  try {
    const token = await getAccessToken();

    // Strip country code prefix if present
    const subscriberPhone = phone.replace(/^\+?260/, '');

    const response = await client.post(
      '/merchant/v1/payments/',
      {
        reference,
        subscriber: {
          country: AIRTEL_COUNTRY,
          currency: AIRTEL_CURRENCY,
          msisdn: subscriberPhone,
        },
        transaction: {
          amount,
          country: AIRTEL_COUNTRY,
          currency: AIRTEL_CURRENCY,
          id: reference,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Callback-Url': callbackUrl,
        },
      }
    );

    const { data } = response.data;

    console.log(`[AirtelMoney] Payment initiated: ${reference} -> ${phone}`);

    return {
      success: true,
      transactionId: data?.transaction?.id ?? reference,
      status: data?.transaction?.status ?? 'PENDING',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Payment initiation failed';
    console.error(`[AirtelMoney] Payment failed for ${reference}:`, msg);
    return {
      success: false,
      transactionId: '',
      status: 'FAILED',
      error: msg,
    };
  }
}

export interface AirtelPaymentStatus {
  status: string;
  transactionId: string;
  success: boolean;
}

export async function checkPaymentStatus(transactionId: string): Promise<AirtelPaymentStatus> {
  try {
    const token = await getAccessToken();

    const response = await client.get(`/standard/v1/payments/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data } = response.data;
    const status = data?.transaction?.status ?? 'UNKNOWN';

    return {
      status,
      transactionId,
      success: status === 'TS',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    console.error(`[AirtelMoney] Status check failed for ${transactionId}:`, msg);
    return {
      status: 'ERROR',
      transactionId,
      success: false,
    };
  }
}

export interface AirtelWebhookPayload {
  transaction: {
    id: string;
    status_code: string;
    message: string;
    airtel_money_id?: string;
  };
}

export async function handleWebhook(body: AirtelWebhookPayload): Promise<void> {
  const { transaction } = body;
  const txId = transaction.id;
  const statusCode = transaction.status_code;

  console.log(`[AirtelMoney] Webhook received: txId=${txId}, status=${statusCode}`);

  const isSuccess = statusCode === 'TS';

  const booking = await prisma.booking.findFirst({
    where: { reference: txId },
  });

  if (!booking) {
    console.warn(`[AirtelMoney] No booking found for reference: ${txId}`);
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
    `[AirtelMoney] Booking ${booking.reference} updated: payment=${isSuccess ? 'PAID' : 'FAILED'}`
  );
}
