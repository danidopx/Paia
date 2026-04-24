async function buscarModelosAtivos(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    return data.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => b.localeCompare(a));
  } catch (e) {
    return ['gemini-2.0-flash', 'gemini-1.5-flash'];
  }
}

async function chamarGemini({ prompt, modelo, apiKey }) {
  // PERSONALIDADE DA TECA: Mentora de biblioteca, engraçada e genial
  const promptSistema = `Aja como a "Professora Teca" (abreviação de biblioteca). 
    Você é uma mentora nerd, engraçadinha e apaixonada por livros e ciência.
    
    INSTRUÇÕES DE RESPOSTA:
    1. Comece ou termine com uma brincadeira sobre o termo (ex: "Isso é mais raro que livro devolvido no prazo!" ou "Minhas estantes até tremeram com esse conceito!").
    2. Explique o conceito de forma genial para uma jovem.
    3. Máximo 200 caracteres.
    4. Use emojis como 📚, 🧪, 💡.
    5. No final, coloque o link: https://www.google.com/search?q=${encodeURIComponent(prompt)}

    Termo para explicar: ${prompt}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptSistema }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }
      ]
    })
  });

  const corpo = await response.text();
  return { response, corpo };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) return res.status(500).json({ error: 'Chave API ausente.' });

    const modelosDisponiveis = await buscarModelosAtivos(apiKey);
    let ultimoErro = '';

    for (const modelo of modelosDisponiveis) {
      try {
        const { response, corpo } = await chamarGemini({ prompt, modelo, apiKey });

        if (response.ok) {
          const data = JSON.parse(corpo);
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.status(200).json({
              result: data.candidates[0].content.parts[0].text
            });
          }
        }
        ultimoErro = corpo;
      } catch (e) { continue; }
    }

    res.status(500).json({ error: "Teca foi organizar uns livros e já volta.", detalhes: ultimoErro });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}