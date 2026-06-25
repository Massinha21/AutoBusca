const puppeteer = require('puppeteer');
const fs = require('fs');
const { search } = require('./api/_scrapers/facebook-marketplace');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  });
  await page.goto('https://www.facebook.com/marketplace/ribeiraopreto/vehicles/?query=onix&exact=false', { waitUntil: 'networkidle2' });
  
  await page.evaluate(async () => {
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

  const debugItems = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
    return links.slice(0, 5).map(a => {
        const spans = Array.from(a.querySelectorAll('span[dir="auto"]'));
        const lines = spans.map(s => s.textContent.trim()).filter(l => l.length > 0);
        
        if (lines.length === 0) {
          const textContent = (a.innerText || "").trim();
          if (textContent) {
            lines.push(...textContent.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0));
          }
        }

        let preco = null;
        let modelo = "Veículo do Marketplace";
        let local = "";
        let km = null;

        const loopLog = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cleanLine = line.replace(/\s+/g, '').toUpperCase();
          const lowerLine = line.toLowerCase();
          
          let action = "NONE";

          if (cleanLine === 'GRATUITO' || cleanLine === 'FREE') {
            if (!preco) preco = 0;
            loopLog.push({ line, cleanLine, action: "SET_FREE" });
            continue;
          }
          
          const isPriceFormat = cleanLine.includes('R$') || cleanLine.includes('US$') || cleanLine.includes('U$') || cleanLine.includes('$') || /^\d{1,3}([.,]\d{3})+$/.test(cleanLine);
          
          if (isPriceFormat) {
            const withoutCents = cleanLine.split(',')[0];
            const cleanPrice = parseInt(withoutCents.replace(/[^\d]/g, ''));
            if (cleanPrice > 1500 && cleanPrice < 2000000) {
              if (!preco) preco = cleanPrice;
              loopLog.push({ line, cleanLine, cleanPrice, action: "SET_PRICE" });
              continue;
            } else {
              loopLog.push({ line, cleanLine, cleanPrice, action: "FAILED_PRICE_BOUNDS" });
            }
          }

          if (!km && (lowerLine.includes('km') || lowerLine.includes('mil km'))) {
            const cleanKm = parseInt(cleanLine.replace(/[^\d]/g, ''));
            if (cleanKm > 0) km = cleanKm;
            loopLog.push({ line, cleanLine, action: "SET_KM" });
            continue;
          }

          if (modelo === "Veículo do Marketplace") {
            modelo = line;
            action = "SET_MODELO";
          } else if (local === "") {
            local = line;
            action = "SET_LOCAL";
          }
          
          loopLog.push({ line, cleanLine, action });
        }

        return { lines, loopLog, final: { preco, modelo, local, km } };
    });
  });

  fs.writeFileSync('debug_onix_parser.json', JSON.stringify(debugItems, null, 2));
  console.log('Salvo debug_onix_parser.json');
  await browser.close();
})();
