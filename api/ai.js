const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function getMode(prompt = '') {
  if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) return 'questions';
  if (prompt.startsWith('[SISTEMA_EXPLICACAO]')) return 'explanation';
  if (prompt.startsWith('[SISTEMA_ANALISE]')) return 'analysis';
  return 'default';
}

function getSystemInstruction(mode) {
  if (mode === 'questions') {
    return 'Você é a Professora Teca. Crie exatamente 4 perguntas curtas, claras e diferentes. Responda apenas com um JSON array em pt-BR, sem markdown.';
  }

  if (mode === 'explanation') {
    return 'Você é a Professora Teca. Explique em pt-BR, com 30 a 200 caracteres, humor nerd leve, sem mencionar IA, API, modelo ou sistema. Não use markdown.';
  }

  if (mode === 'analysis') {
    return 'Você é a Professora Teca. Analise respostas em pt-BR de forma breve, clara e útil. Não use markdown.';
  }

  return 'Você é a Professora Teca. Responda em pt-BR de forma breve e clara.';
}

function stripPrefix(prompt = '') {
  return prompt.replace(/^\[(SISTEMA_[A-Z_]+)\]\s*/, '').trim();
}

function extractText(data) {
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  return text || '';
}

async function callGemini(prompt, mode) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      status: 500,
      body: {
        error: 'Falta configurar GEMINI_API_KEY ou GOOGLE_API_KEY.',
      },
    };
  }

  const preferredModels = [DEFAULT_MODEL];
  const body = {
    systemInstruction: {
      parts: [{ text: getSystemInstruction(mode) }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: stripPrefix(prompt) }],
      },
    ],
    generationConfig: {
      temperature: mode === 'questions' ? 0.8 : 0.5,
      maxOutputTokens: mode === 'questions' ? 512 : 256,
    },
  };

  let lastError = null;
  for (const model of preferredModels) {
    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `Gemini respondeu com status ${response.status}`);
      }

      const result = extractText(data);
      return {
        status: 200,
        body: {
          result,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    status: 500,
    body: {
      error: lastError?.message || 'Falha ao consultar Gemini.',
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const { prompt = '' } = req.body || {};
  const mode = getMode(prompt);
  const result = await callGemini(prompt, mode);
  res.status(result.status).json(result.body);
};

module.exports._internals = {
  getMode,
  stripPrefix,
  getSystemInstruction,
};
