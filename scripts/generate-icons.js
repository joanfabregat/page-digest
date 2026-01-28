const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

function drawPageIcon(ctx, size) {
  const scale = size / 24;
  ctx.scale(scale, scale);

  // Green rounded rectangle background
  ctx.fillStyle = '#5ba seventeen';
  ctx.fillStyle = '#5BAB8A';
  ctx.beginPath();
  ctx.roundRect(2, 1, 20, 22, 4);
  ctx.fill();

  // White horizontal lines (representing text/content)
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';

  // Line 1 (top)
  ctx.beginPath();
  ctx.roundRect(5, 5, 14, 3, 1.5);
  ctx.fill();

  // Line 2 (middle)
  ctx.beginPath();
  ctx.roundRect(5, 10.5, 14, 3, 1.5);
  ctx.fill();

  // Line 3 (bottom)
  ctx.beginPath();
  ctx.roundRect(5, 16, 14, 3, 1.5);
  ctx.fill();
}

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawPageIcon(ctx, size);

  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename}`);
}

console.log('All icons generated!');
