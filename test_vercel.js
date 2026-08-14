const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });
  
  page.on('requestfailed', request => {
    console.error(`[BROWSER REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  console.log("Abrindo a página Vercel...");
  await page.goto('https://auto-busca67.vercel.app/index.html', { waitUntil: 'networkidle2' });
  
  console.log("Pesquisando 'onix'...");
  await page.type('#search-input', 'onix');
  await page.click('#search-btn');
  
  console.log("Aguardando resultados...");
  await page.waitForSelector('.car-card', { timeout: 30000 });
  
  console.log("Cards encontrados! Aguardando o fipe-client rodar...");
  await new Promise(r => setTimeout(r, 10000)); // Espera 10s para o fetchQueue processar
  
  const fipeBadges = await page.$$eval('.fipe-badge, .fipe-card-badge', els => els.length);
  console.log(`Fipe Badges encontrados no DOM: ${fipeBadges}`);
  
  await browser.close();
})();
