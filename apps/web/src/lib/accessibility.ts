// ─── Font Size Constants ──────────────────────────────────────────────────────

export const FONT_SIZES = {
  small: '14px',
  medium: '16px',
  large: '20px',
  extraLarge: '24px',
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

// ─── High Contrast Theme (WCAG AA compliant) ─────────────────────────────────

export const HIGH_CONTRAST_THEME = {
  background: '#000000',
  foreground: '#FFFFFF',
  primary: '#00FF41',
  primaryHover: '#33FF66',
  secondary: '#FFD700',
  danger: '#FF4444',
  dangerHover: '#FF6666',
  success: '#00FF41',
  warning: '#FFD700',
  muted: '#CCCCCC',
  mutedBackground: '#1A1A1A',
  border: '#FFFFFF',
  link: '#66CCFF',
  linkHover: '#99DDFF',
  inputBackground: '#1A1A1A',
  inputBorder: '#FFFFFF',
  inputText: '#FFFFFF',
  buttonBackground: '#FFFFFF',
  buttonText: '#000000',
  cardBackground: '#111111',
  cardBorder: '#FFFFFF',
} as const;

// ─── Accessibility Settings Interface ─────────────────────────────────────────

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSizePercent: number; // 100 to 200
  reduceMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  fontSizePercent: 100,
  reduceMotion: false,
};

const STORAGE_KEY = 'twende-accessibility-settings';

// ─── Settings Persistence ─────────────────────────────────────────────────────

export function getAccessibilitySettings(): AccessibilitySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }

    const parsed = JSON.parse(stored) as Partial<AccessibilitySettings>;

    return {
      highContrast: typeof parsed.highContrast === 'boolean' ? parsed.highContrast : false,
      fontSizePercent:
        typeof parsed.fontSizePercent === 'number' &&
        parsed.fontSizePercent >= 100 &&
        parsed.fontSizePercent <= 200
          ? parsed.fontSizePercent
          : 100,
      reduceMotion: typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : false,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    console.error('[Accessibility] Failed to save settings');
  }
}

// ─── Apply Settings to DOM ────────────────────────────────────────────────────

export function applyAccessibilitySettings(settings: AccessibilitySettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Font size scaling
  root.style.fontSize = `${settings.fontSizePercent}%`;

  // High contrast mode
  if (settings.highContrast) {
    root.classList.add('high-contrast');
    root.setAttribute('data-high-contrast', 'true');
  } else {
    root.classList.remove('high-contrast');
    root.removeAttribute('data-high-contrast');
  }

  // Reduce motion
  if (settings.reduceMotion) {
    root.classList.add('reduce-motion');
    root.setAttribute('data-reduce-motion', 'true');
  } else {
    root.classList.remove('reduce-motion');
    root.removeAttribute('data-reduce-motion');
  }
}
