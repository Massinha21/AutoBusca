// api/fipe-proxy.js
// Endpoint Serverless que atua como Proxy para a API Oficial da FIPE
// Criado para contornar bloqueios 429 de APIs gratuitas (Parallelum/BrasilAPI)

module.exports = async function handler(req, res) {
  // Configuração rigorosa de CORS para permitir uso no frontend Vercel e Localhost
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, tipo, tabela, marca, modelo, anoCombustivel } = req.query;

  // A FIPE oficial exige chamadas POST via x-www-form-urlencoded com o header Referer correto
  const HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://veiculos.fipe.org.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };

  try {
    let url = "";
    let body = "";

    if (action === "tabelas") {
      url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia";
      body = "";
    } else if (action === "marcas") {
      url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas";
      body = `codigoTabelaReferencia=${tabela}&codigoTipoVeiculo=${tipo}`;
    } else if (action === "modelos") {
      url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos";
      body = `codigoTabelaReferencia=${tabela}&codigoTipoVeiculo=${tipo}&codigoMarca=${marca}`;
    } else if (action === "anos") {
      url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo";
      body = `codigoTabelaReferencia=${tabela}&codigoTipoVeiculo=${tipo}&codigoMarca=${marca}&codigoModelo=${modelo}`;
    } else if (action === "valor") {
      url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros";
      const [ano, comb] = anoCombustivel.split('-');
      body = `codigoTabelaReferencia=${tabela}&codigoTipoVeiculo=${tipo}&codigoMarca=${marca}&codigoModelo=${modelo}&anoModelo=${ano}&codigoTipoCombustivel=${comb}&tipoConsulta=tradicional`;
    } else {
      return res.status(400).json({ error: "Ação inválida" });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: body
    });

    if (!response.ok) {
      throw new Error(`A API FIPE Oficial retornou status ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Fipe Proxy] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
