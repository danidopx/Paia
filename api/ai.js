export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ result: "ERRO: Chave API não encontrada nas variáveis da Vercel." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Explique de forma científica e simples para uma jovem de 13 anos: ${prompt}` }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ result: `Erro na API Google: ${data.error.message}` });
    }

    const result = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result });
  } catch (e) {
    res.status(500).json({ result: "Erro crítico na função do servidor." });
  }
}