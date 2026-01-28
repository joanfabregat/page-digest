const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

function drawArmchair(ctx, size) {
  const scale = size / 24;
  ctx.scale(scale, scale);

  // Full green background with slight rounding
  ctx.fillStyle = '#10a37f';
  ctx.beginPath();
  ctx.roundRect(0, 0, 24, 24, 4);
  ctx.fill();

  // White armchair icon - with more padding
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Scale down and center with padding
  ctx.translate(3, 3);
  const innerScale = 0.75;
  ctx.scale(innerScale, innerScale);

  // Back of chair
  ctx.beginPath();
  ctx.moveTo(19, 9);
  ctx.lineTo(19, 6.5);
  ctx.quadraticCurveTo(19, 4, 16.5, 4);
  ctx.lineTo(7.5, 4);
  ctx.quadraticCurveTo(5, 4, 5, 6.5);
  ctx.lineTo(5, 9);
  ctx.stroke();

  // Seat and armrests
  ctx.beginPath();
  ctx.moveTo(3, 15);
  ctx.quadraticCurveTo(3, 13, 5, 13);
  ctx.lineTo(5, 11);
  ctx.quadraticCurveTo(5, 9.5, 6.5, 9.5);
  ctx.quadraticCurveTo(8, 9.5, 8, 11);
  ctx.lineTo(8, 12);
  ctx.lineTo(16, 12);
  ctx.lineTo(16, 11);
  ctx.quadraticCurveTo(16, 9.5, 17.5, 9.5);
  ctx.quadraticCurveTo(19, 9.5, 19, 11);
  ctx.lineTo(19, 13);
  ctx.quadraticCurveTo(21, 13, 21, 15);
  ctx.quadraticCurveTo(21, 17, 19, 17);
  ctx.lineTo(5, 17);
  ctx.quadraticCurveTo(3, 17, 3, 15);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(6, 17);
  ctx.lineTo(6, 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18, 17);
  ctx.lineTo(18, 20);
  ctx.stroke();
}

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawArmchair(ctx, size);

  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename}`);
}

console.log('All icons generated!');
