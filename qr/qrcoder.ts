import * as qrcode from 'qrcode';

qrcode.toDataURL('Text to encode', (err: Error | null | undefined, url: string) => {
  if (err) console.error(err);
  console.log(url); // This is a data URI for the QR code image
});

// Or save to a file
qrcode.toFile('qr.png', 'Some text', {
  color: {
    dark: '#00F',
    light: '#0000' 
  }
}, (err: Error | null | undefined) => {
  if (err) throw err;
  console.log('QR code saved!');
}); 