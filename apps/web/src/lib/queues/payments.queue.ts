import { Queue, Worker, type Job } from 'bullmq';
import { redis } from '../redis';
import { prisma } from '../prisma';
import { initiatePayment, type PaymentProvider } from '../payments';
import { addSMSJob } from './sms.queue';

const QUEUE_NAME = 'payments';

export const paymentsQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export interface PaymentJobData {
  bookingId: string;
  method: PaymentProvider;
  phone: string;
  amount: number;
  reference: string;
}

export async function addPaymentJob(data: PaymentJobData): Promise<string> {
  const job = await paymentsQueue.add('process-payment', data);
  console.log(`[PaymentsQueue] Job added: ${job.id} ref=${data.reference} method=${data.method}`);
  return job.id ?? '';
}

export const paymentsWorker = new Worker<PaymentJobData>(
  QUEUE_NAME,
  async (job: Job<PaymentJobData>) => {
    const { bookingId, method, phone, amount, reference } = job.data;

    console.log(`[PaymentsWorker] Processing job ${job.id}: ref=${reference}, method=${method}`);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'PROCESSING' },
    });

    const result = await initiatePayment(method, phone, amount, reference);

    if (!result.success) {
      console.error(`[PaymentsWorker] Payment initiation failed for ${reference}: ${result.error}`);

      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'FAILED' },
      });

      // Notify user of failure
      await addSMSJob(
        phone,
        `[ZedPulse] Payment for booking ${reference} failed. Please try again or use a different payment method.`
      );

      throw new Error(`Payment initiation failed: ${result.error}`);
    }

    console.log(
      `[PaymentsWorker] Payment initiated: ref=${reference}, txId=${result.transactionId}`
    );

    // Send confirmation SMS that payment prompt was sent
    await addSMSJob(
      phone,
      `[ZedPulse] Payment request sent to your ${method.replace(/_/g, ' ')} account. Please approve the payment of K${amount.toFixed(2)} for booking ${reference}.`
    );

    return {
      transactionId: result.transactionId,
      referenceId: result.referenceId,
      status: result.status,
    };
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

paymentsWorker.on('completed', (job: Job<PaymentJobData>) => {
  console.log(`[PaymentsWorker] Job ${job.id} completed.`);
});

paymentsWorker.on('failed', (job: Job<PaymentJobData> | undefined, err: Error) => {
  console.error(
    `[PaymentsWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
    err.message
  );
});
