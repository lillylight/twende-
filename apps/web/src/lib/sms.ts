import AfricasTalking from 'africastalking';

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY ?? '',
  username: process.env.AT_USERNAME ?? 'sandbox',
});

const sms = at.SMS;

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    const result = await sms.send({
      to: [to],
      message,
      from: process.env.AT_SENDER_ID,
    });

    const recipient = result.SMSMessageData.Recipients[0];

    if (recipient && recipient.statusCode === 101) {
      return {
        success: true,
        messageId: recipient.messageId,
      };
    }

    const errorMessage = recipient?.status ?? result.SMSMessageData.Message ?? 'Unknown error';

    console.error(`[SMS] Failed to send to ${to}: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown SMS error';
    console.error(`[SMS] Exception sending to ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

export interface BulkSMSResult {
  totalSent: number;
  totalFailed: number;
  results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
}

export async function sendBulkSMS(recipients: string[], message: string): Promise<BulkSMSResult> {
  const results: BulkSMSResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;

  const BATCH_SIZE = 100;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      const result = await sms.send({
        to: batch,
        message,
        from: process.env.AT_SENDER_ID,
      });

      for (const recipient of result.SMSMessageData.Recipients) {
        const success = recipient.statusCode === 101;
        results.push({
          phone: recipient.number,
          success,
          messageId: success ? recipient.messageId : undefined,
          error: success ? undefined : recipient.status,
        });

        if (success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Batch send failed';
      console.error(`[SMS] Bulk send batch error:`, errorMsg);

      for (const phone of batch) {
        results.push({ phone, success: false, error: errorMsg });
        totalFailed++;
      }
    }
  }

  console.log(
    `[SMS] Bulk send complete: ${totalSent} sent, ${totalFailed} failed out of ${recipients.length}`
  );

  return { totalSent, totalFailed, results };
}
