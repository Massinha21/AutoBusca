const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'www.facebook.com',
  port: 443,
  path: '/marketplace/108341642533031/search/?query=onix',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    fs.writeFileSync('fb_test.html', data);
    const matches = data.match(/\/marketplace\/item\/\d+/g);
    console.log("Status:", res.statusCode);
    console.log("Matches encontrados via HTTP Get:", matches ? matches.length : 0);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
