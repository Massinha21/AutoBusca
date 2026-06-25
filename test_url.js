const https = require('https');

https.get('https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar', (res) => {
  console.log('Status code:', res.statusCode);
  if (res.statusCode === 302) {
    console.log('Redirect location:', res.headers.location);
  }
}).on('error', (e) => {
  console.error(e);
});
