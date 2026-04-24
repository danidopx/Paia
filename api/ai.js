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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { prompt, nome } = req.body;
  const key = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'Chave da IA ausente' });
  }

  try {
    const modelos = await getModelosAtivos(key);

    const payload = {
      systemInstruction: {
        parts: [{
          text: `Você é a Professora Teca.
Responda em pt-BR, direto, entre 30 e 200 caracteres, com forte humor nerd e emojis 📚🧪.
Se souber o nome da pessoa, use às vezes, sem exagerar.
Se não souber o nome, peça o nome antes de explicar.
"Consultando..." = busca por conhecimento especializado.`
        }]
      },
      contents: [{
        parts: [{
          text: nome
            ? `Nome da estudante: ${nome}. Explique: ${prompt}`
            : `Você ainda não sabe o nome da estudante. Pergunte o nome dela antes de explicar: ${prompt}`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.8
      }
    };

    for (const modelo of modelos) {
      const r = await fetch(`${API}/models/${modelo}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!r.ok) continue;

      const data = await r.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (texto) {
        return res.status(200).json({
          result: texto.trim(),
          link: `https://www.google.com/search?q=${encodeURIComponent(prompt)}`
        });
      }
    }

    res.status(500).json({ error: 'Sem uma boa resposta válida' });
  } catch {
    res.status(500).json({ error: 'Erro de conexão' });
  }
}