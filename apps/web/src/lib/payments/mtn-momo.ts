import axios, { type AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';

const MTN_BASE_URL = process.env.MTN_MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com';
const MTN_COLLECTION_PRIMARY_KEY = process.env.MTN_COLLECTION_PRIMARY_KEY ?? '';
const MTN_COLLECTION_SECRET = process.env.MTN_COLLECTION_SECRET ?? '';
const MTN_API_USER = process.env.MTN_API_USER ?? '';
const MTN_CALLBACK_HOST = process.env.MTN_CALLBACK_HOST ?? '';
const MTN_ENVIRONMENT = process.env.MTN_ENVIRONMENT ?? 'sandbox';
const MTN_CURRENCY = 'ZMW';

let cachedToken: { token: string; expiresAt: number } | null = null;

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: MTN_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
}

const client = createClient();

export async function createApiUser(): Promise<{
  apiUser: string;
  apiKey: string;
}> {
  const referenceId = uuidv4();

  try {
    await client.post(
      '/v1_0/apiuser',
      { providerCallbackHost: MTN_CALLBACK_HOST },
      {
        headers: {
          'X-Reference-Id': referenceId,
          'Ocp-Apim-Subscription-Key': MTN_COLLECTION_PRIMARY_KEY,
        },
      }
    );

    const keyResponse = await client.post(
      `/v1_0/apiuser/${referenceId}/apikey`,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': MTN_COLLECTION_PRIMARY_KEY,
        },
      }
    );

    console.log('[MTN MoMo] API user created:', referenceId);

    return {
      apiUser: referenceId,
      apiKey: keyResponse.data.apiKey,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API user creation failed';
    console.error('[MTN MoMo] Failed to create API user:', msg);
    throw new Error(`MTN MoMo API user creation failed: ${msg}`);
  }
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const credentials = Buffer.from(`${MTN_API_USER}:${MTN_COLLECTION_SECRET}`).toString('base64');

    const response = await client.post(
      '/collection/token/',
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': MTN_COLLECTION_PRIMARY_KEY,
        },
      }
    );

    const { access_token, expires_in } = response.data;

    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000,
    };

    return access_token;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Token request failed';
    console.error('[MTN MoMo] Failed to get access token:', msg);
    throw new Error(`MTN MoMo auth failed: ${msg}`);
  }
}

export interface MoMoPaymentResponse {
  success: boolean;
  referenceId: string;
  status: string;
  error?: string;
}

export async function requestToPay(
  phone: string,
  amount: number,
  reference: string,
  callbackUrl: string
): Promise<MoMoPaymentResponse> {
  try {
    const token = await getAccessToken();
    const referenceId = uuidv4();

    const subscriberPhone = phone.replace(/^\+/, '');

    await client.post(
      '/collection/v1_0/requesttopay',
      {
        amount: amount.toString(),
        currency: MTN_CURRENCY,
        externalId: reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: subscriberPhone,
        },
        payerMessage: `Twende booking: ${reference}`,
        payeeNote: `Bus ticket payment ${reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': callbackUrl,
          'X-Target-Environment': MTN_ENVIRONMENT,
          'Ocp-Apim-Subscription-Key': MTN_COLLECTION_PRIMARY_KEY,
        },
      }
    );

    console.log(`[MTN MoMo] Payment requested: ref=${referenceId}, booking=${reference}`);

    return {
      success: true,
      referenceId,
      status: 'PENDING',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Payment request failed';
    console.error(`[MTN MoMo] Payment failed for ${reference}:`, msg);
    return {
      success: false,
      referenceId: '',
      status: 'FAILED',
      error: msg,
    };
  }
}

export interface MoMoPaymentStatus {
  status: string;
  referenceId: string;
  success: boolean;
  reason?: string;
}

export async function checkPaymentStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  try {
    const token = await getAccessToken();

    const response = await client.get(`/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': MTN_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': MTN_COLLECTION_PRIMARY_KEY,
      },
    });

    const { status, reason } = response.data;

    return {
      status,
      referenceId,
      success: status === 'SUCCESSFUL',
      reason,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    console.error(`[MTN MoMo] Status check failed for ${referenceId}:`, msg);
    return {
      status: 'ERROR',
      referenceId,
      success: false,
      reason: msg,
    };
  }
}

export interface MoMoWebhookPayload {
  referenceId: string;
  externalId: string;
  status: string;
  reason?: string;
}

export async function handleWebhook(body: MoMoWebhookPayload): Promise<void> {
  const { externalId, status, referenceId } = body;

  console.log(
    `[MTN MoMo] Webhook received: ref=${referenceId}, externalId=${externalId}, status=${status}`
  );

  const isSuccess = status === 'SUCCESSFUL';

  const booking = await prisma.booking.findFirst({
    where: { reference: externalId },
  });

  if (!booking) {
    console.warn(`[MTN MoMo] No booking found for reference: ${externalId}`);
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
    `[MTN MoMo] Booking ${booking.reference} updated: payment=${isSuccess ? 'PAID' : 'FAILED'}`
  );
}
