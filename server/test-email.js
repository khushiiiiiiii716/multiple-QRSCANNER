const http = require('http');

const body = JSON.stringify({
  recipientEmail: 'test@example.com',
  recipientName: 'Test User',
  scanResult: {
    success: true,
    filename: 'test.png',
    fileSize: 1234,
    mimeType: 'image/png',
    totalFound: 2,
    processingTimeMs: 300,
    originalWidth: 300,
    originalHeight: 300,
    annotatedImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    qrCodes: [
      { id: '1', data: 'https://example.com', dataType: 'URL', color: '#FF6B6B',
        boundingBox: { x: 10, y: 10, width: 100, height: 100 },
        corners: { topLeft:{x:10,y:10}, topRight:{x:110,y:10}, bottomLeft:{x:10,y:110}, bottomRight:{x:110,y:110} }
      },
      { id: '2', data: 'WIFI:T:WPA;S:HomeNet;P:pass;;', dataType: 'WiFi', color: '#4ECDC4',
        boundingBox: { x: 150, y: 10, width: 100, height: 100 },
        corners: { topLeft:{x:150,y:10}, topRight:{x:250,y:10}, bottomLeft:{x:150,y:110}, bottomRight:{x:250,y:110} }
      }
    ]
  }
});

const req = http.request({
  hostname: 'localhost', port: 3001, path: '/api/email', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.previewURL) {
      console.log('\n📧 Preview email at:', data.previewURL);
    }
    if (res.statusCode === 200 && data.success) {
      console.log('\n✅ Email endpoint WORKING!');
    } else {
      console.log('\n❌ Email failed');
      process.exit(1);
    }
  });
});
req.on('error', e => { console.error('Error:', e.message); process.exit(1); });
req.write(body);
req.end();
