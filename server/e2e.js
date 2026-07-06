const QRCode = require('qrcode');
const http = require('http');

function post(buf, name) {
  return new Promise((resolve, reject) => {
    const b = '----B';
    const hdr = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="image"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`);
    const ftr = Buffer.from(`\r\n--${b}--\r\n`);
    const body = Buffer.concat([hdr, buf, ftr]);
    const req = http.request({ hostname:'localhost', port:3001, path:'/api/scan', method:'POST',
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
  console.log('Running e2e test...\n');
  const tests = [
    ['https://example.com', 'URL'],
    ['WIFI:T:WPA;S:MyWifi;P:pass123;;', 'WiFi'],
    ['mailto:test@example.com', 'Email'],
    ['Just plain text data', 'Text'],
  ];

  let passed = 0;
  for (const [content, expectedType] of tests) {
    const buf = await QRCode.toBuffer(content, { type:'png', width:300, margin:2 });
    const res = await post(buf, 'test.png');
    const ok = res.totalFound === 1 && res.qrCodes[0].data === content;
    const typeOk = res.qrCodes[0]?.dataType === expectedType;
    console.log(`${ok ? '✅' : '❌'} ${expectedType}: found=${res.totalFound} decoded="${res.qrCodes[0]?.data?.substring(0,40)}" type=${res.qrCodes[0]?.dataType} time=${res.processingTimeMs}ms`);
    if (ok) passed++;
  }
  console.log(`\n${passed}/${tests.length} tests passed`);
  if (passed < tests.length) process.exit(1);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
