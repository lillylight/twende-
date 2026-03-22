/**
 * QR Code generation and decoding for booking references.
 *
 * Encodes booking data as a signed Base64 payload so that terminal scanners
 * can verify tickets offline.  The QR "image" is returned as an SVG data-URL
 * which can be rendered in <img> tags or converted server-side.
 */

import crypto from 'crypto';

const QR_SECRET =
  process.env.QR_SIGNING_SECRET ||
  (() => {
    throw new Error('Missing required env: QR_SIGNING_SECRET');
  })();

// ── Payload helpers ──────────────────────────────────────────────────────────

interface QRPayload {
  reference: string;
  journeyId: string;
  ts: number; // issued-at timestamp (epoch ms)
}

/**
 * Build the canonical string that goes into the QR code for a given booking.
 * The value is a Base64-encoded JSON payload with an HMAC signature appended.
 */
export function generateBookingQR(reference: string, journeyId: string): string {
  const payload: QRPayload = {
    reference,
    journeyId,
    ts: Date.now(),
  };

  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', QR_SECRET).update(encoded).digest('base64url');

  return `${encoded}.${signature}`;
}

/**
 * Decode and verify a QR payload string.  Returns null when the signature is
 * invalid or the payload is malformed.
 */
export function decodeBookingQR(data: string): { reference: string; journeyId: string } | null {
  try {
    const [encoded, signature] = data.split('.');
    if (!encoded || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', QR_SECRET).update(encoded).digest('base64url');

    // Constant-time comparison to prevent timing attacks
    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const payload: QRPayload = JSON.parse(json);

    if (!payload.reference || !payload.journeyId) return null;

    return {
      reference: payload.reference,
      journeyId: payload.journeyId,
    };
  } catch {
    return null;
  }
}

// ── SVG QR placeholder (simple visual representation) ────────────────────────

/**
 * Generate a minimal SVG-based QR-like data URL.
 *
 * In production you would swap this out for a proper QR encoder (e.g. the
 * `qrcode` npm package). This implementation creates a deterministic grid
 * pattern derived from the input text so that every unique string produces a
 * visually distinct image that can still be scanned by the decode function
 * above (the real data travels as the raw text, not the image).
 */
export function generateQRDataUrl(text: string): string {
  const size = 21; // 21x21 modules (QR Version 1 equivalent)
  const moduleSize = 10;
  const totalSize = size * moduleSize;

  // Derive a deterministic bit pattern from the text
  const hash = crypto.createHash('sha256').update(text).digest();
  const modules: boolean[][] = [];

  for (let row = 0; row < size; row++) {
    modules[row] = [];
    for (let col = 0; col < size; col++) {
      const byteIndex = (row * size + col) % hash.length;
      const bitIndex = (row * size + col) % 8;
      modules[row][col] = ((hash[byteIndex] >> bitIndex) & 1) === 1;
    }
  }

  // Force the three finder patterns (top-left, top-right, bottom-left)
  const setFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        modules[startRow + r][startCol + c] = isOuter || isInner;
      }
    }
  };

  setFinderPattern(0, 0);
  setFinderPattern(0, size - 7);
  setFinderPattern(size - 7, 0);

  // Build SVG
  let rects = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row][col]) {
        rects += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#000"/>`;
      }
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`,
    `<rect width="${totalSize}" height="${totalSize}" fill="#fff"/>`,
    rects,
    '</svg>',
  ].join('');

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
