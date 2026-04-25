const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const API_OPENAI = 'https://api.openai.com/v1/responses';
const API_CLAUDE = 'https://api.anthropic.com/v1/messages';

async function callGemini(prompt, system, isJson, key) {
  if (!key) return null;
  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.8,
      ...(isJson ? { responseMimeType: "application/json" } : {})
    }
  };
  const r = await fetch(`${API_GEMINI}/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (r.status === 429) return { rateLimit: true };
  if (!r.ok) return null;
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callOpenAI(prompt, system, isJson, key) {
  if (!key) return null;
  const payload = {
    model: "gpt-4o-mini",
    instructions: system,
    input: prompt,
    ...(isJson ? { response_format: { type: "json_object" } } : {})
  };
  const r = await fetch(API_OPENAI, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });
  if (r.status === 429) return { rateLimit: true };
  if (!r.ok) return null;
  const data = await r.json();
  // v1/responses standard: output[0].content[0].text
  return data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.text || null;
}

async function callClaude(prompt, system, isJson, key) {
  if (!key) return null;
  const payload = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 500,
    system: system,
    messages: [{ role: "user", content: prompt }]
  };
  const r = await fetch(API_CLAUDE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });
  if (r.status === 429) return { rateLimit: true };
  if (!r.ok) return null;
  const data = await r.json();
  return data.content?.[0]?.text || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt, nome } = req.body;
  const keys = {
    gemini: process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY
  };

  try {
    let system = `Você é a Professora Teca. Responda em pt-BR, direta, clara e com humor nerd 📚. Explique curto (máx 200 carac). Nome: ${nome || 'aluna'}.`;
    let isJson = false;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      isJson = true;
      system = `Você é a Professora Teca. Gere exatamente 4 perguntas dinâmicas (investigação) para adolescentes (11-13 anos).
      Retorne APENAS um array JSON de strings: ["p1","p2","p3","p4"]. Sem texto fora do JSON.`;
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      system = `Você é a Professora Teca. Analise as respostas do aluno ao protocolo científico de forma carinhosa e nerd (máx 500 carac).`;
    }

    const providers = [
      { name: 'Gemini', call: callGemini, key: keys.gemini },
      { name: 'OpenAI', call: callOpenAI, key: keys.openai },
      { name: 'Claude', call: callClaude, key: keys.claude }
    ];

    for (const p of providers) {
      if (!p.key) continue;
      console.log(`Tentando provedor: ${p.name}...`);
      const result = await p.call(prompt, system, isJson, p.key);

      if (result && result.rateLimit) {
        console.warn(`Provedor ${p.name} em rate limit.`);
        continue;
      }

      if (result) {
        return res.status(200).json({
          result: result.trim(),
          meta: { provider: p.name }
        });
      }
    }

    return res.status(200).json({
      fallback: true,
      code: "SHELF_BUSY",
      error: "A estante da Teca está muito disputada agora. Tente de novo em alguns instantes 📚"
    });

  } catch (e) {
    console.error('Erro no callProviders:', e);
    res.status(500).json({ error: 'Alguma estante caiu no laboratório central!' });
  }
}