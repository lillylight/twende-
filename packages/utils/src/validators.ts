// Zambian phone number validation
export const isValidZambianPhone = (phone: string): boolean => {
  const zambianPhoneRegex = /^(09[567]|07[567])\d{7}$/;
  return zambianPhoneRegex.test(phone);
};

// Detect mobile network operator from phone number
export const detectOperator = (phone: string): 'airtel' | 'mtn' | 'zamtel' | null => {
  if (/^(097|077)/.test(phone)) return 'airtel';
  if (/^(096|076)/.test(phone)) return 'mtn';
  if (/^(095|075)/.test(phone)) return 'zamtel';
  return null;
};
