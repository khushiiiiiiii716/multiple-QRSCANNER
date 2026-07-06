const fs = require('fs');
const src = fs.readFileSync('src/services/qrScanner.ts', 'utf8');
console.log('Lines:', src.split('\n').length);
console.log('Has .png().toBuffer() fix:', src.includes('.png().toBuffer()'));
console.log('Has tryDecode function:', src.includes('function tryDecode'));
console.log('Has OLD removeAlpha bug:', src.includes('.removeAlpha()'));
console.log('Has OLD greyscale+ensureAlpha bug:', src.includes('.greyscale()\n      .normalise()'));
