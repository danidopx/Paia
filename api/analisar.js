export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { activity, response } = req.body; // response: { texto, imagemBase64 }

    const buildPrompt = (activity, response) => {
      // instruções rígidas para saída JSON conforme especificação do usuário
      return `[SISTEMA_AVALIACAO]\n\nVoce é um avaliador técnico. Temperatura=0.\nRetorne SOMENTE um JSON válido com a estrutura exata descrita abaixo (nenhum texto extra):\n\n{\n  "avaliacao_tecnica": [{ "criterio": "nome","nota": 0-5,"justificativa": "texto objetivo" }],\n  "nota_final": 0-5,\n  "camada_educacional": { "explicacao": "texto curto","como_melhorar": ["acao 1","acao 2"] },\n  "camada_gamificada": { "nivel": "iniciante|básico|intermediário|avançado|especialista","progresso_percentual": 0-100,"feedback_curto": "max 120 caracteres" }\n}\n\nREGRAS: temperatura 0; avalie criterios fixos (se presente use evidencias); escala fixa 0..5; nao inventar dados; penalizar ausencia (max 2); nao compensar criterios.\n\nACTIVITY: ${JSON.stringify(activity)}\nRESPONSE: ${JSON.stringify(response || {})}\n\nRetorne o JSON sem explicacoes.`;
    };

    const prompt = buildPrompt(activity || {}, response || {});

    // Chama o endpoint interno /api/ai para delegar a geração ao provedor configurado
    const r = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, nome: 'admin', preferredModels: [] })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(500).json({ error: 'Falha ao chamar IA', detail: txt });
    }

    const data = await r.json();
    if (!data.result) return res.status(500).json({ error: 'Resposta IA vazia', raw: data });

    // Tentar limpar e parsear JSON retornado
    let jsonStr = data.result.toString().trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsed;
    try { parsed = JSON.parse(jsonStr); }
    catch (e) {
      return res.status(500).json({ error: 'Falha ao parsear JSON da IA', raw: jsonStr });
    }

    return res.status(200).json({ evaluation: parsed, raw: data.result });

  } catch (err) {
    console.error('[analisar] erro', err);
    return res.status(500).json({ error: 'Erro interno ao processar avaliação' });
  }
}