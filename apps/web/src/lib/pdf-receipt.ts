/**
 * Minimal PDF 1.4 receipt generator for Twende Zambia.
 * Builds a valid PDF document as a Buffer using only string/Buffer manipulation.
 * No external PDF libraries required.
 */

interface ReceiptData {
  bookingReference: string;
  passengerName: string;
  passengerPhone: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date | null;
  seatNumber: string | null;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  operatorName: string;
  vehicleRegistration: string;
  bookedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-ZM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

function formatCurrency(amount: number): string {
  return `K ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    AIRTEL_MONEY: 'Airtel Money',
    MTN_MOMO: 'MTN MoMo',
    ZAMTEL_KWACHA: 'Zamtel Kwacha',
    PAY_AT_TERMINAL: 'Pay at Terminal',
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    CASH: 'Cash',
  };
  return map[method] ?? method;
}

function escPdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────

class PdfBuilder {
  private objects: string[] = [];
  private offsets: number[] = [];
  private output = '';
  private currentObj = 0;

  addObject(content: string): number {
    this.currentObj++;
    this.objects.push(content);
    return this.currentObj;
  }

  build(): Buffer {
    // Header
    this.output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    // Write objects and record offsets
    for (let i = 0; i < this.objects.length; i++) {
      this.offsets.push(Buffer.byteLength(this.output, 'binary'));
      this.output += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    // Cross-reference table
    const xrefOffset = Buffer.byteLength(this.output, 'binary');
    this.output += 'xref\n';
    this.output += `0 ${this.objects.length + 1}\n`;
    this.output += '0000000000 65535 f \n';
    for (const offset of this.offsets) {
      this.output += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    // Trailer
    this.output += 'trailer\n';
    this.output += `<< /Size ${this.objects.length + 1} /Root 1 0 R >>\n`;
    this.output += 'startxref\n';
    this.output += `${xrefOffset}\n`;
    this.output += '%%EOF\n';

    return Buffer.from(this.output, 'binary');
  }
}

// ─── Stream content helpers ───────────────────────────────────────────────────

function drawLine(x1: number, y1: number, x2: number, y2: number, width = 0.5): string {
  return `${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS\n`;
}

function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number
): string {
  return `${r} ${g} ${b} rg\n${x} ${y} ${w} ${h} re\nf\n`;
}

function drawText(
  text: string,
  x: number,
  y: number,
  font: string,
  size: number,
  r = 0,
  g = 0,
  b = 0
): string {
  return `BT\n${r} ${g} ${b} rg\n/${font} ${size} Tf\n${x} ${y} Td\n(${escPdf(text)}) Tj\nET\n`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateReceiptPdf(data: ReceiptData): Buffer {
  const pdf = new PdfBuilder();

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Receipt number from booking reference
  const receiptNumber = `RCT-${data.bookingReference.replace('ZP-', '')}`;

  // Build page content stream
  let stream = '';

  // ── Background ──
  // White page is default

  // ── Header band ──
  // Teal (#0F6E56) header bar
  stream += drawRect(0, pageHeight - 100, pageWidth, 100, 0.059, 0.431, 0.337);

  // Brand name
  stream += drawText('TWENDE ZAMBIA', margin, pageHeight - 50, 'F1', 22, 1, 1, 1);

  // Subtitle
  stream += drawText('Travel Receipt', margin, pageHeight - 72, 'F2', 11, 0.9, 0.9, 0.9);

  // Receipt number on the right
  stream += drawText(receiptNumber, pageWidth - margin - 160, pageHeight - 50, 'F1', 12, 1, 1, 1);

  // Date issued on the right
  stream += drawText(
    `Issued: ${formatDate(new Date())}`,
    pageWidth - margin - 160,
    pageHeight - 72,
    'F2',
    9,
    0.9,
    0.9,
    0.9
  );

  // ── Booking Reference ──
  let y = pageHeight - 135;

  stream += drawText('Booking Reference', margin, y, 'F1', 10, 0.4, 0.4, 0.4);
  y -= 18;
  stream += drawText(data.bookingReference, margin, y, 'F1', 16, 0.059, 0.431, 0.337);

  // Status badge text
  const statusText = data.paymentStatus === 'PAID' ? 'PAID' : data.paymentStatus;
  stream += drawText(statusText, pageWidth - margin - 60, y, 'F1', 12, 0.059, 0.431, 0.337);

  // ── Separator ──
  y -= 20;
  stream += '0.85 0.85 0.85 RG\n';
  stream += drawLine(margin, y, pageWidth - margin, y, 0.5);

  // ── Passenger Details ──
  y -= 28;
  stream += drawText('PASSENGER DETAILS', margin, y, 'F1', 10, 0.4, 0.4, 0.4);

  y -= 22;
  stream += drawText('Name:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(data.passengerName || 'N/A', margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);

  y -= 18;
  stream += drawText('Phone:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(data.passengerPhone, margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);

  // ── Separator ──
  y -= 20;
  stream += '0.85 0.85 0.85 RG\n';
  stream += drawLine(margin, y, pageWidth - margin, y, 0.5);

  // ── Journey Details ──
  y -= 28;
  stream += drawText('JOURNEY DETAILS', margin, y, 'F1', 10, 0.4, 0.4, 0.4);

  y -= 22;
  stream += drawText('Route:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(
    `${data.origin}  -->  ${data.destination}`,
    margin + 100,
    y,
    'F1',
    10,
    0.1,
    0.1,
    0.1
  );

  y -= 18;
  stream += drawText('Departure:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(formatDateTime(data.departureTime), margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);

  if (data.arrivalTime) {
    y -= 18;
    stream += drawText('Arrival:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
    stream += drawText(formatDateTime(data.arrivalTime), margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);
  }

  y -= 18;
  stream += drawText('Seat:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(
    data.seatNumber ? `Seat ${data.seatNumber}` : 'Unassigned',
    margin + 100,
    y,
    'F1',
    10,
    0.1,
    0.1,
    0.1
  );

  y -= 18;
  stream += drawText('Operator:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(data.operatorName, margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);

  y -= 18;
  stream += drawText('Vehicle:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(data.vehicleRegistration, margin + 100, y, 'F1', 10, 0.1, 0.1, 0.1);

  // ── Separator ──
  y -= 20;
  stream += '0.85 0.85 0.85 RG\n';
  stream += drawLine(margin, y, pageWidth - margin, y, 0.5);

  // ── Payment Details ──
  y -= 28;
  stream += drawText('PAYMENT DETAILS', margin, y, 'F1', 10, 0.4, 0.4, 0.4);

  y -= 22;
  stream += drawText('Payment Method:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(
    formatPaymentMethod(data.paymentMethod),
    margin + 130,
    y,
    'F1',
    10,
    0.1,
    0.1,
    0.1
  );

  y -= 18;
  stream += drawText('Booked On:', margin, y, 'F2', 10, 0.5, 0.5, 0.5);
  stream += drawText(formatDateTime(data.bookedAt), margin + 130, y, 'F1', 10, 0.1, 0.1, 0.1);

  // ── Total Amount Box ──
  y -= 35;
  // Light teal background for total
  stream += drawRect(margin, y - 10, contentWidth, 40, 0.9, 0.96, 0.94);
  stream += drawText('Total Amount Paid', margin + 15, y + 12, 'F1', 11, 0.3, 0.3, 0.3);
  stream += drawText(
    formatCurrency(data.amount),
    pageWidth - margin - 150,
    y + 8,
    'F1',
    18,
    0.059,
    0.431,
    0.337
  );

  // ── Footer ──
  y -= 60;
  stream += '0.85 0.85 0.85 RG\n';
  stream += drawLine(margin, y, pageWidth - margin, y, 0.5);

  y -= 20;
  stream += drawText(
    'Thank you for travelling with Twende Zambia.',
    margin,
    y,
    'F2',
    9,
    0.5,
    0.5,
    0.5
  );

  y -= 15;
  stream += drawText(
    'This is an electronically generated receipt and does not require a signature.',
    margin,
    y,
    'F2',
    8,
    0.6,
    0.6,
    0.6
  );

  y -= 15;
  stream += drawText(
    'For support, contact us at support@twendezambia.co.zm or call +260 211 000 000.',
    margin,
    y,
    'F2',
    8,
    0.6,
    0.6,
    0.6
  );

  // ── Build PDF objects ──

  // 1: Catalog
  pdf.addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // 2: Pages
  pdf.addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

  // 3: Page
  pdf.addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
  );

  // 4: Stream content
  const streamBytes = Buffer.from(stream, 'binary');
  pdf.addObject(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);

  // 5: Font - Helvetica Bold
  pdf.addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  // 6: Font - Helvetica
  pdf.addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );

  return pdf.build();
}

export type { ReceiptData };
