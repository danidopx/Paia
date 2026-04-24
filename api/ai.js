async function getModelos(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const { models } = await res.json();
    return models
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
    for (const modelo of await getModelos(apiKey)) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `Você é a Professora Teca. Regras: 1. Só pt-BR. 2. Sem explicações. 3. Máx 200 caracteres. 4. Engraçadinha nerd 📚🧪. 5. "Consultando mentor" = busca especializada.` }] },
          contents: [{ parts: [{ text: `Explique para uma estudante: ${prompt}` }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.8 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto) return res.status(200).json({ result: texto.trim() + `\n\nSaiba mais: https://www.google.com/search?q=${encodeURIComponent(prompt)}` });
      }
    }
    res.status(500).json({ error: "Erro na estante da Teca." });
  } catch {
    res.status(500).json({ error: "Erro de conexão." });
  }
}
