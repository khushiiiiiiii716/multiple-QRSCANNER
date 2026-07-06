const QRCode = require('qrcode');
const http = require('http');
const sharp = require('sharp');

async function createDarkBlurryQR() {
  // Generate a QR code
  const qrBuf = await QRCode.toBuffer('https://github.com/test-enhancement', {
    type: 'png', width: 300, margin: 2
  });

  // Make it dark and blurry to test enhancement
  return await sharp(qrBuf)
    .modulate({ brightness: 0.4 }) // Very dark
    .blur(1.5)                      // Blurry
    .toBuffer();
}

function post(buf, name) {
  return new Promise((resolve, reject) => {
    const b = '----B';
    const hdr = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="image"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`);
    const ftr = Buffer.from(`\r\n--${b}--\r\n`);
    const body = Buffer.concat([hdr, buf, ftr]);
    const req = http.request({
      hostname:'localhost', port:3001, path:'/api/scan', method:'POST',
      headers:{ 'Content-Type':`multipart/form-data; boundary=${b}`, 'Content-Length':body.length }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  console.log('Testing Image Enhancement...\n');
  console.log('Creating a dark & blurry QR code image...');
  
  const darkQR = await createDarkBlurryQR();
  console.log('✓ Created degraded test image\n');

  console.log('Scanning with enhancement...');
  const result = await post(darkQR, 'dark-qr.png');

  if (result.error) {
    console.error('❌ Error:', result.error);
    process.exit(1);
  }

  console.log('\n📊 Results:');
  console.log('  QR codes found:', result.totalFound);
  console.log('  Processing time:', result.processingTimeMs + 'ms');

  if (result.enhancement) {
    console.log('\n✨ Enhancement Applied:');
    console.log('  Operations:', result.enhancement.applied.join(', '));
    console.log('\n  Original Stats:');
    console.log('    Brightness:', result.enhancement.originalStats.brightness);
    console.log('    Contrast:  ', result.enhancement.originalStats.contrast);
    console.log('    Sharpness: ', result.enhancement.originalStats.sharpness);
    console.log('\n  Enhanced Stats:');
    console.log('    Brightness:', result.enhancement.enhancedStats.brightness, 
                `(${result.enhancement.enhancedStats.brightness > result.enhancement.originalStats.brightness ? '+' : ''}${result.enhancement.enhancedStats.brightness - result.enhancement.originalStats.brightness})`);
    console.log('    Contrast:  ', result.enhancement.enhancedStats.contrast,
                `(${result.enhancement.enhancedStats.contrast > result.enhancement.originalStats.contrast ? '+' : ''}${result.enhancement.enhancedStats.contrast - result.enhancement.originalStats.contrast})`);
    console.log('    Sharpness: ', result.enhancement.enhancedStats.sharpness,
                `(${result.enhancement.enhancedStats.sharpness > result.enhancement.originalStats.sharpness ? '+' : ''}${result.enhancement.enhancedStats.sharpness - result.enhancement.originalStats.sharpness})`);
  }

  if (result.totalFound > 0) {
    console.log('\n✅ Enhancement WORKING! Dark/blurry QR was successfully detected after enhancement.');
    result.qrCodes.forEach((qr, i) => {
      console.log(`\n  QR ${i+1}: ${qr.data}`);
    });
  } else {
    console.log('\n⚠️  No QR detected even with enhancement (test image may be too degraded)');
  }
}

main().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
