// api/lib/webhook-utils.js
//
// Utilitários para envio de alertas automatizados via Webhook (Discord/Slack)
// disparados quando algum scraper falha.
//

/**
 * Envia um alerta formatado para o Webhook configurado em process.env.MONITOR_WEBHOOK_URL.
 * Detecta automaticamente se o webhook é do Discord ou do Slack e adapta o payload.
 *
 * @param {string} storeName - Nome da revenda que falhou
 * @param {string} errorMessage - Mensagem de erro capturada
 * @param {string} context - Contexto do erro (ex: "Busca" ou "Health Check")
 */
async function sendWebhookAlert(storeName, errorMessage, context = "Busca") {
  const url = process.env.MONITOR_WEBHOOK_URL;
  if (!url) {
    // Sem webhook configurado, apenas registra nos logs locais do servidor
    console.warn(`[Monitoramento] Webhook não configurado. Erro em '${storeName}': ${errorMessage}`);
    return;
  }

  let payload = {};

  if (url.includes("discord.com")) {
    // Formato rico para Discord
    payload = {
      embeds: [{
        title: "🚨 Falha Detectada no Scraper — AutoBusca",
        color: 15158332, // Vermelho
        fields: [
          { name: "Revenda/Loja", value: storeName, inline: true },
          { name: "Contexto", value: context, inline: true },
          { name: "Mensagem de Erro", value: `\`\`\`${errorMessage.slice(0, 500)}\`\`\`` }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "AutoBusca Monitor"
        }
      }]
    };
  } else if (url.includes("slack.com")) {
    // Formato rico para Slack
    payload = {
      text: `🚨 *Falha Detectada no Scraper — AutoBusca*\n*Revenda/Loja:* ${storeName}\n*Contexto:* ${context}\n*Mensagem de Erro:* \`${errorMessage.slice(0, 500)}\``
    };
  } else {
    // Formato genérico de texto
    payload = {
      text: `[AutoBusca Alert] O scraper "${storeName}" falhou no contexto "${context}". Detalhes do erro: ${errorMessage}`
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error(`[Monitoramento] Erro ao enviar webhook (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[Monitoramento] Exceção ao enviar dados ao webhook:`, err.message || err);
  }
}

module.exports = { sendWebhookAlert };
