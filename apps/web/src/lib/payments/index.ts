import * as airtelMoney from './airtel-money';
import * as mtnMomo from './mtn-momo';
import * as zamtelKwacha from './zamtel-kwacha';

export type PaymentProvider = 'AIRTEL_MONEY' | 'MTN_MOMO' | 'ZAMTEL_KWACHA';

export interface PaymentInitiationResult {
  success: boolean;
  transactionId: string;
  referenceId?: string;
  status: string;
  provider: PaymentProvider;
  error?: string;
}

const CALLBACK_BASE_URL = process.env.PAYMENT_CALLBACK_BASE_URL ?? 'https://api.twende.co.zm';

function getCallbackUrl(provider: PaymentProvider): string {
  const path = provider.toLowerCase().replace(/_/g, '-');
  return `${CALLBACK_BASE_URL}/api/webhooks/${path}`;
}

export async function initiatePayment(
  method: PaymentProvider,
  phone: string,
  amount: number,
  reference: string
): Promise<PaymentInitiationResult> {
  const callbackUrl = getCallbackUrl(method);

  switch (method) {
    case 'AIRTEL_MONEY': {
      const result = await airtelMoney.initiatePayment(phone, amount, reference, callbackUrl);
      return {
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
        provider: 'AIRTEL_MONEY',
        error: result.error,
      };
    }

    case 'MTN_MOMO': {
      const result = await mtnMomo.requestToPay(phone, amount, reference, callbackUrl);
      return {
        success: result.success,
        transactionId: reference,
        referenceId: result.referenceId,
        status: result.status,
        provider: 'MTN_MOMO',
        error: result.error,
      };
    }

    case 'ZAMTEL_KWACHA': {
      const result = await zamtelKwacha.initiatePayment(phone, amount, reference);
      return {
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
        provider: 'ZAMTEL_KWACHA',
        error: result.error,
      };
    }

    default: {
      const exhaustiveCheck: never = method;
      throw new Error(`Unsupported payment provider: ${exhaustiveCheck}`);
    }
  }
}

export async function checkPaymentStatus(
  method: PaymentProvider,
  transactionId: string
): Promise<{ success: boolean; status: string }> {
  switch (method) {
    case 'AIRTEL_MONEY': {
      const result = await airtelMoney.checkPaymentStatus(transactionId);
      return { success: result.success, status: result.status };
    }

    case 'MTN_MOMO': {
      const result = await mtnMomo.checkPaymentStatus(transactionId);
      return { success: result.success, status: result.status };
    }

    case 'ZAMTEL_KWACHA': {
      const result = await zamtelKwacha.checkStatus(transactionId);
      return { success: result.success, status: result.status };
    }

    default: {
      const exhaustiveCheck: never = method;
      throw new Error(`Unsupported payment provider: ${exhaustiveCheck}`);
    }
  }
}

export { airtelMoney, mtnMomo, zamtelKwacha };
