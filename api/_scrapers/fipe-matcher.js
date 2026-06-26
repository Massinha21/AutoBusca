/**
 * Módulo para buscar o valor na Tabela FIPE com base no Modelo, Versão e Ano.
 * Utiliza a API OFICIAL veiculos.fipe.org.br.
 */

let brandsCache = null;
let modelsCache = {};
let anosCache = {};
let priceCache = {};
let tabelaReferenciaCache = null;

async function getTabelaReferencia() {
  if (tabelaReferenciaCache) return tabelaReferenciaCache;
  try {
    const res = await fetch('https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://veiculos.fipe.org.br/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      tabelaReferenciaCache = data[0].Codigo;
      return tabelaReferenciaCache;
    }
  } catch (e) {
    console.log(`[FIPE Oficial] Erro ao buscar tabela de referência: ${e.message}`);
  }
  return 310; // Fallback para Junho de 2024 caso falhe
}

// Mutex global para serializar requisições à FIPE e evitar erro 429
let fipeMutex = Promise.resolve();

async function getFipePrice(brandName, modelName, version, year) {
  let release;
  const acquire = new Promise(r => { release = r; });
  const currentMutex = fipeMutex;
  
  // O próximo a pedir o mutex vai ter que esperar o nosso acquire resolver
  fipeMutex = currentMutex.then(() => acquire).catch(() => acquire);
  
  // Aguarda a nossa vez (aguarda o mutex anterior terminar)
  await currentMutex;
  
  try {
    return await _getFipePrice(brandName, modelName, version, year);
  } finally {
    // Adiciona um pequeno delay de 100ms antes de liberar para o próximo
    await new Promise(r => setTimeout(r, 100));
    release();
  }
}

async function _getFipePrice(brandName, modelName, version, year) {
  try {
    const tabelaRef = await getTabelaReferencia();

    // 1. Usa a lista estática de marcas da FIPE Oficial
    if (!brandsCache) {
      brandsCache = [
        { codigo: '21', nome: 'Fiat' }, { codigo: '22', nome: 'Ford' }, { codigo: '23', nome: 'GM - Chevrolet' },
        { codigo: '25', nome: 'Honda' }, { codigo: '26', nome: 'Hyundai' }, { codigo: '129', nome: 'Jeep' },
        { codigo: '43', nome: 'Nissan' }, { codigo: '48', nome: 'Renault' }, { codigo: '56', nome: 'Toyota' },
        { codigo: '59', nome: 'VW - VolksWagen' }, { codigo: '7', nome: 'BMW' }, { codigo: '13', nome: 'Citroën' },
        { codigo: '31', nome: 'Land Rover' }, { codigo: '39', nome: 'Mercedes-Benz' }, { codigo: '41', nome: 'Mitsubishi' },
        { codigo: '47', nome: 'Porsche' }, { codigo: '44', nome: 'Peugeot' }, { codigo: '2', nome: 'Audi' }, { codigo: '58', nome: 'Volvo' }
      ];
    }
    const brands = brandsCache;
    
    let targetBrand = brandName.toLowerCase();
    
    // Mapeamento interno para marcas que podem vir faltando no título do anúncio
    const modelToBrand = {
      'onix': 'chevrolet', 'tracker': 'chevrolet', 'cruze': 'chevrolet', 'spin': 'chevrolet', 's10': 'chevrolet', 'prisma': 'chevrolet',
      'hb20': 'hyundai', 'hb20s': 'hyundai', 'creta': 'hyundai', 'tucson': 'hyundai',
      'compass': 'jeep', 'renegade': 'jeep', 'commander': 'jeep',
      'corolla': 'toyota', 'hilux': 'toyota', 'yaris': 'toyota', 'sw4': 'toyota',
      'civic': 'honda', 'hr-v': 'honda', 'fit': 'honda', 'city': 'honda',
      'gol': 'volkswagen', 'polo': 'volkswagen', 'nivus': 'volkswagen', 't-cross': 'volkswagen', 'saveiro': 'volkswagen', 'jetta': 'volkswagen',
      'argo': 'fiat', 'mobi': 'fiat', 'strada': 'fiat', 'toro': 'fiat', 'pulse': 'fiat', 'fastback': 'fiat',
      'kicks': 'nissan', 'versa': 'nissan', 'frontier': 'nissan', 'sentra': 'nissan', 'march': 'nissan'
    };

    const cleanModelName = modelName.toLowerCase().replace(/chevrolet|fiat|ford|vw|volkswagen|hyundai|toyota|honda|nissan|jeep|renault/gi, '').trim();
    const baseModel = cleanModelName.split(' ')[0];
    
    // Se o targetBrand for um modelo conhecido (ex: 'onix'), traduz para a marca
    if (modelToBrand[targetBrand]) {
      targetBrand = modelToBrand[targetBrand];
    }
    
    if (modelToBrand[baseModel]) {
      targetBrand = modelToBrand[baseModel];
    }

    const brandMatch = brands.find(b => b.nome.toLowerCase().includes(targetBrand));
    if (!brandMatch) {
      console.log(`[FIPE Oficial] Marca não encontrada na lista: ${targetBrand}`);
      return null;
    }
    const brandId = brandMatch.codigo;

    // 2. Tenta fazer um fetch dos modelos da marca
    if (!modelsCache[brandId]) {
      const modelsRes = await fetch('https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://veiculos.fipe.org.br/', 'User-Agent': 'Mozilla/5.0' },
        body: `codigoTabelaReferencia=${tabelaRef}&codigoTipoVeiculo=1&codigoMarca=${brandId}`
      });
      
      if (!modelsRes.ok) {
        console.log(`[FIPE Oficial] Erro HTTP ao buscar modelos: ${modelsRes.status}`);
        return null;
      }
      
      const modelsData = await modelsRes.json();
      modelsCache[brandId] = modelsData.Modelos || [];
    }
    
    const modelos = modelsCache[brandId];
    
    // Procura o modelo que mais combina com o nome e versão
    const searchTerms = [baseModel];
    if (version) {
      const versionWords = version.toLowerCase().replace(/[^a-z0-9\s\.]/g, ' ').split(/\s+/).filter(w => w.length > 0 && w !== baseModel && w !== targetBrand);
      searchTerms.push(...versionWords);
    }
    
    // Se não achou NENHUMA palavra indicando versão, motor, etc, consideramos Inconclusivo
    if (searchTerms.length === 1) {
      return { inconclusive: true };
    }

    const scoredModels = modelos.map(m => {
      const mNameLower = m.Label.toLowerCase();
      let score = 0;
      
      // Peso enorme para o nome base do carro
      if (mNameLower.includes(baseModel)) {
        score += 10;
      }
      
      searchTerms.forEach(term => {
        if (mNameLower.includes(term) && term !== baseModel) score += 2;
        // Partial match pra ajudar com MT, LT, etc
        else if (term.length > 2 && mNameLower.includes(term.substring(0, 3))) score += 1;
      });
      
      return { model: m, score };
    });

    const possibleModels = scoredModels
      .filter(m => m.score > 10) // Exige pelo menos o nome base (10) e algo mais
      .sort((a, b) => b.score - a.score)
      .map(m => m.model);

    if (possibleModels.length === 0) {
      console.log(`[FIPE Oficial] Nenhum modelo encontrado para termos: ${searchTerms.join(', ')}`);
      return null;
    }

    // 3. Tenta achar o modelo que tenha o ano correto
    for (const model of possibleModels) {
      if (!anosCache[model.Value]) {
        const anosRes = await fetch('https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://veiculos.fipe.org.br/', 'User-Agent': 'Mozilla/5.0' },
          body: `codigoTabelaReferencia=${tabelaRef}&codigoTipoVeiculo=1&codigoMarca=${brandId}&codigoModelo=${model.Value}`
        });
        
        if (!anosRes.ok) {
          console.log(`[FIPE Oficial] Erro ao buscar anos para modelo ${model.Value}: ${anosRes.status}`);
          continue;
        }
        
        anosCache[model.Value] = await anosRes.json();
      }

      const anosList = anosCache[model.Value];
      // O codigo oficial de ano geralmente é ex: "2018-1" (1=Gasolina, 3=Diesel)
      const yearMatch = anosList.find(a => a.Value.toString().startsWith(year.toString()));

      if (yearMatch) {
        console.log(`[FIPE Oficial] Match Perfeito: ${model.Label} (Ano ${yearMatch.Label})`);
        
        // 4. Pega o preço final
        const cacheKey = `${model.Value}-${yearMatch.Value}`;
        
        if (!priceCache[cacheKey]) {
          const anoModelo = yearMatch.Value.split('-')[0];
          const codigoTipoCombustivel = yearMatch.Value.split('-')[1];

          const priceRes = await fetch('https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://veiculos.fipe.org.br/', 'User-Agent': 'Mozilla/5.0' },
            body: `codigoTabelaReferencia=${tabelaRef}&codigoTipoVeiculo=1&codigoMarca=${brandId}&codigoModelo=${model.Value}&anoModelo=${anoModelo}&codigoTipoCombustivel=${codigoTipoCombustivel}&tipoConsulta=tradicional`
          });
          
          if (priceRes.ok) {
            priceCache[cacheKey] = await priceRes.json();
          } else {
             priceCache[cacheKey] = { Valor: null };
          }
        }
        
        if (priceCache[cacheKey] && priceCache[cacheKey].Valor) {
          const priceData = priceCache[cacheKey];
          return {
            priceStr: priceData.Valor,
            fipeModel: priceData.Modelo
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[FIPE Oficial] Erro fatal no Matcher:', error);
    return null;
  }
}

module.exports = { getFipePrice };
