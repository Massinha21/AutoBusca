// api/sync-inventory.js
// Endpoint de Sincronização de Estoque no Supabase
// Recebe: GET /api/sync-inventory?dealer=NomeDaLoja
//

const { normalizePrice } = require("./_lib/price-utils");
const { extractMetadataFromTitle } = require("./_lib/metadata-utils");
const { supabase } = require("./_lib/supabase");

// ── Lista de Scrapers ──────────────────────────────────────────────────────
const PARSERS = [
  require("./_scrapers/zmveiculos"),
  require("./_scrapers/smartcarros"),
  require("./_scrapers/amfveiculos"),
  require("./_scrapers/savinhomotors"),
  require("./_scrapers/ramiroveiculos"),
  require("./_scrapers/glveiculos"),
  require("./_scrapers/autoprimerp"),
  require("./_scrapers/krveiculos"),
  require("./_scrapers/baseveiculos"),
  require("./_scrapers/mmveiculos"),
  require("./_scrapers/valvechveiculos"),
  require("./_scrapers/copaveiculos"),
  require("./_scrapers/automaisveiculos"),
  require("./_scrapers/rossiveiculos"),
  require("./_scrapers/seminovosribeirao"),
  require("./_scrapers/tcamotors"),
  require("./_scrapers/holfautos"),
  // Novas 9 Revendas Adicionadas
  require("./_scrapers/bolsadeveiculo"),
  require("./_scrapers/cristalveiculos"),
  require("./_scrapers/lexcarmultimarcas"),
  require("./_scrapers/sandiegoveiculos"),
  require("./_scrapers/hiperauto"),
  require("./_scrapers/tharleyveiculos"),
  require("./_scrapers/mixveiculos"),
  require("./_scrapers/kitoveiculos"),
  require("./_scrapers/cemveiculos"),
];

const BROWSER_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
};

const TIMEOUT_MS = 8000;

// Lista de Marcas Comuns no Brasil para categorização
const BRANDS = [
  "Chevrolet", "Fiat", "Volkswagen", "Ford", "Toyota", "Honda", "Hyundai", "Renault",
  "Peugeot", "Citroen", "Jeep", "Nissan", "Mitsubishi", "Chery", "Audi", "BMW",
  "Mercedes-Benz", "Mercedes", "Volvo", "Kia", "Land Rover", "Suzuki", "Subaru",
  "Jac", "Porsche", "Troller"
];

const BRAND_ALIASES = {
  "vw": "Volkswagen",
  "gm": "Chevrolet",
  "mbe": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz"
};

function detectBrand(title) {
  const t = title.toLowerCase();
  
  for (const [alias, realName] of Object.entries(BRAND_ALIASES)) {
    if (t.startsWith(alias) || t.includes(` ${alias} `) || t.includes(` ${alias}`)) {
      return realName;
    }
  }
  
  for (const brand of BRANDS) {
    if (t.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  const firstWord = title.split(" ")[0];
  if (firstWord && firstWord.length > 2) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
  
  return "Outras";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET." });
  }

  const { dealer } = req.query || {};
  if (!dealer) {
    return res.status(400).json({ error: "Parâmetro 'dealer' é obrigatório." });
  }

  // Se o Supabase estiver indisponível, simula sucesso para modo offline
  if (!supabase) {
    console.warn("[Sync] Supabase offline/bypass. Simulando resposta do sync.");
    if (dealer.toLowerCase() === "zm veículos" || dealer.toLowerCase() === "all") {
      return res.status(200).json({
        success: true,
        offline: true,
        dealer: dealer === "all" ? "Todas (offline)" : dealer,
        count: 12,
        message: "Sincronização simulada com sucesso (modo offline)."
      });
    }
    return res.status(200).json({
      success: true,
      offline: true,
      dealer,
      count: 0,
      message: "Sincronização simulada com sucesso (modo offline)."
    });
  }

  const syncStartTime = new Date().toISOString();
  let targetParsers = [];

  if (dealer === "all") {
    targetParsers = PARSERS;
  } else {
    const found = PARSERS.find(p => p.name.toLowerCase() === dealer.toLowerCase());
    if (!found) {
      return res.status(404).json({ error: `Loja '${dealer}' não encontrada.` });
    }
    targetParsers = [found];
  }

  let totalUpserted = 0;
  const syncResults = [];

  for (const parser of targetParsers) {
    try {
      console.log(`[Sync] Iniciando sincronização da loja: "${parser.name}"`);
      
      // Busca todo o estoque da loja (passa string vazia)
      const rawCars = await parser.search("", fetchHtml);
      const cars = rawCars || [];
      
      if (cars.length === 0) {
        console.log(`[Sync] Nenhum carro retornado para a loja: "${parser.name}"`);
        syncResults.push({ name: parser.name, status: "empty", count: 0 });
        continue;
      }

      // Obtém preços atuais do banco de dados para detectar variações
      const { data: existingCars, error: fetchErr } = await supabase
        .from("vehicles")
        .select("url, price_value")
        .eq("dealer_name", parser.name);

      const existingPrices = {};
      if (existingCars && !fetchErr) {
        existingCars.forEach(c => {
          existingPrices[c.url] = Number(c.price_value);
        });
      }

      const formattedVehicles = [];
      const historyEntries = [];

      cars.forEach(car => {
        const { display, value } = normalizePrice(car.price);
        const meta = extractMetadataFromTitle(car.title);
        
        let yearVal = null;
        let bestYear = car.year || meta.year;
        if (bestYear) {
          const match = String(bestYear).match(/\b\d{4}\b/);
          if (match) yearVal = parseInt(match[0], 10);
        }

        let kmVal = null;
        let bestKm = car.km || meta.km;
        if (bestKm) {
          const rawNum = String(bestKm).replace(/\D/g, "");
          if (rawNum) kmVal = parseInt(rawNum, 10);
        }

        const brandName = detectBrand(meta.title);

        const vehicleRecord = {
          url: car.url || `#-${parser.name}-${Math.random()}`,
          title: meta.title,
          price: display,
          price_value: value,
          image_url: car.image_url || null,
          dealer_name: parser.name,
          year: yearVal,
          km: kmVal,
          brand: brandName,
          updated_at: syncStartTime
        };

        formattedVehicles.push(vehicleRecord);

        // Verifica variação de preço para alimentar histórico
        const oldPrice = existingPrices[vehicleRecord.url];
        if (oldPrice === undefined || oldPrice !== value) {
          historyEntries.push({
            vehicle_url: vehicleRecord.url,
            price_value: value,
            recorded_at: syncStartTime
          });
        }
      });

      // Upsert veículos
      if (formattedVehicles.length > 0) {
        const { error: upsertErr } = await supabase
          .from("vehicles")
          .upsert(formattedVehicles, { onConflict: "url" });

        if (upsertErr) {
          throw new Error(`Erro de upsert no Supabase: ${upsertErr.message}`);
        }

        // Insere registros no histórico se aplicável
        if (historyEntries.length > 0) {
          await supabase.from("price_history").insert(historyEntries);
        }

        // Limpeza de anúncios antigos (vendidos)
        const { error: deleteErr } = await supabase
          .from("vehicles")
          .delete()
          .eq("dealer_name", parser.name)
          .lt("updated_at", syncStartTime);

        if (deleteErr) {
          console.error(`[Sync] Erro ao deletar estoque antigo da loja "${parser.name}":`, deleteErr.message);
        }

        // Processa alertas de preço
        try {
          await processPriceAlerts(formattedVehicles, existingPrices);
        } catch (alertErr) {
          console.error(`[Sync] Erro ao processar alertas de preço:`, alertErr.message);
        }

        totalUpserted += formattedVehicles.length;
        syncResults.push({ name: parser.name, status: "success", count: formattedVehicles.length });
        console.log(`[Sync] Finalizado com sucesso: "${parser.name}" com ${formattedVehicles.length} carros.`);
      }
    } catch (err) {
      console.error(`[Sync] Falha na sincronização da loja "${parser.name}":`, err.message);
      syncResults.push({ name: parser.name, status: "error", error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    dealer,
    totalUpserted,
    results: syncResults
  });
};

// ── Utilitários Auxiliares ─────────────────────────────────────────────────

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal:  controller.signal,
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifica alertas criados para os carros atualizados
 */
async function processPriceAlerts(vehicles, existingPrices) {
  if (vehicles.length === 0) return;

  const urls = vehicles.map(v => v.url);

  const { data: alerts, error } = await supabase
    .from("price_alerts")
    .select("*")
    .in("vehicle_url", urls);

  if (error || !alerts || alerts.length === 0) return;

  alerts.forEach(alert => {
    const car = vehicles.find(v => v.url === alert.vehicle_url);
    if (!car) return;

    const oldPrice = existingPrices[car.url];
    const newPrice = car.price_value;

    const isTriggered = (newPrice <= alert.target_price) || (oldPrice !== undefined && newPrice < oldPrice);

    if (isTriggered) {
      console.log(`[ALERTA DISPARADO] Enviar email para ${alert.email}: O veículo "${car.title}" (${car.dealer_name}) caiu de preço de R$ ${oldPrice || "desconhecido"} para R$ ${car.price}. (Preço alvo: R$ ${alert.target_price})`);
    }
  });
}
