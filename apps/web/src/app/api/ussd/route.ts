import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, type USSDSession } from '@/lib/ussd/session';
import { handle as handleBooking } from '@/lib/ussd/booking-menu';
import { handle as handleTracking } from '@/lib/ussd/tracking-menu';
import { handle as handleSOS } from '@/lib/ussd/sos-menu';
import { t } from '@/lib/i18n';
import { detectLanguage } from '@/lib/i18n';

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
      const defaultLang = detectLanguage(phoneNumber);
      session = {
        sessionId,
        phoneNumber,
        currentMenu: 'main',
        step: 0,
        data: { language: defaultLang },
        createdAt: new Date().toISOString(),
      };
      await setSession(sessionId, session);
    }

    const lang = session.data.language ?? 'en';
    let response: string;

    // Main menu (no inputs yet or first input)
    if (session.currentMenu === 'main' && inputs.length === 0) {
      response = `CON ${t('welcome', lang)}`;
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
        response = await handleSOS(phoneNumber, sessionId, lang);
      } else if (choice === 4) {
        // My Bookings - placeholder
        session.currentMenu = 'my_bookings';
        session.step = 0;
        await setSession(sessionId, session);
        response = `END ${t('my_bookings', lang, { bookingList: 'No recent bookings.' })}`;
      } else if (choice === 5) {
        // Report Driver - placeholder
        session.currentMenu = 'report';
        session.step = 0;
        await setSession(sessionId, session);
        response = `END ${t('report_driver', lang)}`;
      } else if (choice === 6) {
        // Language selection
        session.currentMenu = 'language';
        session.step = 0;
        await setSession(sessionId, session);
        response = `CON ${t('select_language', lang)}`;
      } else {
        response = `END ${t('invalid_option', lang)}`;
      }
    } else if (session.currentMenu === 'language') {
      // Handle language selection
      const input = parseInt(inputs[inputs.length - 1], 10);
      const langMap: Record<number, string> = { 1: 'en', 2: 'bem', 3: 'nya' };
      const selectedLang = langMap[input];

      if (selectedLang) {
        session.data.language = selectedLang;
        session.currentMenu = 'main';
        session.step = 0;
        await setSession(sessionId, session);
        response = `CON ${t('language_set', selectedLang)}\n\n${t('welcome', selectedLang)}`;
      } else {
        response = `END ${t('invalid_input', lang)}`;
      }
    } else if (session.currentMenu === 'booking') {
      response = await handleBooking(inputs, session, sessionId);
    } else if (session.currentMenu === 'tracking') {
      response = await handleTracking(inputs, session, sessionId);
    } else {
      response = `END ${t('error_occurred', lang)}`;
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
