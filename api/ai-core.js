const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const API_OPENAI = 'https://api.openai.com/v1/responses';

function resolveKeys(env = process.env) {
  return {
    gemini: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GEMINI_KEY || '',
    openai: env.OPENAI_API_KEY || '',
  };
}

function missingKeyLabels(keys) {
  const missing = [];
  if (!keys.gemini) missing.push('GEMINI_API_KEY ou GOOGLE_API_KEY');
  if (!keys.openai) missing.push('OPENAI_API_KEY');
  return missing;
}

function hasAnyProvider(keys) {
  return Boolean(keys.gemini || keys.openai);
}

function providerMissingError(keys) {
  const missing = missingKeyLabels(keys);
  return `Faltam variáveis de ambiente de IA: ${missing.join(' e ')}.`;
}

async function listGeminiModels(key) {
  if (!key) return [];
  try {
    const r = await fetch(`${API_GEMINI}/models?key=${key}`);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .filter(m => !m.name.includes('pro') && !m.name.includes('preview') && !m.name.includes('experimental') && !m.name.includes('vision') && !m.name.includes('embedding'))
      .map(m => m.name.split('/').pop())
      .sort((a, b) => {
        if (a.includes('flash-lite')) return -1;
        if (b.includes('flash-lite')) return 1;
        if (a.includes('flash')) return -1;
        if (b.includes('flash')) return 1;
        return 0;
      });
  } catch (e) {
    return [];
  }
}

async function listOpenAIModels(key) {
  if (!key) return [];
  try {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.data || [])
      .map(m => m.id)
      .filter(id => id.includes('gpt') && (id.includes('mini') || id.includes('nano')))
      .filter(id => !id.includes('audio') && !id.includes('realtime') && !id.includes('instruct'))
      .sort((a, b) => {
        if (a.includes('nano')) return -1;
        if (b.includes('nano')) return 1;
        return 0;
      });
  } catch (e) {
    return [];
  }
}

function normalizePrompt(prompt) {
  return String(prompt || '').replace(/^\[SISTEMA_[A-Z_]+\]\s*/i, '').trim();
}

function resolvePromptConfig(prompt, nome) {
  let system = `Você é a Professora Teca. Responda em pt-BR, direta, clara e com humor nerd 📚. Explique curto (máx 200 carac). Nome: ${nome || 'aluna'}.`;
  let isJson = false;

  if ((prompt || '').startsWith('[SISTEMA_PERGUNTAS]')) {
    isJson = true;
    system = 'Você é a Professora Teca. Gere exatamente 4 perguntas curtas para adolescentes (11-13 anos). Retorne apenas JSON: ["p1","p2","p3","p4"].';
  } else if ((prompt || '').startsWith('[SISTEMA_AVALIACAO]')) {
    isJson = true;
    system = [
      'Você é a Professora Teca avaliando respostas escolares.',
      'Retorne apenas JSON puro, sem markdown, sem blocos de código e sem texto fora do JSON.',
      'Use a estrutura pedida pelo prompt e mantenha valores coerentes com a atividade.'
    ].join(' ');
  } else if ((prompt || '').startsWith('[SISTEMA_ANALISE]')) {
    system = 'Você é a Professora Teca. Analise as respostas do aluno ao protocolo científico de forma carinhosa e nerd (máx 500 carac).';
  }

  return {
    system,
    isJson,
    prompt: normalizePrompt(prompt),
  };
}

async function callProvider(modelInfo, prompt, system, isJson, keys) {
  const [provider, model] = String(modelInfo || '').split(':');

  if (provider === 'gemini') {
    if (!keys.gemini) return { skipped: true, reason: 'missing_gemini' };
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: isJson ? 0.2 : 0.8,
        ...(isJson ? { responseMimeType: 'application/json' } : {}),
      },
    };
    const r = await fetch(`${API_GEMINI}/models/${model}:generateContent?key=${keys.gemini}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if ([429, 401, 403, 404, 500].includes(r.status)) return { status: r.status, failed: true };
    const data = await r.json();
    return { result: data.candidates?.[0]?.content?.parts?.[0]?.text || null };
  }

  if (provider === 'openai') {
    if (!keys.openai) return { skipped: true, reason: 'missing_openai' };
    const payload = {
      model,
      instructions: system,
      input: prompt,
      ...(isJson ? { response_format: { type: 'json_object' } } : {}),
    };
    const r = await fetch(API_OPENAI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keys.openai}`,
      },
      body: JSON.stringify(payload),
    });
    if ([429, 401, 403, 404, 500].includes(r.status)) return { status: r.status, failed: true };
    const data = await r.json();
    return { result: data.output?.[0]?.content?.[0]?.text || data.output?.[0]?.text || data.output_text || null };
  }

  return { skipped: true, reason: 'unknown_provider' };
}

function defaultModelList(keys) {
  const list = [];
  if (keys.gemini) list.push('gemini:gemini-2.0-flash');
  if (keys.openai) list.push('openai:gpt-4o-mini');
  return list;
}

async function getModelLists(keys) {
  const [gemini, openai] = await Promise.all([
    listGeminiModels(keys.gemini),
    listOpenAIModels(keys.openai),
  ]);

  return { gemini, openai };
}

async function runAiRequest({ action, prompt, nome, preferredModels, env }) {
  const keys = resolveKeys(env);

  if (action === 'listModels') {
    if (!hasAnyProvider(keys)) {
      return {
        ok: false,
        status: 500,
        body: {
          error: providerMissingError(keys),
          code: 'MISSING_AI_KEYS',
          missing: missingKeyLabels(keys),
          providers: { gemini: [], openai: [] },
        },
      };
    }

    const providers = await getModelLists(keys);
    return {
      ok: true,
      status: 200,
      body: { providers },
    };
  }

  if (!hasAnyProvider(keys)) {
    return {
      ok: false,
      status: 500,
      body: {
        error: providerMissingError(keys),
        code: 'MISSING_AI_KEYS',
        missing: missingKeyLabels(keys),
      },
    };
  }

  const { system, isJson, prompt: cleanPrompt } = resolvePromptConfig(prompt, nome);
  const configured = defaultModelList(keys);
  const modelsToTry = (preferredModels && preferredModels.length ? preferredModels : configured)
    .filter(modelInfo => {
      const [provider] = String(modelInfo || '').split(':');
      return provider === 'gemini' ? Boolean(keys.gemini) : provider === 'openai' ? Boolean(keys.openai) : false;
    });

  if (!modelsToTry.length) {
    return {
      ok: false,
      status: 500,
      body: {
        error: providerMissingError(keys),
        code: 'MISSING_AI_KEYS',
        missing: missingKeyLabels(keys),
      },
    };
  }

  for (const modelInfo of modelsToTry) {
    const response = await callProvider(modelInfo, cleanPrompt, system, isJson, keys);
    if (response && response.failed) continue;
    if (response && response.result) {
      return {
        ok: true,
        status: 200,
        result: String(response.result).trim(),
        meta: { model: modelInfo },
      };
    }
  }

  return {
    ok: false,
    status: 502,
    body: {
      error: 'Nenhum provider de IA respondeu corretamente.',
      code: 'AI_PROVIDERS_UNAVAILABLE',
    },
  };
}

module.exports = {
  runAiRequest,
  resolveKeys,
  providerMissingError,
  missingKeyLabels,
};
