import { logger } from './logger';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Import the vendored file
const qrcode = require('./qrcode-generator.js');

/**
 * Generates a QR Code Data URL (base64) from text.
 * Uses type number 0 (auto) and 'M' error correction level by default.
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const typeNumber = 0; // Auto detection
    const errorCorrectionLevel = 'M';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(text);
    qr.make();

    // Create Data URL with cell size 4 and margin 8
    // Returns data:image/gif;base64,...
    const dataURL = qr.createDataURL(4, 8);
    return dataURL;
  } catch (error) {
    logger.error('Error generating QR code', 'qrcode', error as Error);
    // Return empty string or throw?
    // Let's throw so caller knows
    throw error;
  }
}
