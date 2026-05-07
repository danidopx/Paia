const { runAiRequest } = require('./ai-core');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { action, prompt, nome, preferredModels } = req.body || {};
    const result = await runAiRequest({
      action,
      prompt,
      nome,
      preferredModels,
      env: process.env,
    });

    if (!result.ok) {
      return res.status(result.status || 500).json(result.body || { error: 'Erro desconhecido' });
    }

    if (action === 'listModels') {
      return res.status(result.status || 200).json(result.body);
    }

    return res.status(200).json({
      result: result.result,
      meta: result.meta,
    });
  } catch (e) {
    console.error('[ai] erro', e);
    return res.status(500).json({
      error: 'Erro interno ao processar IA',
      detail: e && e.message ? e.message : String(e),
    });
  }
};
