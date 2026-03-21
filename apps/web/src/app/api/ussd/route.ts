import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, type USSDSession } from '@/lib/ussd/session';
import { handle as handleBooking } from '@/lib/ussd/booking-menu';
import { handle as handleTracking } from '@/lib/ussd/tracking-menu';
import { handle as handleSOS } from '@/lib/ussd/sos-menu';

export async function POST(request: NextRequest) {
  try {
    // Africa's Talking sends USSD data as form-urlencoded
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const serviceCode = formData.get('serviceCode') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const text = (formData.get('text') as string) ?? '';

    if (!sessionId || !phoneNumber) {
      return new NextResponse('END Invalid request.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Parse the input chain: Africa's Talking sends cumulative text like "1*2*3"
    const inputs = text === '' ? [] : text.split('*');

    // Get or create session
    let session = await getSession(sessionId);

    if (!session) {
      session = {
        sessionId,
        phoneNumber,
        currentMenu: 'main',
        step: 0,
        data: {},
        createdAt: new Date().toISOString(),
      };
      await setSession(sessionId, session);
    }

    let response: string;

    // Main menu (no inputs yet or first input)
    if (session.currentMenu === 'main' && inputs.length === 0) {
      response = `CON Welcome to ZedPulse\nSafe Bus Travel in Zambia\n\n1. Book a Ticket\n2. Track My Bus\n3. SOS Emergency`;
    } else if (session.currentMenu === 'main' && inputs.length === 1) {
      const choice = parseInt(inputs[0], 10);

      if (choice === 1) {
        // Booking flow
        session.currentMenu = 'booking';
        session.step = 0;
        await setSession(sessionId, session);
        response = await handleBooking(inputs, session, sessionId);
      } else if (choice === 2) {
        // Tracking flow
        session.currentMenu = 'tracking';
        session.step = 0;
        await setSession(sessionId, session);
        response = await handleTracking(inputs, session, sessionId);
      } else if (choice === 3) {
        // SOS - immediate action
        response = await handleSOS(phoneNumber, sessionId);
      } else {
        response = 'END Invalid option. Please dial again and select 1, 2, or 3.';
      }
    } else if (session.currentMenu === 'booking') {
      response = await handleBooking(inputs, session, sessionId);
    } else if (session.currentMenu === 'tracking') {
      response = await handleTracking(inputs, session, sessionId);
    } else {
      response = 'END An error occurred. Please try again.';
    }

    // Africa's Talking expects text/plain with CON (continue) or END (terminate)
    return new NextResponse(response, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('[USSD] Handler error:', error);
    return new NextResponse('END An error occurred. Please try again later.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
