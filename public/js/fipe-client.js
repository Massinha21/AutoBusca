// fipe-client.js
// Responsável por buscar FIPE pelo Front-end usando o fipe-proxy (Edge Cache)
class FipeClient {
  constructor() {
    this.brandsCache = null;
    this.modelsCache = {};
    this.anosCache = {};
    this.priceCache = {};
    // Fila para não sobrecarregar o navegador/proxy ao buscar muitos de uma vez
    this.fetchQueue = Promise.resolve();
  }

  async fetchProxy(path) {
    await new Promise(r => setTimeout(r, 250)); // Throttling: máximo 4 requests por segundo
    const url = `https://parallelum.com.br/fipe/api/v1${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  }

  async getPrice(brandName, modelName, version, year) {
    if (!year || !brandName || !modelName) return null;
    
    // Ano string como "2024/2025" -> 2024
    const yearMatch = String(year).match(/\d{4}/);
    if (!yearMatch) return null;
    const parsedYear = parseInt(yearMatch[0]);
    if (parsedYear < 1990) return null;

    try {
      if (!this.brandsCache || !Array.isArray(this.brandsCache)) {
        const brandsRes = await this.fetchProxy('/carros/marcas');
        if (!Array.isArray(brandsRes)) return null; // API retornou erro (rate limit)
        this.brandsCache = brandsRes;
      }

      let targetBrand = brandName.toLowerCase();
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

      if (modelToBrand[targetBrand]) targetBrand = modelToBrand[targetBrand];
      if (modelToBrand[baseModel]) targetBrand = modelToBrand[baseModel];

      const brandMatch = this.brandsCache.find(b => 
        b.nome.toLowerCase().includes(targetBrand) || 
        (targetBrand === 'chevrolet' && b.nome.toLowerCase() === 'gm - chevrolet')
      );
      
      if (!brandMatch) return null;
      const brandId = brandMatch.codigo;

      if (!this.modelsCache[brandId]) {
        const data = await this.fetchProxy(`/carros/marcas/${brandId}/modelos`);
        if (!data || !Array.isArray(data.modelos)) return null;
        this.modelsCache[brandId] = data.modelos;
      }
      const modelos = this.modelsCache[brandId];
      if (!Array.isArray(modelos)) return null;

      const searchTerms = [baseModel];
      if (version) {
        const versionWords = version.toLowerCase().split(' ').filter(v => v.length > 0 && v !== 'hatch' && v !== 'sedan');
        searchTerms.push(...versionWords);
      }

      const scoredModels = modelos.map(m => {
        const mNameLower = m.nome.toLowerCase();
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
        .filter(sm => sm.score >= 10) // Exige que no mínimo o nome base (ex: Onix) bata
        .sort((a, b) => b.score - a.score)
        .map(sm => sm.model)
        .slice(0, 10); // Pega os 10 mais prováveis

      if (possibleModels.length === 0) return null;

      for (const model of possibleModels) {
        if (!this.anosCache[model.codigo]) {
          this.anosCache[model.codigo] = await this.fetchProxy(`/carros/marcas/${brandId}/modelos/${model.codigo}/anos`);
        }
        const anosList = this.anosCache[model.codigo];
        
        if (Array.isArray(anosList)) {
          const yearMatchItem = anosList.find(a => String(a.codigo).startsWith(parsedYear.toString()));
          if (yearMatchItem) {
            const cacheKey = `${model.codigo}-${yearMatchItem.codigo}`;
            if (!this.priceCache[cacheKey]) {
              const data = await this.fetchProxy(`/carros/marcas/${brandId}/modelos/${model.codigo}/anos/${yearMatchItem.codigo}`);
              if (data && data.Valor) {
                this.priceCache[cacheKey] = {
                  priceStr: data.Valor,
                  fipeModel: data.Modelo
                };
              } else {
                continue; // Erro na API ou modelo não encontrado
              }
            }
            return this.priceCache[cacheKey];
          }
        }
      }
      return null;
    } catch (e) {
      console.warn("Erro no fipe-client:", e);
      return null;
    }
  }

  // Enriquece o carro e atualiza o DOM async
  async enrichCarUI(car, cardElement) {
    if (car.fipe_price_str) return; // Ja tem fipe (Facebook)

    let release;
    const p = new Promise(r => { release = r; });
    const previousQueue = this.fetchQueue;
    this.fetchQueue = this.fetchQueue.then(() => p);
    await previousQueue;

    try {
      const brandName = car.title.split(' ')[0];
      const fipeData = await this.getPrice(brandName, car.title, car.version, car.year);
      if (fipeData && fipeData.priceStr) {
        car.fipe_price_str = fipeData.priceStr;
        car.fipe_model_name = fipeData.fipeModel;
        const numValue = parseFloat(fipeData.priceStr.replace(/[R$\s\.]/g, '').replace(',', '.'));
        car.fipe_price_value = numValue;

        // Atualiza a UI se o card Elemento foi providenciado
        if (cardElement) {
          this.updateCardUI(car, cardElement);
        }
      }
    } finally {
      // 50ms delay para não espancar o proxy
      await new Promise(r => setTimeout(r, 50));
      release();
    }
  }

  updateCardUI(car, cardElement) {
    const body = cardElement.querySelector('.car-body');
    if (!body) return;
    
    // Removemos placeholders ou badges antigos se existirem
    const existingBadge = body.querySelector('.fipe-badge, .fipe-card-badge, .fipe-placeholder');
    if (existingBadge) {
       existingBadge.remove();
    }

    const fipeNome = car.fipe_model_name || '';
    const fipePriceStr = car.fipe_price_str || '';
    
    // Função helper simplificada escapeHtml
    const escapeHtml = (unsafe) => {
      if (!unsafe) return "";
      return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    let badgeHtml = "";
    if (car.fipe_price_value && car.price_value) {
      const diff = car.price_value - car.fipe_price_value;
      const isBelow = diff < 0;
      const absDiff = Math.abs(diff);
      const formattedDiff = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(absDiff);
      const percentStr = `${Math.abs((diff / car.fipe_price_value) * 100).toFixed(1)}%`;
      
      badgeHtml = `
        <div class="fipe-card-badge ${isBelow ? 'below' : 'above'}" title="Preço do anúncio vs FIPE: ${fipeNome}">
          ${isBelow ? '▼' : '▲'} ${formattedDiff} (${percentStr}) ${isBelow ? 'abaixo' : 'acima'} da FIPE
        </div>
      `;
    }

    const fipeHtml = `
      <div class="fipe-info-container fipe-async-badge" style="margin-top: 10px; background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 6px; font-size: 0.8rem; border-left: 3px solid #3b82f6; display: flex; flex-direction: column; gap: 4px;">
        <div style="color: #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
           <span>Tabela FIPE:</span> <strong>${fipePriceStr}</strong>
        </div>
        <div style="font-size: 0.75rem; line-height: 1.3; margin-top: 2px;">
          <a href="https://veiculos.fipe.org.br/" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 500;" title="Ir para o site oficial da FIPE">
            ${escapeHtml(fipeNome)} ↗
          </a>
        </div>
        ${badgeHtml}
      </div>
    `;

    // Injeta antes de car-actions-row
    const actionsRow = body.querySelector('.car-actions-row');
    if (actionsRow) {
      actionsRow.insertAdjacentHTML('beforebegin', fipeHtml);
    } else {
      body.insertAdjacentHTML('beforeend', fipeHtml);
    }
  }
}

window.FipeClient = new FipeClient();
