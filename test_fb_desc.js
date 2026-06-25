const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({headless: 'new'});
  const p = await b.newPage();
  await p.goto('https://www.facebook.com/marketplace/ribeiraopreto/search/?query=hb20', {waitUntil:'networkidle2'});
  const text = await p.evaluate(async () => {
    const r = await fetch('/marketplace/item/1021001593997308/');
    return await r.text();
  });
  const match = text.match(/<meta property="og:description" content="([^"]+)"/);
  console.log('Description:', match ? match[1] : 'Not found');
  await b.close();
})();
