const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const API_OPENAI = 'https://api.openai.com/v1/responses';

async function callGemini(prompt, system, isJson, key) {
  if (!key) return null;
  try {
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 400,
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
    if (!r.ok) {
      console.error(`[Gemini] Erro ${r.status}:`, await r.text());
      return null;
    }
    
    const data = await r.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[Gemini] Erro de rede:', e.message);
    return null;
  }
}

async function callOpenAI(prompt, system, isJson, key) {
  if (!key) return null;
  try {
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
    if (!r.ok) {
      console.error(`[OpenAI] Erro ${r.status}:`, await r.text());
      return null;
    }
    
    const data = await r.json();
    return data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.text || null;
  } catch (e) {
    console.error('[OpenAI] Erro de rede:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt, nome } = req.body;
  const keys = {
    gemini: process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY
  };

  try {
    let system = `Você é a Professora Teca. Responda em pt-BR, direta, clara e com humor nerd 📚. Explique curto (máx 200 carac). Nome: ${nome || 'aluna'}.`;
    let isJson = false;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      isJson = true;
      system = `Você é a Professora Teca. Gere exatamente 4 perguntas curtas para adolescentes (11-13 anos).
      Retorne apenas JSON: ["p1","p2","p3","p4"].`;
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      system = `Você é a Professora Teca. Analise as respostas do aluno ao protocolo científico de forma carinhosa e nerd (máx 500 carac).`;
    }

    const providers = [
      { name: 'Gemini', call: callGemini, key: keys.gemini },
      { name: 'OpenAI', call: callOpenAI, key: keys.openai }
    ];

    for (const p of providers) {
      if (!p.key) continue;
      console.log(`[Backend] Tentando ${p.name}...`);
      const result = await p.call(prompt, system, isJson, p.key);

      if (result && result.rateLimit) {
        console.warn(`[Backend] ${p.name} retornou 429 (Rate Limit).`);
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
      error: "A estante da Teca está muito disputada agora. Ela deixou os cartões pausados por alguns minutos 📚"
    });

  } catch (e) {
    console.error('[Backend] Falha crítica:', e);
    res.status(500).json({ error: 'Alguma estante caiu no laboratório central!' });
  }
}