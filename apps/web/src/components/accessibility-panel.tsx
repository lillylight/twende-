'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAccessibilitySettings,
  saveAccessibilitySettings,
  applyAccessibilitySettings,
  type AccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from '@/lib/accessibility';

export default function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getAccessibilitySettings();
    setSettings(stored);
    applyAccessibilitySettings(stored);
  }, []);

  const updateSettings = useCallback((newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    saveAccessibilitySettings(newSettings);
    applyAccessibilitySettings(newSettings);
  }, []);

  const handleHighContrastToggle = () => {
    updateSettings({ ...settings, highContrast: !settings.highContrast });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    updateSettings({ ...settings, fontSizePercent: value });
  };

  const handleReduceMotionToggle = () => {
    updateSettings({ ...settings, reduceMotion: !settings.reduceMotion });
  };

  const handleReset = () => {
    updateSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Floating Accessibility Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label={isOpen ? 'Close accessibility settings' : 'Open accessibility settings'}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        title="Accessibility Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="M12 7v5" />
          <path d="m8 11 4 2 4-2" />
          <path d="m9 18-1 4" />
          <path d="m15 18 1 4" />
        </svg>
      </button>

      {/* Accessibility Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            id="accessibility-panel"
            role="dialog"
            aria-label="Accessibility Settings"
            aria-modal="true"
            className="fixed bottom-24 left-6 z-50 w-80 rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
            style={
              settings.highContrast
                ? {
                    backgroundColor: '#000',
                    color: '#fff',
                    border: '2px solid #fff',
                  }
                : undefined
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" id="a11y-panel-title">
                Accessibility
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 hover:bg-light-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Close accessibility settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* High Contrast Mode */}
              <div className="flex items-center justify-between">
                <label htmlFor="high-contrast-toggle" className="text-sm font-medium">
                  High Contrast Mode
                </label>
                <button
                  id="high-contrast-toggle"
                  role="switch"
                  aria-checked={settings.highContrast}
                  aria-label="Toggle high contrast mode"
                  onClick={handleHighContrastToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings.highContrast ? 'bg-primary-600' : 'bg-light-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      settings.highContrast ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* Font Size Slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="font-size-slider" className="text-sm font-medium">
                    Font Size
                  </label>
                  <span className="text-sm tabular-nums" aria-live="polite">
                    {settings.fontSizePercent}%
                  </span>
                </div>
                <input
                  id="font-size-slider"
                  type="range"
                  min="100"
                  max="200"
                  step="10"
                  value={settings.fontSizePercent}
                  onChange={handleFontSizeChange}
                  className="w-full accent-primary-600"
                  aria-label={`Font size: ${settings.fontSizePercent} percent`}
                  aria-valuemin={100}
                  aria-valuemax={200}
                  aria-valuenow={settings.fontSizePercent}
                  aria-valuetext={`${settings.fontSizePercent} percent`}
                />
                <div className="mt-1 flex justify-between text-xs text-dark-400">
                  <span>100%</span>
                  <span>150%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Reduce Motion */}
              <div className="flex items-center justify-between">
                <label htmlFor="reduce-motion-toggle" className="text-sm font-medium">
                  Reduce Motion
                </label>
                <button
                  id="reduce-motion-toggle"
                  role="switch"
                  aria-checked={settings.reduceMotion}
                  aria-label="Toggle reduce motion"
                  onClick={handleReduceMotionToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings.reduceMotion ? 'bg-primary-600' : 'bg-light-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      settings.reduceMotion ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full rounded-lg border border-light-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-light-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Reset accessibility settings to defaults"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
