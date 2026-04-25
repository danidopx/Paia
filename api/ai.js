const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const API_OPENAI = 'https://api.openai.com/v1/responses';

async function listGeminiModels(key) {
  if (!key) return [];
  try {
    const r = await fetch(`${API_GEMINI}/models?key=${key}`);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .filter(m => !m.name.includes("pro") && !m.name.includes("preview") && !m.name.includes("experimental") && !m.name.includes("vision") && !m.name.includes("embedding"))
      .map(m => m.name.split('/').pop())
      .sort((a, b) => {
        if (a.includes("flash-lite")) return -1;
        if (b.includes("flash-lite")) return 1;
        if (a.includes("flash")) return -1;
        if (b.includes("flash")) return 1;
        return 0;
      });
  } catch (e) { return []; }
}

async function listOpenAIModels(key) {
  if (!key) return [];
  try {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.data || [])
      .map(m => m.id)
      .filter(id => id.includes("gpt") && (id.includes("mini") || id.includes("nano")))
      .filter(id => !id.includes("audio") && !id.includes("realtime") && !id.includes("instruct"))
      .sort((a, b) => {
        if (a.includes("nano")) return -1;
        if (b.includes("nano")) return 1;
        return 0;
      });
  } catch (e) { return []; }
}

async function callProvider(modelInfo, prompt, system, isJson, keys) {
  const [provider, model] = modelInfo.split(':');
  
  if (provider === 'gemini') {
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.8, ...(isJson ? { responseMimeType: "application/json" } : {}) }
    };
    const r = await fetch(`${API_GEMINI}/models/${model}:generateContent?key=${keys.gemini}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if ([429, 401, 403, 404, 500].includes(r.status)) return { status: r.status, failed: true };
    const data = await r.json();
    return { result: data.candidates?.[0]?.content?.parts?.[0]?.text || null };
  }
  
  if (provider === 'openai') {
    const payload = { model: model, instructions: system, input: prompt, ...(isJson ? { response_format: { type: "json_object" } } : {}) };
    const r = await fetch(API_OPENAI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.openai}` },
      body: JSON.stringify(payload)
    });
    if ([429, 401, 403, 404, 500].includes(r.status)) return { status: r.status, failed: true };
    const data = await r.json();
    return { result: data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.text || null };
  }
  
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { action, prompt, nome, preferredModels } = req.body;
  const keys = {
    gemini: process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY
  };

  if (action === "listModels") {
    const [gemini, openai] = await Promise.all([listGeminiModels(keys.gemini), listOpenAIModels(keys.openai)]);
    return res.status(200).json({ providers: { gemini, openai } });
  }

  try {
    let system = `Você é a Professora Teca. Responda em pt-BR, direta, clara e com humor nerd 📚. Explique curto (máx 200 carac). Nome: ${nome || 'aluna'}.`;
    let isJson = false;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      isJson = true;
      system = `Você é a Professora Teca. Gere exatamente 4 perguntas curtas para adolescentes (11-13 anos). Retorne apenas JSON: ["p1","p2","p3","p4"].`;
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      system = `Você é a Professora Teca. Analise as respostas do aluno ao protocolo científico de forma carinhosa e nerd (máx 500 carac).`;
    }

    const modelsToTry = preferredModels && preferredModels.length > 0 
      ? preferredModels 
      : ["gemini:gemini-2.0-flash", "openai:gpt-4o-mini"];

    for (const modelInfo of modelsToTry) {
      console.log(`[Backend] Tentando ${modelInfo}...`);
      const response = await callProvider(modelInfo, prompt, system, isJson, keys);

      if (response && response.failed) {
        console.warn(`[Backend] Modelo ${modelInfo} falhou com status ${response.status}.`);
        continue;
      }

      if (response && response.result) {
        return res.status(200).json({
          result: response.result.trim(),
          meta: { model: modelInfo }
        });
      }
    }

    return res.status(200).json({
      fallback: true,
      code: "SHELF_BUSY",
      error: "A estante da Teca está muito disputada agora. Ela deixou os cartões pausados por alguns minutos 📚"
    });

  } catch (e) {
    console.error('[Backend] Erro Crítico:', e);
    res.status(500).json({ error: 'Alguma estante caiu no laboratório central!' });
  }
}