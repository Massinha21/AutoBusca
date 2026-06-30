const puppeteer = require('puppeteer');

/**
 * Realiza o scraping do Facebook Marketplace localmente.
 */
async function search(query) {
  let browser = null;
  const results = [];

  try {
    console.log("[Marketplace] Iniciando Puppeteer local...");
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Headers reais
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    const encodedQuery = encodeURIComponent(query);
    // Usamos a rota /search/ com category_id=vehicles porque a rota /vehicles/ ignora a keyword
    const searchUrl = `https://www.facebook.com/marketplace/ribeiraopreto/search/?query=${encodedQuery}&category_id=vehicles&exact=false`;
    
    console.log(`[Marketplace] Acessando URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Aguarda carregar algum card de item (links do marketplace)
    await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15000 }).catch(() => console.log("[Marketplace] Timeout aguardando seletor."));

    // Rola um pouco a página para garantir que as imagens e os textos (innerText) sejam renderizados pelo React
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 300;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          const itemsCount = document.querySelectorAll('a[href*="/marketplace/item/"]').length;

          if(totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000 || itemsCount >= 50){
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    // Executa a extração
    const items = await page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
      const parsedItems = [];
      const seenLinks = new Set();

      links.forEach(a => {
        const link = a.href;
        const spans = Array.from(a.querySelectorAll('span[dir="auto"]'));
        const lines = spans.map(s => s.textContent.trim()).filter(l => l.length > 0);
        
        // Se não encontrou os spans, tenta o innerText separado por quebras
        if (lines.length === 0) {
          const textContent = (a.innerText || "").trim();
          if (textContent) {
            lines.push(...textContent.split(/[\\n\\r]+/).map(l => l.trim()).filter(l => l.length > 0));
          }
        }

        // Se mesmo assim não houver linhas, ignora
        if (lines.length < 2) return;
        
        if (seenLinks.has(link)) return;
        seenLinks.add(link);

        const imgEl = a.querySelector('img');
        const imagem = imgEl ? imgEl.src : null;
        
        let preco = null;
        let modelo = "Veículo do Marketplace";
        let local = "";
        let km = null;

        // O Facebook exibe as informações na ordem: Preço, Título, [KM opcional], Local.
        let parsedCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cleanLine = line.replace(/\s+/g, '').toUpperCase();
          const lowerLine = line.toLowerCase();

          // Tenta achar o preço (primeira coisa que parece preço)
          if (cleanLine === 'GRATUITO' || cleanLine === 'FREE') {
            if (!preco) preco = 0;
            continue;
          }
          if (cleanLine.includes('R$') || cleanLine.includes('US$') || cleanLine.includes('U$') || cleanLine.includes('$') || /^\d{1,3}([.,]\d{3})+$/.test(cleanLine)) {
            // Remove centavos (ex: ,00) antes de limpar tudo para não multiplicar o valor por 100
            const withoutCents = cleanLine.split(',')[0];
            const cleanPrice = parseInt(withoutCents.replace(/[^\d]/g, ''));
            if (cleanPrice > 1500 && cleanPrice < 2000000) {
              if (!preco) preco = cleanPrice;
              continue; // Ignora a linha (útil se o Facebook mandar um segundo preço de desconto)
            }
          }

          // Tenta achar KM (se existir, geralmente vem depois do título)
          if (!km && (lowerLine.includes('km') || lowerLine.includes('mil km'))) {
            const cleanKm = parseInt(cleanLine.replace(/[^\d]/g, ''));
            if (cleanKm > 0) km = cleanKm;
            continue;
          }

          // Se não for Preço nem KM, preenche Título e depois Local
          if (modelo === "Veículo do Marketplace") {
            modelo = line;
          } else if (local === "") {
            local = line;
          }
        }

        let ano = null;
        const yearMatch = modelo.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) {
          ano = parseInt(yearMatch[0]);
          // Se o ano estiver no começo do título (ex: "2018 Hyundai HB20"), vamos removê-lo para limpar o visual
          modelo = modelo.replace(new RegExp(`^${ano}\\s*-\\s*|^${ano}\\s+`), '').trim();
        }

        parsedItems.push({ modelo, ano, km, preco, imagem, link, local });
      });

      // Baixa as descrições de cada anúncio de forma sequencial para não bloquear o IP
      for (const item of parsedItems) {
        if (!item.link) continue;
        try {
          const res = await fetch(item.link);
          const html = await res.text();
          
          // Nova tentativa: Buscar "44.600 km rodados" direto no corpo do HTML retornado
          if (!item.km) {
            const kmHtmlMatch = html.match(/(\d{1,3}(?:\.\d{3})*)\s*km\s*rodados/i);
            if (kmHtmlMatch) {
              item.km = parseInt(kmHtmlMatch[1].replace(/[^\d]/g, ''));
            }
          }

          const match = html.match(/<meta property="og:description" content="([^"]+)"/);
          if (match) {
            let desc = match[1];
            // Decode HTML entities (ex: &#xe3; -> ã, &#xfa; -> ú)
            desc = desc.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            desc = desc.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
            item.descricao = desc;
          } else {
            item.descricao = "";
          }
        } catch (e) {
          item.descricao = "";
        }
      }

      return parsedItems;
    });

    console.log(`[Marketplace] Extraídos ${items.length} itens reais na busca inicial.`);

    console.log(`[Marketplace] Iniciando Deep Scrape para capturar o KM real diretamente de cada anúncio...`);
    const maxConcurrent = 4; // Limite de abas simultâneas para não travar o PC
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const chunk = items.slice(i, i + maxConcurrent);
      await Promise.all(chunk.map(async (item) => {
        if (!item.link || !item.link.startsWith('http')) return;
        const newPage = await browser.newPage();
        try {
          await newPage.goto(item.link, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await new Promise(r => setTimeout(r, 1500)); // Aguarda o React renderizar o "Sobre este veículo"
          const kmDeep = await newPage.evaluate(() => {
            const text = document.body.innerText;
            // Padrão 1: "114.000 km rodados"
            const match = text.match(/([\d\.]+)\s*km\s*rodados/i);
            if (match) return parseInt(match[1].replace(/[^\d]/g, ''));
            // Padrão 2: "Quilometragem: 114.000"
            const match2 = text.match(/Quilometragem:\s*([\d\.]+)/i);
            if (match2) return parseInt(match2[1].replace(/[^\d]/g, ''));
            return null;
          });
          if (kmDeep) {
             item.km = kmDeep; // Substitui como padrão absoluto
          }
        } catch (e) {
          // Ignora erros de timeout de abas individuais
        } finally {
          await newPage.close();
        }
      }));
    }
    console.log(`[Marketplace] Deep Scrape finalizado! Renderizando resultados...`);
    items.forEach(item => {
      let quality_badge = "neutral";
      let quality_reason = "Anúncio dentro dos padrões normais.";

      const descLower = (item.descricao || "").toLowerCase();
      // Remove frases que NEGAM o leilão para não cair em falsos positivos
      const cleanDesc = descLower
        .replace(/sem\s+(nenhuma\s+)?(passagem\s+por\s+)?(sinistro|leil[ãa]o|batida|recuperado|remarcado)/ig, '')
        .replace(/(nem|não|nao|nunca)\s+(é\s+de\s+|tem\s+passagem\s+por\s+|teve\s+passagem\s+por\s+|foi\s+de\s+|passou\s+por\s+)?(sinistro|leil[ãa]o|batida|recuperado|remarcado)/ig, '')
        .replace(/(sem|ou|nem)\s+(qualquer\s+)?(sinistro|leil[ãa]o|batida|recuperado|remarcado)/ig, '');
      const is_salvage = /sinistro|leil[ãa]o|batida|recuperado|remarcado/i.test(cleanDesc);
      
      // Tenta extrair a versão comum do título ou da descrição
      const versionRegex = /\b(XEI|GLI|ALTIS|COMFORTLINE|HIGHLINE|TRENDLINE|TRACK|LT|LTZ|PREMIER|RS|SENSE|VISION|EVOLUTION|DIAMOND|PLATINUM|VOLCANO|FREEDOM|ENDURANCE|RANCH|ULTRA|ACTIVE|ALLURE|GRIFFE|LIKE|EX|EXL|TOURING|ELX|HLX|TREKKING|WAY|SPORTING|HGT|ADVANCE|PRECISION|DRIVE|LIMITED|LONGITUDE|SPORT|TRAILHAWK|SV|SL|UNIQUE|EXCLUSIVE|V-DRIVE)\b/i;
      const fullTextToSearch = ((item.modelo || "") + " " + (item.descricao || "")).toUpperCase();
      const versionMatch = fullTextToSearch.match(versionRegex);
      const version = versionMatch ? versionMatch[1].toUpperCase() : "";

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

      // Tenta extrair o KM da descrição caso o Facebook o tenha escondido do Card Principal
      if (!item.km) {
         const kmMatch = descLower.match(/(\d{1,3}(?:\.\d{3})*)\s*(?:km|quil[ôo]metros)/i);
         if (kmMatch) {
            item.km = parseInt(kmMatch[1].replace(/[^\d]/g, ''));
         } else {
            const milKmMatch = descLower.match(/(\d+)\s*mil\s*km/i);
            if (milKmMatch) {
               item.km = parseInt(milKmMatch[1]) * 1000;
            }
         }
      }

      let kmFormatted = "";
      if (item.km && item.km > 0) {
        kmFormatted = item.km.toLocaleString('pt-BR') + ' km';
      }

      results.push({
        title: item.modelo,
        year: item.ano || 0,
        km: kmFormatted,
        price_value: item.preco || 0,
        price: item.preco ? 'R$ ' + item.preco.toLocaleString('pt-BR') : 'Consulte',
        image_url: item.imagem,
        url: item.link,
        dealer_name: "Facebook Marketplace",
        quality_badge: quality_badge,
        quality_reason: quality_reason,
        is_salvage: is_salvage,
        version: version,
        description: item.descricao || ""
      });
    }); // fim do forEach de items

    // Busca o preço FIPE para cada item que tem versão e ano
    const { getFipePrice } = require('./fipe-matcher');
    for (const res of results) {
      if (res.year && res.year > 1990) {
        // Tenta descobrir a marca a partir do modelo pesquisado ou do título
        const brandName = query.split(' ')[0] || res.title.split(' ')[0];
        const fipeData = await getFipePrice(brandName, res.title, res.version, res.year);
        if (fipeData && fipeData.inconclusive) {
          res.fipe_inconclusive = true;
        } else if (fipeData && fipeData.priceStr) {
          res.fipe_price_str = fipeData.priceStr;
          res.fipe_model_name = fipeData.fipeModel;
          // Converte "R$ 45.000,00" para 45000
          const numValue = parseFloat(fipeData.priceStr.replace(/[R$\s\.]/g, '').replace(',', '.'));
          res.fipe_price_value = numValue;
        }
      }
    }

  } catch (error) {
    console.error("[Marketplace] Erro real no scraper local:", error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return results;
}

module.exports = { search };
