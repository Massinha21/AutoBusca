const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  // Test 1: /vehicles/
  await page.goto('https://www.facebook.com/marketplace/ribeiraopreto/vehicles/?query=onix&exact=false', {waitUntil: 'networkidle2'});
  let spans1 = await page.$$eval('span[dir="auto"]', els => els.map(e => e.innerText));
  console.log("=== URL 1: /vehicles/ ===");
  console.log("Found ONIX in text:", spans1.filter(s => s.toLowerCase().includes('onix')).length);
  console.log("Top 5 spans:", spans1.slice(10, 15)); // Pula os headers
  
  // Test 2: /search/?category_id=vehicles
  await page.goto('https://www.facebook.com/marketplace/ribeiraopreto/search/?query=onix&category_id=vehicles&exact=false', {waitUntil: 'networkidle2'});
  let spans2 = await page.$$eval('span[dir="auto"]', els => els.map(e => e.innerText));
  console.log("=== URL 2: /search/?category_id=vehicles ===");
  console.log("Found ONIX in text:", spans2.filter(s => s.toLowerCase().includes('onix')).length);
  console.log("Top 5 spans:", spans2.slice(10, 15));
  
  await browser.close();
})();
