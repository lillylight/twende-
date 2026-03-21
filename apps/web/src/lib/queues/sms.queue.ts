import { Queue, Worker, type Job } from 'bullmq';
import { redis } from '../redis';
import { sendSMS } from '../sms';

const QUEUE_NAME = 'sms';

export const smsQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export interface SMSJobData {
  to: string;
  message: string;
}

export async function addSMSJob(to: string, message: string): Promise<string> {
  const job = await smsQueue.add('send-sms', { to, message } satisfies SMSJobData);
  console.log(`[SMSQueue] Job added: ${job.id} -> ${to}`);
  return job.id ?? '';
}

export const smsWorker = new Worker<SMSJobData>(
  QUEUE_NAME,
  async (job: Job<SMSJobData>) => {
    const { to, message } = job.data;

    console.log(`[SMSWorker] Processing job ${job.id}: sending to ${to}`);

    const result = await sendSMS(to, message);

    if (!result.success) {
      throw new Error(`SMS send failed: ${result.error}`);
    }

    console.log(`[SMSWorker] Job ${job.id} completed: messageId=${result.messageId}`);

    return { messageId: result.messageId };
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 1000,
    },
  }
);

smsWorker.on('completed', (job: Job<SMSJobData>) => {
  console.log(`[SMSWorker] Job ${job.id} completed successfully.`);
});

smsWorker.on('failed', (job: Job<SMSJobData> | undefined, err: Error) => {
  console.error(`[SMSWorker] Job ${job?.id} failed:`, err.message);
});
