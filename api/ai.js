const MODELOS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

async function chamarGemini({ prompt, modelo, apiKey }) {
  // Prompt ultra-direto para evitar explicações da IA sobre ela mesma
  const promptSistema = `Aja estritamente como a Professora Teca. 
    REGRAS OBRIGATÓRIAS:
    1. Responda APENAS o texto da explicação + link. Proibido introduções.
    2. Linguagem: Português do Brasil (pt-BR).
    3. Máximo 200 caracteres.
    4. Estilo: Nerd, engraçadinha e rápida.
    5. Termine com: Saiba mais: https://www.google.com/search?q=${encodeURIComponent(prompt)}

    Explique: ${prompt}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptSistema }] }],
      generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
    })
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) return res.status(500).json({ error: 'Chave ausente.' });

    // Tenta o 2.0 (mais rápido), se falhar vai pro 1.5
    let resultado = await chamarGemini({ prompt, modelo: MODELOS[0], apiKey });

    if (!resultado) {
      resultado = await chamarGemini({ prompt, modelo: MODELOS[1], apiKey });
    }

    return res.status(200).json({ result: resultado || "Teca sumiu nas estantes! Tente de novo." });
  } catch (error) {
    res.status(500).json({ error: "Erro na biblioteca da Teca." });
  }
}