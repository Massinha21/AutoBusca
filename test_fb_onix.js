const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const b = await puppeteer.launch({ headless: "new" });
  const p = await b.newPage();
  await p.goto('https://www.facebook.com/marketplace/ribeiraopreto/search/?query=onix', { waitUntil: 'networkidle2' });
  
  await p.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 300;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight - window.innerHeight || totalHeight > 3000){
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });

  const items = await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
    return els.slice(0, 5).map(a => {
      const spans = Array.from(a.querySelectorAll('span[dir="auto"]'));
      return {
        innerText: a.innerText,
        spans: spans.map(s => s.textContent.trim()),
        html: a.outerHTML
      };
    });
  });
  
  fs.writeFileSync('fb_dump_onix.json', JSON.stringify(items, null, 2));
  console.log('Salvo em fb_dump_onix.json');
  await b.close();
})();
