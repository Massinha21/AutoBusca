// api/estoque-geral.js
// Endpoint para Consulta do Estoque Geral (Supabase)
// Recebe: GET /api/estoque-geral?dealer=X&brand=Y&minPrice=Z&maxPrice=W...
//

const { supabase } = require("./_lib/supabase");

// Mock de dados enriquecido para uso offline (caso Supabase não esteja conectado)
const OFFLINE_CARS = [
  { title: "Civic 2.0 Lxr 16v Flex 4p Automático", price: "R$ 75.900", price_value: 75900, image_url: null, url: "#1", dealer_name: "ZM Veículos", year: 2016, km: 82000, brand: "Honda" },
  { title: "S10 2.4 Mpfi Executive 4x2 Cd 8v Flex 4p Manual", price: "R$ 67.900", price_value: 67900, image_url: null, url: "#2", dealer_name: "ZM Veículos", year: 2011, km: 145000, brand: "Chevrolet" },
  { title: "Spin 1.8 Premier 8v Flex 4p Automático", price: "R$ 79.900", price_value: 79900, image_url: null, url: "#3", dealer_name: "ZM Veículos", year: 2020, km: 45000, brand: "Chevrolet" },
  { title: "Palio 1.0 Mpi Fire 8v Flex 4p Manual", price: "R$ 22.900", price_value: 22900, image_url: null, url: "#4", dealer_name: "ZM Veículos", year: 2008, km: 180000, brand: "Fiat" },
  { title: "Toro 2.4 16v Multiair Flex Volcano At9", price: "R$ 98.900", price_value: 98900, image_url: null, url: "#5", dealer_name: "ZM Veículos", year: 2018, km: 72000, brand: "Fiat" },
  { title: "Fiesta 1.6 Mpi Hatch 8v Flex 4p Manual", price: "R$ 31.900", price_value: 31900, image_url: null, url: "#6", dealer_name: "ZM Veículos", year: 2013, km: 110000, brand: "Ford" },
  { title: "HR-V 1.8 16v Flex Ex 4p Automático", price: "R$ 84.900", price_value: 84900, image_url: null, url: "#7", dealer_name: "ZM Veículos", year: 2017, km: 68000, brand: "Honda" },
  { title: "HB20 1.0 Comfort Plus 12v Flex 4p Manual", price: "R$ 43.900", price_value: 43900, image_url: null, url: "#8", dealer_name: "ZM Veículos", year: 2015, km: 95000, brand: "Hyundai" },
  { title: "Gla 200 1.6 Cgi Advance 16v Turbo Flex 4p Automático", price: "R$ 98.900", price_value: 98900, image_url: null, url: "#9", dealer_name: "ZM Veículos", year: 2016, km: 78000, brand: "Mercedes-Benz" },
  { title: "Cooper 1.5 12v Turbo Gasolina 4p Automático", price: "R$ 85.900", price_value: 85900, image_url: null, url: "#10", dealer_name: "ZM Veículos", year: 2017, km: 58000, brand: "Outras" },
  { title: "Logan 1.6 Expression 16v Flex 4p Automático", price: "R$ 28.900", price_value: 28900, image_url: null, url: "#11", dealer_name: "ZM Veículos", year: 2014, km: 120000, brand: "Renault" },
  { title: "Tiguan 2.0 350 Tsi Gasolina Allspace R-Line", price: "R$ 148.900", price_value: 148900, image_url: null, url: "#12", dealer_name: "ZM Veículos", year: 2019, km: 52000, brand: "Volkswagen" },
  // Carros mockados extras para enriquecer a busca e filtros offline
  { title: "Corolla 2.0 Xei 16v Flex 4p Automático", price: "R$ 94.900", price_value: 94900, image_url: null, url: "#13", dealer_name: "AMF Veículos", year: 2018, km: 60000, brand: "Toyota" },
  { title: "Golf 1.4 Tsi Highline DSG 4p Gasolina", price: "R$ 78.500", price_value: 78500, image_url: null, url: "#14", dealer_name: "AMF Veículos", year: 2015, km: 90000, brand: "Volkswagen" },
  { title: "Onix 1.0 Turbo Ltz Flex Automático", price: "R$ 72.900", price_value: 72900, image_url: null, url: "#15", dealer_name: "Savinho Motors", year: 2021, km: 38000, brand: "Chevrolet" },
  { title: "Compass 2.0 Flex Longitude Automático", price: "R$ 109.900", price_value: 109900, image_url: null, url: "#16", dealer_name: "Savinho Motors", year: 2019, km: 55000, brand: "Jeep" },
  { title: "Renegade 1.8 Flex Sport Automático", price: "R$ 76.900", price_value: 76900, image_url: null, url: "#17", dealer_name: "Savinho Motors", year: 2018, km: 67000, brand: "Jeep" },
  { title: "Sandero 1.6 Stepway Flex Manual", price: "R$ 45.900", price_value: 45900, image_url: null, url: "#18", dealer_name: "GL Veículos", year: 2016, km: 85000, brand: "Renault" }
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET." });
  }

  const {
    dealer,
    brand,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    minKm,
    maxKm,
    search,
    sort,
    limit,
    offset
  } = req.query || {};

  const limitVal = parseInt(limit || 24, 10);
  const offsetVal = parseInt(offset || 0, 10);

  // ── Cenário Offline (Sem Supabase) ────────────────────────────────────────
  if (!supabase) {
    console.log("[Estoque Geral] Supabase indisponível. Usando dados mockados offline.");
    let filteredCars = [...OFFLINE_CARS];

    // Aplica filtros em memória
    if (dealer) {
      filteredCars = filteredCars.filter(c => c.dealer_name.toLowerCase() === dealer.toLowerCase());
    }
    if (brand) {
      filteredCars = filteredCars.filter(c => c.brand.toLowerCase() === brand.toLowerCase());
    }
    if (minPrice) {
      filteredCars = filteredCars.filter(c => c.price_value >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filteredCars = filteredCars.filter(c => c.price_value <= parseFloat(maxPrice));
    }
    if (minYear) {
      filteredCars = filteredCars.filter(c => c.year >= parseInt(minYear, 10));
    }
    if (maxYear) {
      filteredCars = filteredCars.filter(c => c.year <= parseInt(maxYear, 10));
    }
    if (minKm) {
      filteredCars = filteredCars.filter(c => (c.km || 0) >= parseInt(minKm, 10));
    }
    if (maxKm) {
      filteredCars = filteredCars.filter(c => (c.km || 0) <= parseInt(maxKm, 10));
    }
    if (search) {
      const q = search.toLowerCase();
      filteredCars = filteredCars.filter(c => c.title.toLowerCase().includes(q));
    }

    // Ordenação em memória
    if (sort === "price_asc") {
      filteredCars.sort((a, b) => a.price_value - b.price_value);
    } else if (sort === "price_desc") {
      filteredCars.sort((a, b) => b.price_value - a.price_value);
    } else if (sort === "year_desc") {
      filteredCars.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === "km_asc") {
      filteredCars.sort((a, b) => (a.km || 0) - (b.km || 0));
    }

    const total = filteredCars.length;
    const paginated = filteredCars.slice(offsetVal, offsetVal + limitVal);

    return res.status(200).json({
      results: paginated,
      total,
      hasMore: (offsetVal + paginated.length) < total,
      offline: true
    });
  }

  // ── Cenário Online (Com Supabase) ─────────────────────────────────────────
  try {
    // 1. Busca no Estoque Próprio (tabela carros)
    let ownStockData = [];
    if (offsetVal === 0) {
      let carrosQuery = supabase.from("carros").select("*").eq("ativo", true);
      
      if (brand) carrosQuery = carrosQuery.ilike("marca", `%${brand}%`);
      if (minPrice) carrosQuery = carrosQuery.gte("preco", parseFloat(minPrice));
      if (maxPrice) carrosQuery = carrosQuery.lte("preco", parseFloat(maxPrice));
      if (minYear) carrosQuery = carrosQuery.gte("ano", parseInt(minYear, 10));
      if (maxYear) carrosQuery = carrosQuery.lte("ano", parseInt(maxYear, 10));
      if (minKm) carrosQuery = carrosQuery.gte("quilometragem", parseInt(minKm, 10));
      if (maxKm) carrosQuery = carrosQuery.lte("quilometragem", parseInt(maxKm, 10));
      if (search) {
        // Busca textual no modelo ou marca
        carrosQuery = carrosQuery.or(`modelo.ilike.%${search}%,marca.ilike.%${search}%`);
      }
      
      const { data: carrosResult, error: carrosError } = await carrosQuery;
      if (!carrosError && carrosResult) {
        // Mapear para o formato de vehicles
        ownStockData = carrosResult.map(c => ({
          url: c.url_externo || `#meu-estoque-${c.id}`,
          title: `${c.marca} ${c.modelo}`,
          price: `R$ ${c.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          price_value: c.preco,
          image_url: c.imagem_url,
          dealer_name: c.fonte || "Meu Estoque",
          year: c.ano,
          km: c.quilometragem,
          brand: c.marca,
          updated_at: c.updated_at,
          is_own_stock: true // Flag para o frontend destacar
        }));
      }
    }

    // 2. Busca no Estoque Geral (tabela vehicles)
    let queryBuilder = supabase.from("vehicles").select("*", { count: "exact" });

    // Aplica filtros dinâmicos
    if (dealer) {
      queryBuilder = queryBuilder.eq("dealer_name", dealer);
    }
    if (brand) {
      queryBuilder = queryBuilder.eq("brand", brand);
    }
    if (minPrice) {
      queryBuilder = queryBuilder.gte("price_value", parseFloat(minPrice));
    }
    if (maxPrice) {
      queryBuilder = queryBuilder.lte("price_value", parseFloat(maxPrice));
    }
    if (minYear) {
      queryBuilder = queryBuilder.gte("year", parseInt(minYear, 10));
    }
    if (maxYear) {
      queryBuilder = queryBuilder.lte("year", parseInt(maxYear, 10));
    }
    if (minKm) {
      queryBuilder = queryBuilder.gte("km", parseInt(minKm, 10));
    }
    if (maxKm) {
      queryBuilder = queryBuilder.lte("km", parseInt(maxKm, 10));
    }
    if (search) {
      queryBuilder = queryBuilder.ilike("title", `%${search}%`);
    }

    // Ordenação
    if (sort === "price_asc") {
      queryBuilder = queryBuilder.order("price_value", { ascending: true });
    } else if (sort === "price_desc") {
      queryBuilder = queryBuilder.order("price_value", { ascending: false });
    } else if (sort === "year_desc") {
      queryBuilder = queryBuilder.order("year", { ascending: false, nullsFirst: false });
    } else if (sort === "km_asc") {
      queryBuilder = queryBuilder.order("km", { ascending: true, nullsFirst: false });
    } else {
      queryBuilder = queryBuilder.order("updated_at", { ascending: false });
    }

    // Paginação
    queryBuilder = queryBuilder.range(offsetVal, offsetVal + limitVal - 1);

    const { data, count, error } = await queryBuilder;

    if (error) throw error;

    // Mesclar resultados
    const mergedResults = [...ownStockData, ...(data || [])];

    return res.status(200).json({
      results: mergedResults,
      total: (count || 0) + ownStockData.length,
      hasMore: (offsetVal + (data ? data.length : 0)) < (count || 0)
    });
  } catch (err) {
    console.error("[Estoque Geral] Erro ao consultar banco:", err.message);
    return res.status(500).json({ error: "Erro ao consultar estoque geral do banco de dados." });
  }
};
