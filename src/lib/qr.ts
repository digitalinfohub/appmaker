import qrcode from "qrcode-generator";

/**
 * Renders a QR code as an inline SVG string (quiet zone included).
 * Uses low error correction so dense URLs still fit on small codes.
 */
export function qrSvg(text: string, size = 148): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 2;
  const total = count + quiet * 2;
  const rects: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        rects.push(`<rect x="${col + quiet}" y="${row + quiet}" width="1" height="1"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-label="QR code"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#0b0d12" shape-rendering="crispEdges">${rects.join(
    "",
  )}</g></svg>`;
}
