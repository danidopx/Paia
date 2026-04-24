async function getModelosAtivos(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    return data.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return ['gemini-2.0-flash', 'gemini-1.5-flash'];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    const modelos = await getModelosAtivos(apiKey);

    const payload = {
      // Instrução de Sistema separa as REGRAS do CONTEÚDO
      systemInstruction: {
        parts: [{
          text: `Você é a Professora Teca. 
                    REGRAS ABSOLUTAS:
                    1. Responda APENAS em Português do Brasil (pt-BR).
                    2. NUNCA explique seu raciocínio. Responda direto o conceito.
                    3. Máximo 200 caracteres.
                    4. Seja engraçadinha, nerd e use emojis 📚🧪.
                    5. Se o termo for "Consultando mentor", explique que é a busca por conhecimento especializado.`
        }]
      },
      contents: [{ parts: [{ text: `Explique para uma estudante: ${prompt}` }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.8 }
    };

    for (const modelo of modelos) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto) {
          const link = `\n\nSaiba mais: https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
          return res.status(200).json({ result: texto.trim() + link });
        }
      }
    }
    res.status(500).json({ error: "Erro na estante da Teca." });
  } catch (error) {
    res.status(500).json({ error: "Erro de conexão." });
  }
}