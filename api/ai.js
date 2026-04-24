// api/ai.js
export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Aja como um mentor científico para uma jovem de 13 anos. Use termos técnicos, mas explique-os de forma clara. Pergunta: ${prompt}` }] }]
    })
  });

  const data = await response.json();
  const result = data.candidates[0].content.parts[0].text;
  res.status(200).json({ result });
}