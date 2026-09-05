const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPng(width, height, drawPixel) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crc ^ buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Check point in triangle helper
function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax, v0y = cy - ay;
  const v1x = bx - ax, v1y = by - ay;
  const v2x = px - ax, v2y = py - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return (u >= 0) && (v >= 0) && (u + v <= 1);
}

function renderIcon(size, isMaskable = false) {
  const cornerRadius = isMaskable ? 0 : size * 0.22;
  const padding = isMaskable ? size * 0.12 : size * 0.05;

  return createPng(size, size, (x, y, w, h) => {
    // Distance from corner for squircle/rounded rect
    if (!isMaskable) {
      const dx = Math.max(0, Math.max(cornerRadius - x, x - (w - cornerRadius)));
      const dy = Math.max(0, Math.max(cornerRadius - y, y - (h - cornerRadius)));
      if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
        return [0, 0, 0, 0]; // transparent outside rounded corner
      }
    }

    // Normalized coordinates
    const nx = x / w;
    const ny = y / h;

    // Background gradient: Obsidian #18181f to #050507
    const bgT = (nx * 0.4 + ny * 0.6);
    let r = Math.round(24 * (1 - bgT) + 6 * bgT);
    let g = Math.round(24 * (1 - bgT) + 6 * bgT);
    let b = Math.round(31 * (1 - bgT) + 8 * bgT);
    let a = 255;

    // Outer subtle border
    if (!isMaskable && (x < 3 || x >= w - 3 || y < 3 || y >= h - 3)) {
      return [90, 90, 105, 255];
    }

    // Scale origami coordinates to icon size
    // Reference SVG points:
    // P1: (120 + 18, 248 + 12) = (138, 260)
    // P2: (376 + 18, 140 + 12) = (394, 152) - tip
    // P3: (236 + 18, 280 + 12) = (254, 292) - center fold
    // P4: (188 + 18, 348 + 12) = (206, 360) - left bottom tip
    // P5: (276 + 18, 316 + 12) = (294, 328) - keel bottom tip
    const scale = (size - padding * 2) / 420;
    const offsetX = padding + (isMaskable ? 8 : 16) * scale;
    const offsetY = padding + (isMaskable ? 8 : 12) * scale;

    const p1x = 138 * scale + offsetX;
    const p1y = 260 * scale + offsetY;
    const p2x = 394 * scale + offsetX;
    const p2y = 152 * scale + offsetY;
    const p3x = 254 * scale + offsetX;
    const p3y = 292 * scale + offsetY;
    const p4x = 206 * scale + offsetX;
    const p4y = 360 * scale + offsetY;
    const p5x = 294 * scale + offsetX;
    const p5y = 328 * scale + offsetY;

    // Check Upper Wing: (p1, p2, p3)
    if (pointInTriangle(x, y, p1x, p1y, p2x, p2y, p3x, p3y)) {
      // Platinum white gradient
      const t = (x - p1x) / (p2x - p1x);
      const val = Math.min(255, Math.round(180 + t * 75));
      return [val, val, Math.min(255, val + 5), 255];
    }

    // Check Lower Wing: (p1, p3, p4)
    if (pointInTriangle(x, y, p1x, p1y, p3x, p3y, p4x, p4y)) {
      // Silver to slate gradient
      const t = (y - p1y) / (p4y - p1y);
      const val = Math.round(180 * (1 - t) + 60 * t);
      return [val, val + 5, val + 15, 255];
    }

    // Check Keel: (p3, p2, p5)
    if (pointInTriangle(x, y, p3x, p3y, p2x, p2y, p5x, p5y)) {
      // Charcoal/graphite shading
      const t = (y - p2y) / (p5y - p2y);
      const val = Math.round(140 * (1 - t) + 30 * t);
      return [val, val + 2, val + 8, 255];
    }

    // 4-point star in top right
    const starX = (382 + 18) * scale + offsetX;
    const starY = (116 + 12) * scale + offsetY;
    const sdist = Math.hypot(x - starX, y - starY);
    if (sdist < 18 * scale) {
      const starGlow = Math.max(0, 1 - sdist / (18 * scale));
      r = Math.min(255, r + Math.round(180 * starGlow));
      g = Math.min(255, g + Math.round(180 * starGlow));
      b = Math.min(255, b + Math.round(210 * starGlow));
      if (sdist < 3 * scale) return [255, 255, 255, 255];
    }

    return [r, g, b, a];
  });
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), renderIcon(192, false));
fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), renderIcon(512, false));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512x512.png'), renderIcon(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderIcon(180, false));

// Also generate a splash screen for iOS startup
const splashBuf = renderIcon(512, false);
fs.writeFileSync(path.join(outDir, 'apple-splash.png'), splashBuf);

console.log('All PWA PNG icons generated successfully!');
