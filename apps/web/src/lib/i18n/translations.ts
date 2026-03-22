/**
 * Multi-language translations for Twende Zambia platform.
 * Supports English (en), Bemba (bem), and Nyanja/Chewa (nya).
 */

export type SupportedLanguage = 'en' | 'bem' | 'nya';

export interface TranslationSet {
  [key: string]: string;
}

export interface Translations {
  en: TranslationSet;
  bem: TranslationSet;
  nya: TranslationSet;
}

const translations: Translations = {
  en: {
    // ─── SMS Templates ──────────────────────────────────────────────
    booking_confirmation:
      'Twende Booking Confirmed! Ref: {reference}. {route}, departing {departureTime}. Seat: {seat}. Fare: K{price}. Show this SMS when boarding.',
    journey_reminder:
      'Reminder: Your Twende bus {route} departs in {minutes} minutes from {terminal}. Ref: {reference}. Please arrive early.',
    safety_alert_speeding:
      '[Twende Safety] Bus on {route} is travelling at {speed}km/h, exceeding the {limit}km/h limit near {location}. Authorities notified.',
    safety_alert_deviation:
      '[Twende Safety] Bus on {route} has deviated from the approved route near {location}. Monitoring in progress.',
    journey_cancelled:
      'Your Twende journey {route} (Ref: {reference}) has been cancelled. A refund of K{price} will be processed within 24 hours.',
    refund_confirmation:
      'Twende Refund: K{amount} has been refunded to your {paymentMethod} account for booking {reference}. Allow up to 48 hours to reflect.',
    sos_triggered:
      '[Twende SOS] Emergency alert received from passenger {phone} on {route}. Bus: {bus}. Location: {location}. Immediate response required.',
    sos_resolved:
      '[Twende SOS] The emergency on {route} (Bus: {bus}) has been resolved. Thank you for your patience. You are safe.',
    tracking_link_shared: 'Track your Twende bus live: {url}. {route}, Ref: {reference}.',

    // ─── USSD Menus ─────────────────────────────────────────────────
    welcome:
      'Welcome to Twende\nSafe Bus Travel in Zambia\n\n1. Book a Ticket\n2. Track My Bus\n3. SOS Emergency\n4. My Bookings\n5. Report Driver\n6. Language/Iciluba',
    booking_departure: 'Select departure city:',
    booking_destination: 'From: {fromCity}\nSelect destination:',
    booking_operators: '{fromCity} -> {toCity}\nAvailable buses:',
    booking_payment:
      '{operatorName}\n{fromCity} -> {toCity}\nFare: K{price}\n\nSelect payment method:\n1. Airtel Money\n2. MTN MoMo\n3. Zamtel Kwacha',
    booking_confirmed:
      'Booking confirmed!\nRef: {reference}\n{fromCity} -> {toCity}\nFare: K{price}\n\nA payment prompt will be sent to your phone. Approve to complete booking.',
    tracking_enter_ref: 'Enter your booking reference (e.g. ZP-ABC123):',
    tracking_status:
      '{fromCity} -> {toCity}\nLocation: {location}\nSpeed: {speed}km/h\nETA: {eta}\n\n1. Share tracking link\n2. SOS Emergency\n3. Report reckless driving',
    sos_confirm:
      'SOS ALERT SENT!\n\nEmergency services, RTSA, and police have been notified.\n\nYour location: {location}\n\nStay calm. Help is on the way.\n\nIf in immediate danger, call 911.',
    sos_sent: 'SOS alert sent! Emergency services have been notified. Help is on the way.',
    my_bookings: 'My Bookings:\n{bookingList}\n\n0. Back to main menu',
    report_driver: 'Thank you for reporting. Your report has been sent to RTSA for investigation.',
    invalid_input: 'Invalid selection. Please try again.',
    no_buses: 'No buses available from {fromCity} to {toCity}. Please try later.',
    journey_unavailable: 'Sorry, this journey is no longer available.',
    invalid_payment: 'Invalid payment method. Please try again.',
    booking_not_found: 'Booking not found. Please check your reference and try again.',
    no_gps_scheduled: 'Bus has not departed yet.',
    no_gps_data: 'No GPS data available.',
    tracking_link_sent: 'Tracking link has been sent to your phone via SMS.',
    invalid_option: 'Invalid option. Please try again.',
    error_occurred: 'An error occurred. Please try again.',
    select_language: 'Select language:\n1. English\n2. Bemba (Icibemba)\n3. Nyanja (Chichewa)',
    language_set: 'Language set to English.',

    // SOS SMS texts
    sos_sms_passenger:
      '[Twende SOS] Your emergency alert has been received. Police, RTSA, and emergency services have been notified. Help is on the way. If you are in immediate danger, call 911 or 999.',
    sos_sms_emergency:
      '[Twende SOS ALERT]\nPassenger: {phone}\nLocation: {location}\n{gps}Route: {route}\nBus: {bus}\nOperator: {operator}\nTime: {time}\nImmediate response required.',
    sos_sms_operator:
      '[Twende SOS] Emergency on bus {bus}, route {route}. Location: {location}. Passenger: {phone}. Take immediate action.',

    // Tracking SMS
    tracking_sms_link: 'Track your Twende bus live: {url}',
    tracking_sms_sos:
      '[Twende SOS] Your emergency alert has been sent. Help is on the way. Stay calm and stay on the bus if safe to do so.',
    tracking_sms_sos_emergency:
      '[Twende SOS] Emergency on journey {journeyId}. Passenger: {phone}. Location: {location}. Immediate response required.',
    tracking_sms_reckless:
      '[Twende Report] Reckless driving reported by passenger on journey {journeyId}. Bus: {bus}. Please investigate.',
  },

  bem: {
    // ─── SMS Templates ──────────────────────────────────────────────
    booking_confirmation:
      'Twende Booking Yashimikishiwa! Ref: {reference}. {route}, ukufuma {departureTime}. Icipuna: {seat}. Imilipilo: K{price}. Langisha iyi SMS pa kubila.',
    journey_reminder:
      'Icikukanishisha: Ibasi yenu ya Twende {route} ilefuma mu miniti {minutes} ukufuma ku {terminal}. Ref: {reference}. Fiseni kukesa kale.',
    safety_alert_speeding:
      '[Twende Ubucetekelelo] Ibasi pa {route} ileenda pa {speed}km/h, yalicila {limit}km/h mupepi na {location}. Abakalamba batumishiwa.',
    safety_alert_deviation:
      '[Twende Ubucetekelelo] Ibasi pa {route} yafumye mu nshila iisuminishiwe mupepi na {location}. Tulekonka.',
    journey_cancelled:
      'Ulwendo lwenu lwa Twende {route} (Ref: {reference}) lwachibiwa. Imilipilo ya K{price} ikabweshwa mu maola 24.',
    refund_confirmation:
      'Twende Ukubwesha: K{amount} yabweshwa ku akaunti yenu ya {paymentMethod} pa booking {reference}. Lindileni maola 48.',
    sos_triggered:
      '[Twende SOS] Ubwafya bupokelwa ukufuma ku muendeshewe {phone} pa {route}. Ibasi: {bus}. Incende: {location}. Afwileni nomba.',
    sos_resolved:
      '[Twende SOS] Ubwafya pa {route} (Ibasi: {bus}) bwapwa. Natotela pa kulinda kwenu. Muli sefwe.',
    tracking_link_shared: 'Konkeleni ibasi yenu ya Twende: {url}. {route}, Ref: {reference}.',

    // ─── USSD Menus ─────────────────────────────────────────────────
    welcome:
      'Mwaiseni ku Twende\nUkwenda Kwabwino mu Zambia\n\n1. Gulani Itiketi\n2. Konkeleni Ibasi\n3. SOS Ubwafya\n4. Ama Booking Yandi\n5. Londolosheni Umuendeshewe\n6. Ululimi/Language',
    booking_departure: 'Saleni umushi waku fuminako:',
    booking_destination: 'Ukufuma: {fromCity}\nSaleni incende ya kuya:',
    booking_operators: '{fromCity} -> {toCity}\nAmabasi ayalipo:',
    booking_payment:
      '{operatorName}\n{fromCity} -> {toCity}\nImisonko: K{price}\n\nSaleni inshila ya malipilo:\n1. Airtel Money\n2. MTN MoMo\n3. Zamtel Kwacha',
    booking_confirmed:
      'Booking yashimikishiwa!\nRef: {reference}\n{fromCity} -> {toCity}\nImisonko: K{price}\n\nAma lipilo yakasuminishiwa ku foni yenu.',
    tracking_enter_ref: 'Ingisheni inombala ya booking yenu (e.g. ZP-ABC123):',
    tracking_status:
      '{fromCity} -> {toCity}\nIncende: {location}\nUbulubilo: {speed}km/h\nUkufika: {eta}\n\n1. Tumisheni ilinki ya kukonkela\n2. SOS Ubwafya\n3. Londolosheni ukwensha bubi',
    sos_confirm:
      'SOS YATUMISHIWA!\n\nAbakalamba, RTSA, na polisi batumishiwa.\n\nIncende yenu: {location}\n\nTekanyeni. Ubwafwilisho bulesenda.\n\nNga muli mubwafya, bilileni 911.',
    sos_sent: 'SOS yatumishiwa! Abakalamba ba kubwafwilisha batumishiwa. Ubwafwilisho bulesenda.',
    my_bookings: 'Ama Booking Yandi:\n{bookingList}\n\n0. Bweleleni ku menu',
    report_driver: 'Natotela pa kulondolola. Amashiwi yenu yatumishiwa ku RTSA.',
    invalid_input: 'Ukusala kutampa. Yesheni nakabili.',
    no_buses: 'Takwaba amabasi ukufuma ku {fromCity} ukuya ku {toCity}. Yesheni kunuma.',
    journey_unavailable: 'Pepani, ulwendo talulipo na kale.',
    invalid_payment: 'Inshila ya malipilo tayalipo. Yesheni nakabili.',
    booking_not_found: 'Booking tailasangwa. Lolesheni inombala yenu nakabili.',
    no_gps_scheduled: 'Ibasi tailafumyako.',
    no_gps_data: 'Takwaba inkombelo ya GPS.',
    tracking_link_sent: 'Ilinki ya kukonkela yatumishiwa ku foni yenu ku SMS.',
    invalid_option: 'Ukusala kutampa. Yesheni nakabili.',
    error_occurred: 'Kwacitika ubwafya. Yesheni nakabili.',
    select_language: 'Saleni ululimi:\n1. English\n2. Bemba (Icibemba)\n3. Nyanja (Chichewa)',
    language_set: 'Ululimi lwasalwa ku Icibemba.',

    sos_sms_passenger:
      '[Twende SOS] Ubwafya bwenu bwapokelwa. Polisi, RTSA, na abakalamba ba kubwafwilisha batumishiwa. Ubwafwilisho bulesenda. Nga muli mubwafya, bilileni 911 nangu 999.',
    sos_sms_emergency:
      '[Twende SOS UBWAFYA]\nUmuendeshewe: {phone}\nIncende: {location}\n{gps}Inshila: {route}\nIbasi: {bus}\nUmuendeshewe: {operator}\nInshita: {time}\nAfwileni nomba.',
    sos_sms_operator:
      '[Twende SOS] Ubwafya pa basi {bus}, inshila {route}. Incende: {location}. Umuendeshewe: {phone}. Citeni nomba.',

    tracking_sms_link: 'Konkeleni ibasi yenu ya Twende: {url}',
    tracking_sms_sos:
      '[Twende SOS] Ubwafya bwenu bwatumishiwa. Ubwafwilisho bulesenda. Tekanyeni na muikale mu basi.',
    tracking_sms_sos_emergency:
      '[Twende SOS] Ubwafya pa lwendo {journeyId}. Umuendeshewe: {phone}. Incende: {location}. Afwileni nomba.',
    tracking_sms_reckless:
      '[Twende Kulondolola] Ukwensha bubi kwalondelolwa pa lwendo {journeyId}. Ibasi: {bus}. Fulenifuneni.',
  },

  nya: {
    // ─── SMS Templates ──────────────────────────────────────────────
    booking_confirmation:
      'Twende Booking Yatsimikiziridwa! Ref: {reference}. {route}, kuchoka {departureTime}. Mpando: {seat}. Ndalama: K{price}. Onetsani SMS iyi potakira.',
    journey_reminder:
      'Kukumbukitsa: Basi yanu ya Twende {route} ikuchoka mu mphindi {minutes} kuchokera ku {terminal}. Ref: {reference}. Chonde fikaniko msanga.',
    safety_alert_speeding:
      '[Twende Chitetezo] Basi pa {route} ikuyenda pa {speed}km/h, kupyolera {limit}km/h pafupi ndi {location}. Akuluakulu adziwitsidwa.',
    safety_alert_deviation:
      "[Twende Chitetezo] Basi pa {route} yachotsedwa mu msewu wovomerezedwa pafupi ndi {location}. Tikuyang'anira.",
    journey_cancelled:
      "Ulendo wanu wa Twende {route} (Ref: {reference}) wachotsedwa. Ndalama za K{price} zibwezeredwa m'maola 24.",
    refund_confirmation:
      'Twende Kubwezeretsa: K{amount} zabwezeredwa ku akaunti yanu ya {paymentMethod} pa booking {reference}. Dikirani maola 48.',
    sos_triggered:
      '[Twende SOS] Chiwopsyezo chalandidwa kuchokera kwa wokwera {phone} pa {route}. Basi: {bus}. Malo: {location}. Thandizani tsopano.',
    sos_resolved:
      '[Twende SOS] Chiwopsyezo pa {route} (Basi: {bus}) chathetsedwa. Zikomo pa kudikira kwanu. Ndinu otetezeka.',
    tracking_link_shared: 'Tsatirani basi yanu ya Twende: {url}. {route}, Ref: {reference}.',

    // ─── USSD Menus ─────────────────────────────────────────────────
    welcome:
      'Takulandirani ku Twende\nUlendo Wotetezeka mu Zambia\n\n1. Gulani Tiketi\n2. Tsatirani Basi Yanga\n3. SOS Chiwopsyezo\n4. Ma Booking Anga\n5. Nenani za Dalaivala\n6. Chinenero/Language',
    booking_departure: 'Sankhani mzinda wochokera:',
    booking_destination: 'Kuchokera: {fromCity}\nSankhani malo opitako:',
    booking_operators: '{fromCity} -> {toCity}\nMabasi opezeka:',
    booking_payment:
      '{operatorName}\n{fromCity} -> {toCity}\nNdalama: K{price}\n\nSankhani njira yolipira:\n1. Airtel Money\n2. MTN MoMo\n3. Zamtel Kwacha',
    booking_confirmed:
      'Booking yatsimikiziridwa!\nRef: {reference}\n{fromCity} -> {toCity}\nNdalama: K{price}\n\nMudzalandidwa pa foni yanu kuti mulipire.',
    tracking_enter_ref: 'Lowetsani nambala ya booking yanu (e.g. ZP-ABC123):',
    tracking_status:
      '{fromCity} -> {toCity}\nMalo: {location}\nLiwiro: {speed}km/h\nKufika: {eta}\n\n1. Tumizani linki yotsatira\n2. SOS Chiwopsyezo\n3. Nenani za kuyendetsa moipa',
    sos_confirm:
      'SOS YATUMIZIDWA!\n\nAkuluakulu, RTSA, ndi apolisi adziwitsidwa.\n\nMalo anu: {location}\n\nKhazikani mtima. Thandizo likubwera.\n\nNgati muli pangozi, imbani 911.',
    sos_sent: 'SOS yatumizidwa! Akuluakulu athandizo adziwitsidwa. Thandizo likubwera.',
    my_bookings: 'Ma Booking Anga:\n{bookingList}\n\n0. Bwererani ku menyu',
    report_driver: 'Zikomo ponena. Uthenga wanu watumizidwa ku RTSA kuti afufuze.',
    invalid_input: 'Kusankha kolakwika. Chonde yesaninso.',
    no_buses:
      'Palibe mabasi kuchokera ku {fromCity} kupita ku {toCity}. Chonde yesaninso mtsogolo.',
    journey_unavailable: 'Pepani, ulendo uwu suliponso.',
    invalid_payment: 'Njira yolipira yolakwika. Chonde yesaninso.',
    booking_not_found: "Booking sinapezeke. Chonde yang'ananitsani nambala yanu.",
    no_gps_scheduled: 'Basi sinachoke.',
    no_gps_data: 'Palibe deta ya GPS.',
    tracking_link_sent: 'Linki yotsatira yatumizidwa ku foni yanu pa SMS.',
    invalid_option: 'Kusankha kolakwika. Chonde yesaninso.',
    error_occurred: 'Panachitika cholakwika. Chonde yesaninso.',
    select_language: 'Sankhani chinenero:\n1. English\n2. Bemba (Icibemba)\n3. Nyanja (Chichewa)',
    language_set: 'Chinenero chasankhidwa ku Chinyanja.',

    sos_sms_passenger:
      '[Twende SOS] Chiwopsyezo chanu chalandidwa. Apolisi, RTSA, ndi akuluakulu athandizo adziwitsidwa. Thandizo likubwera. Ngati muli pangozi, imbani 911 kapena 999.',
    sos_sms_emergency:
      '[Twende SOS CHIWOPSYEZO]\nWokwera: {phone}\nMalo: {location}\n{gps}Njira: {route}\nBasi: {bus}\nOpereta: {operator}\nNthawi: {time}\nThandizani tsopano.',
    sos_sms_operator:
      '[Twende SOS] Chiwopsyezo pa basi {bus}, njira {route}. Malo: {location}. Wokwera: {phone}. Chitani tsopano.',

    tracking_sms_link: 'Tsatirani basi yanu ya Twende: {url}',
    tracking_sms_sos:
      '[Twende SOS] Chiwopsyezo chanu chatumizidwa. Thandizo likubwera. Khalani bata ndipo khalani mu basi ngati ndikotetezekedwa.',
    tracking_sms_sos_emergency:
      '[Twende SOS] Chiwopsyezo pa ulendo {journeyId}. Wokwera: {phone}. Malo: {location}. Thandizani tsopano.',
    tracking_sms_reckless:
      '[Twende Kunena] Kuyendetsa moipa kuneniwa pa ulendo {journeyId}. Basi: {bus}. Chonde fufuzani.',
  },
};

/**
 * Translate a key with optional variable substitution.
 * Falls back to English if the key is not found in the requested language.
 */
export function t(key: string, lang: string, vars?: Record<string, string>): string {
  const language = (lang && lang in translations ? lang : 'en') as SupportedLanguage;
  let text = translations[language]?.[key] ?? translations.en[key] ?? key;

  if (vars) {
    for (const [varName, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
    }
  }

  return text;
}

/**
 * Get the human-readable name for a language code.
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    bem: 'Bemba (Icibemba)',
    nya: 'Nyanja (Chichewa)',
  };
  return names[code] ?? 'English';
}

export default translations;
