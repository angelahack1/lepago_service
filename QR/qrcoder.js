const QRCode = require('qrcode');

QRCode.toDataURL('Text to encode', function (err, url) {
  if (err) console.error(err);
  console.log(url); // This is a data URI for the QR code image
});

// Or save to a file
QRCode.toFile('qr.png', 'Some text', {
  color: {
    dark: '#00F',
    light: '#0000' 
  }
}, function (err) {
  if (err) throw err;
  console.log('QR code saved!');
});