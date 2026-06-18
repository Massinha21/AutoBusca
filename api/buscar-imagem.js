// api/buscar-imagem.js
//
// Endpoint que recebe uma imagem em Base64 e seu tipo MIME,
// envia para a API do Gemini para identificar a marca/modelo do veículo,
// e retorna como texto simples para busca.

module.exports = async function handler(req, res) {
  // CORS & Method Check
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { image, mimeType } = req.body;
    
    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Os campos "image" (base64) e "mimeType" são obrigatórios.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não encontrada no ambiente. Retornando mock do Honda Civic.");
      // Simula latência de rede/processamento
      await new Promise(resolve => setTimeout(resolve, 1800));
      return res.status(200).json({ 
        query: 'Honda Civic',
        mocked: true,
        message: 'Chave GEMINI_API_KEY não configurada. Usando resposta simulada.'
      });
    }

    // Chamada direta à API REST do Gemini 1.5 Flash (ideal para análise rápida de mídia)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = "Identifique a marca e o modelo exato do carro contido nesta imagem. " +
                       "Retorne APENAS a marca e modelo em formato de texto simples (ex: 'Honda Civic' ou 'Toyota Corolla' ou 'Hyundai HB20'). " +
                       "Não inclua nenhuma outra palavra, pontuação, explicações, aspas ou marcação markdown. " +
                       "Seja direto e conciso.";

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: image
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro da API do Gemini (status ${response.status}):`, errorText);
      throw new Error(`API do Gemini retornou erro ${response.status}`);
    }

    const data = await response.json();
    const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedQuery = modelText.trim().replace(/['"`]/g, '');

    if (!cleanedQuery) {
      throw new Error("Não foi possível identificar o veículo do upload.");
    }

    console.log(`Sucesso! Veículo identificado: "${cleanedQuery}"`);
    return res.status(200).json({ query: cleanedQuery });

  } catch (error) {
    console.error("Erro interno no processamento da imagem:", error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
};
