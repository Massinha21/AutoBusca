const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'mbasic.facebook.com',
  port: 443,
  path: '/marketplace/search/?query=onix',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    fs.writeFileSync('fb_test_mobile.html', data);
    console.log("Status:", res.statusCode);
    const matches = data.match(/href="[^"]*"/g);
    console.log("Matches:", matches ? matches.length : 0);
  });
});
req.end();
