const API = 'https://generativelanguage.googleapis.com/v1beta';

async function getModelosAtivos(key) {
  try {
    const { models } = await fetch(`${API}/models?key=${key}`).then(r => r.json());
    return models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
  } catch {
    return ['gemini-2.0-flash'];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  const key = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    const modelos = await getModelosAtivos(key);

    const payload = {
      systemInstruction: {
        parts: [{
          text: `Você é a Professora Teca.
Responda em pt-BR, direto, máx 200 caracteres, e não menos que 30 caracteres, com FORTE humor nerd e emojis 📚🧪.
"Consultando..." = busca por conhecimento especializado.`
        }]
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.8 }
    };

    for (const m of modelos) {
      const r = await fetch(`${API}/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!r.ok) continue;

      const t = (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) {
        return res.status(200).json({
          result: t.trim(),
          link: `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
        });
      }
    }

    res.status(500).json({ error: 'Sem uma boa resposta válida' });
  } catch {
    res.status(500).json({ error: 'Erro de conexão' });
  }
}