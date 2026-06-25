const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'www.facebook.com',
  port: 443,
  path: '/marketplace/search/?query=onix',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    fs.writeFileSync('fb_googlebot.html', data);
    console.log("Status:", res.statusCode);
  });
});
req.end();
