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
        'User-Agent': 'Mozilla/5.0'
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

async function getFipePrice(brandName, modelName, version, year) {
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
      const versionWords = version.toLowerCase().split(' ').filter(v => v.length > 0 && v !== 'hatch' && v !== 'sedan');
      searchTerms.push(...versionWords);
    }
    
    let possibleModels = [];
    for (const m of modelos) {
      const mNameLower = m.Label.toLowerCase();
      // Checa se o nome FIPE contém TODOS os termos buscados
      if (searchTerms.every(term => mNameLower.includes(term))) {
        possibleModels.push(m);
      }
    }

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
