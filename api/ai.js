const MODELOS_FALLBACK = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function chamarGemini({ prompt, modelo, apiKey }) {
  // Prompt de sistema para garantir o comportamento que você pediu
  const promptSistema = `Aja como um mentor científico para uma jovem. 
    Responda em no máximo 200 caracteres. 
    Ao final, obrigatoriamente adicione: "Saiba mais: https://www.google.com/search?q=${encodeURIComponent(prompt)}"
    Explique de forma clara: ${prompt}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptSistema }] }]
    })
  });

  let corpo = null;
  try {
    corpo = await response.text();
  } catch {
    corpo = '';
  }

  return { response, corpo };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt, modelo = 'gemini-1.5-flash' } = req.body;
  // Tenta pegar qualquer uma das chaves que você configurou no Vercel
  const apiKey = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave API não configurada no ambiente Vercel.' });
    }

    const modelosParaTentar = [modelo, ...MODELOS_FALLBACK.filter(item => item !== modelo)];
    let ultimoStatus = 500;
    let ultimoErro = 'Erro desconhecido ao chamar a API Gemini.';

    for (const modeloAtual of modelosParaTentar) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const { response, corpo } = await chamarGemini({ prompt, modelo: modeloAtual, apiKey });

        if (response.ok) {
          const data = JSON.parse(corpo);
          // Extrai apenas o texto para facilitar o seu Frontend
          const textoFinal = data.candidates[0].content.parts[0].text;
          return res.status(200).json({ result: textoFinal });
        }

        ultimoStatus = response.status;
        ultimoErro = corpo || `HTTP ${response.status}`;

        if (response.status === 503 && tentativa === 0) {
          await esperar(1200);
          continue;
        }
        break;
      }
    }

    res.status(ultimoStatus).json({ error: ultimoErro });
  } catch (error) {
    console.error('Erro na Vercel Function:', error);
    res.status(500).json({ error: error.message });
  }
}