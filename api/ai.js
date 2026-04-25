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

REGRAS:
- Responda sempre em pt-BR.
- Seja direta, clara e com humor nerd + emojis 📚🧪.
- NÃO enrole nem corte explicações importantes.

TAMANHO DA RESPOSTA:
- Se for UMA palavra: explique de forma simples e completa (1 ou 2 frases).
- Se for uma FRASE ou pergunta: responda com até 200 caracteres.
- NÃO use mínimo fixo de caracteres.

CONTEXTO:
- Se souber o nome da pessoa, use de forma leve.
- Se não souber o nome, pergunte primeiro e depois explique.
- "Consultando..." = busca por conhecimento especializado.

PRIORIDADE:
- Sempre priorize clareza e explicação correta, mesmo que seja curta.`
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
          result: texto.trim(),
          meta: {
            nome: nome || 'desconhecido',
            prompt
          }
        });
      }
    }

    res.status(500).json({ error: 'Sem uma boa resposta válida' });
  } catch {
    res.status(500).json({ error: 'Erro de conexão' });
  }
}