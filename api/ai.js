async function getMelhoresModelos(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    // Filtra modelos ativos e prioriza as versões mais recentes dinamicamente
    return data.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('vision'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return ['gemini-2.0-flash', 'gemini-1.5-flash']; // Fallback de emergência
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) return res.status(500).json({ error: 'API Key não configurada.' });

    const modelosAtivos = await getMelhoresModelos(apiKey);

    // System Prompt refinado para impedir que a IA descreva o próprio raciocínio
    const systemInstruction = `Aja como a Professora Teca, mentora nerd e engraçada. 
        REPOSTA CURTA (máx 200 caracteres). Use emojis 📚🧪.
        Não explique o que está fazendo, apenas responda o conceito.
        Inclua sempre o link de busca no final.
        Explique para uma adolescente: ${prompt}`;

    for (const modelo of modelosAtivos) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.8 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto) {
          // Garante que o link de busca esteja presente
          const link = `\n\nSaiba mais: https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
          return res.status(200).json({ result: texto.includes('http') ? texto : texto + link });
        }
      }
    }

    res.status(500).json({ error: "Teca se perdeu nos arquivos." });
  } catch (error) {
    res.status(500).json({ error: "Erro na central da biblioteca." });
  }
}