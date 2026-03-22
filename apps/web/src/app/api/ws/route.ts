import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { subscribeToJourney, registerClient, unregisterClient } from '@/lib/websocket';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET ?? 'twende-dev-secret';

/**
 * SSE endpoint for real-time position updates.
 * Since Next.js does not natively support WebSocket upgrades,
 * this endpoint uses Server-Sent Events as the transport layer.
 *
 * GET /api/ws?journeyId=<id>&token=<jwt>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const journeyId = searchParams.get('journeyId');
  const token = searchParams.get('token');

  if (!journeyId || !token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'journeyId and token are required.' },
        timestamp: new Date().toISOString(),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify JWT token
  let userId: string;
  try {
    const decoded = verifyToken(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or inactive user.' },
          timestamp: new Date().toISOString(),
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' },
        timestamp: new Date().toISOString(),
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify journey exists
  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    select: { id: true, status: true },
  });

  if (!journey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Journey not found.' },
        timestamp: new Date().toISOString(),
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Register client connection (enforce max 3 per user)
  const clientId = uuidv4();
  const registered = await registerClient(journeyId, userId, clientId);

  if (!registered) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'CONNECTION_LIMIT',
          message:
            'Maximum concurrent connections reached (3). Close an existing connection first.',
        },
        timestamp: new Date().toISOString(),
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  let unsubscribeFn: (() => Promise<void>) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId, journeyId })}\n\n`)
      );

      // Send the latest cached position if available
      const cachedPosition = await redis.get(`tracking:journey:${journeyId}`);
      if (cachedPosition) {
        controller.enqueue(encoder.encode(`event: position\ndata: ${cachedPosition}\n\n`));
      }

      // Subscribe to Redis pub/sub channels for this journey
      try {
        const { unsubscribe } = await subscribeToJourney(journeyId, (message: string) => {
          if (closed) return;

          try {
            const parsed = JSON.parse(message);
            const eventType = parsed.type ?? 'message';
            controller.enqueue(
              encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(parsed.data)}\n\n`)
            );
          } catch {
            // If we can't parse, send as raw message
            controller.enqueue(encoder.encode(`event: message\ndata: ${message}\n\n`));
          }
        });

        unsubscribeFn = unsubscribe;
      } catch (err) {
        console.error('[SSE] Failed to subscribe to journey channel:', err);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: 'Subscription failed' })}\n\n`
          )
        );
        controller.close();
      }

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (closed) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30_000);

      // Handle client disconnect via AbortSignal
      request.signal.addEventListener('abort', async () => {
        closed = true;
        clearInterval(heartbeatInterval);

        if (unsubscribeFn) {
          await unsubscribeFn();
        }

        await unregisterClient(journeyId, userId, clientId);

        try {
          controller.close();
        } catch {
          // Stream may already be closed
        }

        console.log(`[SSE] Client ${clientId} disconnected from journey ${journeyId}`);
      });
    },

    async cancel() {
      closed = true;

      if (unsubscribeFn) {
        await unsubscribeFn();
      }

      await unregisterClient(journeyId, userId, clientId);

      console.log(`[SSE] Stream cancelled for client ${clientId}, journey ${journeyId}`);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
