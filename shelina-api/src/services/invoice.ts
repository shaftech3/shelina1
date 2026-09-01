import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

/**
 * Server-side PDF invoice / order slip.
 *
 * PDFKit streams a real PDF from Node — no headless browser, no rendering
 * service, no client-side canvas hack. That keeps the invoice identical for
 * desktop, mobile and print, and means the file is produced by the same
 * authority that owns the data.
 *
 * THE SNAPSHOT RULE, RESTATED: every value printed below comes from the
 * OrderItem columns captured at purchase time. This function never reads a
 * Product row, so re-printing a year-old invoice yields the same document even
 * if the product has since been renamed, re-priced, re-SKU'd or deleted.
 */

/** Brand palette, matching the storefront tokens. */
const COLORS = {
  primary: '#2596BE',
  primaryDeep: '#1A6F8C',
  secondary: '#D29E9E',
  ink: '#1C2226',
  muted: '#5C6469',
  border: '#E8E9E4',
  cream: '#FAFBF6',
} as const;

const PAGE_MARGIN = 48;

export interface InvoiceItem {
  productName: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  notes: string | null;
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  items: InvoiceItem[];
}

/** Integer PKR → "Rs 4,500". Matches the storefront's money formatting. */
function money(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK')}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Karachi',
  });
}

/** Resolve the logo from the frontend's public folder, if it is reachable. */
function findLogo(): string | null {
  let here = process.cwd();
  if (typeof __dirname !== 'undefined') {
    here = __dirname;
  } else {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        here = path.dirname(fileURLToPath(import.meta.url));
      }
    } catch {
      // fallback
    }
  }
  const candidate = path.resolve(here, '../../../shelina/public/images/brand/shelina-logo.jpeg');
  const candidate2 = path.resolve(process.cwd(), 'public/images/brand/shelina-logo.jpeg');
  if (existsSync(candidate)) return candidate;
  if (existsSync(candidate2)) return candidate2;
  return null;
}

/**
 * Renders the invoice and resolves with the finished PDF bytes.
 *
 * Buffering rather than piping straight to the response means a mid-render
 * failure produces a clean JSON error instead of a truncated download that
 * looks like a corrupt file to the customer.
 */
export function renderInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Shelina Invoice ${order.orderNumber}`,
        Author: 'Shelina',
        Subject: `Order ${order.orderNumber}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    const right = PAGE_MARGIN + pageWidth;

    /* ── Header ────────────────────────────────────────────────────────── */
    const logo = findLogo();
    let headerBottom = PAGE_MARGIN;

    if (logo) {
      try {
        doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { fit: [88, 88] });
        headerBottom = PAGE_MARGIN + 88;
      } catch {
        // A missing or unreadable logo must never break an invoice.
      }
    }

    const textLeft = logo ? PAGE_MARGIN + 104 : PAGE_MARGIN;
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('SHELINA', textLeft, PAGE_MARGIN + 6);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text('Premium footwear, made in Pakistan', textLeft, doc.y + 2);

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text('INVOICE', PAGE_MARGIN, PAGE_MARGIN + 6, { width: pageWidth, align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(order.orderNumber, PAGE_MARGIN, doc.y + 2, { width: pageWidth, align: 'right' });

    doc
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(formatDate(order.createdAt), PAGE_MARGIN, doc.y + 1, { width: pageWidth, align: 'right' });

    // Status is spelled out in words, never conveyed by colour alone.
    doc
      .fontSize(9)
      .fillColor(COLORS.primaryDeep)
      .text(`Status: ${order.status}   ·   Payment: ${order.paymentStatus} (Cash on Delivery)`, {
        width: pageWidth,
        align: 'right',
      });

    headerBottom = Math.max(headerBottom, doc.y) + 14;
    doc
      .moveTo(PAGE_MARGIN, headerBottom)
      .lineTo(right, headerBottom)
      .lineWidth(1)
      .strokeColor(COLORS.border)
      .stroke();

    /* ── Customer / shipping ───────────────────────────────────────────── */
    const colWidth = (pageWidth - 24) / 2;
    const blockTop = headerBottom + 18;

    const label = (text: string, x: number, y: number) =>
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text(text.toUpperCase(), x, y, {
        width: colWidth,
        characterSpacing: 0.6,
      });

    label('Billed to', PAGE_MARGIN, blockTop);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(order.customerName, PAGE_MARGIN, doc.y + 4, { width: colWidth })
      .fillColor(COLORS.muted)
      .fontSize(9)
      .text(order.customerEmail, { width: colWidth })
      .text(order.customerPhone, { width: colWidth });

    const leftBottom = doc.y;

    label('Ship to', PAGE_MARGIN + colWidth + 24, blockTop);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text(order.shippingAddress, PAGE_MARGIN + colWidth + 24, blockTop + 16, { width: colWidth })
      .text(order.city, { width: colWidth });

    let cursor = Math.max(leftBottom, doc.y) + 20;

    if (order.notes) {
      label('Order notes', PAGE_MARGIN, cursor);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(order.notes, PAGE_MARGIN, doc.y + 4, { width: pageWidth });
      cursor = doc.y + 18;
    }

    /* ── Items table ───────────────────────────────────────────────────── */
    // Size and colour get their own columns: they are the whole point of the
    // order, and burying them in the product name would lose them.
    const cols = {
      product: PAGE_MARGIN,
      size: PAGE_MARGIN + 172,
      color: PAGE_MARGIN + 232,
      qty: PAGE_MARGIN + 312,
      unit: PAGE_MARGIN + 352,
      total: PAGE_MARGIN + 432,
    };
    const colEnd = right;

    const drawHeader = (y: number) => {
      doc.rect(PAGE_MARGIN, y, pageWidth, 22).fill(COLORS.cream);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
      doc.text('PRODUCT', cols.product + 8, y + 7, { width: 156 });
      doc.text('SIZE', cols.size, y + 7, { width: 56 });
      doc.text('COLOUR', cols.color, y + 7, { width: 76 });
      doc.text('QTY', cols.qty, y + 7, { width: 32, align: 'right' });
      doc.text('UNIT', cols.unit, y + 7, { width: 72, align: 'right' });
      doc.text('TOTAL', cols.total, y + 7, { width: colEnd - cols.total - 8, align: 'right' });
      return y + 22;
    };

    cursor = drawHeader(cursor);

    for (const item of order.items) {
      // Start a new page before a row would run off the bottom.
      if (cursor > doc.page.height - 170) {
        doc.addPage();
        cursor = PAGE_MARGIN;
        cursor = drawHeader(cursor);
      }

      const nameHeight = doc.font('Helvetica').fontSize(9).heightOfString(item.productName, { width: 156 });
      const rowHeight = Math.max(30, nameHeight + 20);

      doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink);
      doc.text(item.productName, cols.product + 8, cursor + 7, { width: 156 });

      if (item.sku) {
        doc
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(item.sku, cols.product + 8, doc.y + 1, { width: 156 });
      }

      // An em dash reads better than an empty cell for a product that simply
      // has no sizes or colours.
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink);
      doc.text(item.size ?? '—', cols.size, cursor + 7, { width: 56 });
      doc.text(item.color ?? '—', cols.color, cursor + 7, { width: 76 });
      doc.text(String(item.quantity), cols.qty, cursor + 7, { width: 32, align: 'right' });
      doc.text(money(item.unitPrice), cols.unit, cursor + 7, { width: 72, align: 'right' });
      doc
        .font('Helvetica-Bold')
        .text(money(item.lineTotal), cols.total, cursor + 7, {
          width: colEnd - cols.total - 8,
          align: 'right',
        });

      cursor += rowHeight;
      doc
        .moveTo(PAGE_MARGIN, cursor)
        .lineTo(right, cursor)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
    }

    /* ── Totals ────────────────────────────────────────────────────────── */
    if (cursor > doc.page.height - 150) {
      doc.addPage();
      cursor = PAGE_MARGIN;
    }

    const totalsLeft = right - 220;
    cursor += 14;

    const totalRow = (labelText: string, value: string, emphasis = false) => {
      doc
        .font(emphasis ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(emphasis ? 12 : 9.5)
        .fillColor(emphasis ? COLORS.ink : COLORS.muted)
        .text(labelText, totalsLeft, cursor, { width: 120 });
      doc
        .font('Helvetica-Bold')
        .fontSize(emphasis ? 12 : 9.5)
        .fillColor(emphasis ? COLORS.primaryDeep : COLORS.ink)
        .text(value, totalsLeft + 120, cursor, { width: 100, align: 'right' });
      cursor += emphasis ? 22 : 16;
    };

    totalRow('Subtotal', money(order.subtotal));
    totalRow('Shipping', order.shippingFee === 0 ? 'Free' : money(order.shippingFee));

    doc
      .moveTo(totalsLeft, cursor + 2)
      .lineTo(right, cursor + 2)
      .lineWidth(1)
      .strokeColor(COLORS.border)
      .stroke();
    cursor += 10;

    totalRow('Grand total', money(order.grandTotal), true);

    /* ── Footer ────────────────────────────────────────────────────────── */
    const footerY = doc.page.height - 84;
    doc
      .moveTo(PAGE_MARGIN, footerY)
      .lineTo(right, footerY)
      .lineWidth(0.5)
      .strokeColor(COLORS.border)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(
        'Payment is collected as Cash on Delivery. Thank you for shopping with Shelina.',
        PAGE_MARGIN,
        footerY + 12,
        { width: pageWidth, align: 'center' },
      )
      .fillColor(COLORS.secondary)
      .text('shelina.pk', PAGE_MARGIN, doc.y + 3, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
