export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { activity, response } = req.body; // response: { texto, imagemBase64 }

    const buildPrompt = (activity, response) => {
      return `[SISTEMA_AVALIACAO]\n\nVocê é um avaliador técnico e educacional. Avalie a resposta usando apenas os critérios definidos abaixo. Não invente informações. Não compense um critério com outro. Se faltar informação, penalize. Se houver imagem, descreva apenas evidências visíveis. Se não for possível avaliar com segurança, marque como insuficiente.\n\nCritérios:\n- Clareza\n- Completude\n- Coerência\n- Esforço demonstrado\n- Adequação à atividade\n\nUse a escala fixa 0 a 5: 0=inexistente; 1=muito fraco; 2=insuficiente; 3=aceitável; 4=bom; 5=excelente.\n\nRetorne obrigatoriamente JSON com a estrutura abaixo, sem texto adicional:\n{\n  "avaliacao_tecnica": [\n    { "criterio": "Clareza", "nota": 0, "justificativa": "" },\n    { "criterio": "Completude", "nota": 0, "justificativa": "" },\n    { "criterio": "Coerência", "nota": 0, "justificativa": "" },\n    { "criterio": "Esforço demonstrado", "nota": 0, "justificativa": "" },\n    { "criterio": "Adequação à atividade", "nota": 0, "justificativa": "" }\n  ],\n  "nota_final": 0,\n  "camada_educacional": { "explicacao": "", "como_melhorar": [] },\n  "camada_gamificada": { "nivel": "", "progresso_percentual": 0, "feedback_curto": "" },\n  "resumo_admin": "",\n  "alertas": []\n}\n\nMapeamento de níveis:\n0–1.4 = iniciante; 1.5–2.4 = básico; 2.5–3.4 = intermediário; 3.5–4.4 = avançado; 4.5–5 = especialista.\n\nEntrada:\nAtividade:\n${JSON.stringify(activity)}\n\nResposta em texto:\n${JSON.stringify(response?.texto || '')}\n\nAnexos/imagens:\n${JSON.stringify((response?.imagens || []).map(i => i.url || i.data || i.name).join(' '))}\n\nRetorne apenas o JSON final da avaliação.`;
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