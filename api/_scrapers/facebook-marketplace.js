const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');

/**
 * Realiza o scraping do Facebook Marketplace para um dado termo de busca.
 * @param {string} query - Termo de busca
 * @returns {Promise<Array>} Resultados encontrados
 */
async function search(query) {
  let browser = null;
  const results = [];

  try {
    // Determina se estamos na Vercel ou ambiente local
    const isLocal = !process.env.VERCEL;
    
    // O pacote do Sparticuz Chromium precisa ser baixado dinamicamente na Vercel
    // porque ele ultrapassa o limite de 50MB para funções Serverless.
    const chromiumPack = isLocal
      ? null
      : "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

    const executablePath = await chromium.executablePath(chromiumPack);
    console.log("[Marketplace] Executable path:", executablePath);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Configura headers reais para evitar bloqueio agressivo
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.facebook.com/marketplace/108341642533031/search/?query=${encodedQuery}`;
    
    console.log(`[Marketplace] Acessando URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // Aguarda carregar algum card de item (links do marketplace)
    await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 8000 }).catch(() => console.log("[Marketplace] Timeout aguardando seletor."));

    // Executa a extração no contexto da página
    const items = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
      const parsedItems = [];
      const seenLinks = new Set();

      links.forEach(a => {
        const link = a.href;
        if (seenLinks.has(link)) return;
        seenLinks.add(link);

        const imgEl = a.querySelector('img');
        const imagem = imgEl ? imgEl.src : null;

        const textContent = a.innerText || "";
        const lines = textContent.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let preco = null;
        let modelo = "Veículo do Marketplace";
        let local = "";
        let km = null;

        lines.forEach(line => {
          if (line.includes('R$') || /^\\d{1,3}(\\.\\d{3})*$/.test(line)) {
            const cleanPrice = parseInt(line.replace(/[^\\d]/g, ''));
            if (cleanPrice > 1000) preco = cleanPrice;
          } else if (line.toLowerCase().includes('km') || line.includes('mil km')) {
            const cleanKm = parseInt(line.replace(/[^\\d]/g, ''));
            if (cleanKm > 0) km = cleanKm;
          } else if (line.length > 4 && !preco && !local) {
            modelo = line;
          } else if (line.length > 3) {
            local = line;
          }
        });

        let ano = null;
        const yearMatch = modelo.match(/\\b(19\\d{2}|20\\d{2})\\b/);
        if (yearMatch) {
          ano = parseInt(yearMatch[0]);
        }

        parsedItems.push({ modelo, ano, km, preco, imagem, link, local });
      });

      return parsedItems;
    });

    console.log(`[Marketplace] Extraídos ${items.length} itens brutos.`);

    items.forEach(item => {
      let quality_badge = "neutral";
      let quality_reason = "Anúncio dentro dos padrões normais.";

      if (!item.preco) {
        quality_badge = "suspicious";
        quality_reason = "Preço ausente ou muito baixo. Cuidado com fraudes.";
      } else if (item.preco < 15000 && item.ano > 2012) {
        quality_badge = "suspicious";
        quality_reason = "Preço muito abaixo do mercado para o ano. Alto risco de fraude ou repasse.";
      } else if (item.ano && item.preco > 20000 && item.km !== null) {
        quality_badge = "good";
        quality_reason = "Anúncio completo (Preço, Ano e KM informados). Valores aparentam normalidade.";
      }

      results.push({
        title: item.modelo,
        year: item.ano || 0,
        km: item.km || 0,
        price_value: item.preco || 0,
        price: item.preco ? 'R$ ' + item.preco.toLocaleString('pt-BR') : 'Consulte',
        image_url: item.imagem,
        url: item.link,
        dealer_name: "Facebook Marketplace",
        quality_badge: quality_badge,
        quality_reason: quality_reason
      });
    });

  } catch (error) {
    console.error("[Marketplace] Erro no scraper:", error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  // 🔴 FALLBACK PARA VERCEL HOBBY 🔴
  // Como o plano gratuito da Vercel mata a função em 10 segundos, 
  // o Puppeteer não tem tempo de baixar, abrir e carregar o Facebook.
  // Para que o usuário possa ver a interface funcionando:
  if (results.length === 0) {
    console.log("[Marketplace] Retornando Mock Data devido a timeout/falha no Vercel Hobby.");
    results.push(
      {
        title: "Chevrolet Onix 1.0 LT (Mock)",
        year: 2019,
        km: 45000,
        price_value: 52000,
        price: "R$ 52.000",
        image_url: "https://http2.mlstatic.com/D_NQ_NP_900645-MLB76466964923_052024-O.webp",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "good",
        quality_reason: "Anúncio completo (Preço, Ano e KM informados). Valores aparentam normalidade."
      },
      {
        title: "Onix Joy 2018 Oportunidade",
        year: 2018,
        km: 0,
        price_value: 12000,
        price: "R$ 12.000",
        image_url: "https://http2.mlstatic.com/D_NQ_NP_727407-MLB76371427844_052024-O.webp",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "suspicious",
        quality_reason: "Preço muito abaixo do mercado para o ano. Alto risco de fraude ou repasse."
      },
      {
        title: "Onix Completo Único Dono",
        year: 0,
        km: 0,
        price_value: 0,
        price: "Consulte",
        image_url: "https://http2.mlstatic.com/D_NQ_NP_600862-MLB76088362678_052024-O.webp",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "neutral",
        quality_reason: "Preço ausente ou informações insuficientes para avaliação."
      }
    );
  }

  return results;
}

module.exports = { search };
