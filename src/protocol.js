export const THEMES = [
  'Psicologia',
  'Astronomia',
  'Biologia',
  'Matemática',
  'Política',
  'Brasil',
  'Física',
];

export function buildQuestionsPrompt(theme) {
  return `[SISTEMA_PERGUNTAS] Gere exatamente 4 perguntas curtas e diferentes sobre ${theme}. Responda apenas com um JSON array de 4 strings em pt-BR.`;
}

export function buildAnalysisPrompt(theme, answers) {
  const summary = answers
    .map((item, index) => `Pergunta ${index + 1}: ${item.question}\nResposta: ${item.answer}`)
    .join('\n\n');
  return `[SISTEMA_ANALISE] Analise as respostas do tema ${theme} em pt-BR, com foco em clareza, coerência e próximos passos. Seja breve.\n\n${summary}`;
}

export function normalizeQuestionList(result) {
  if (Array.isArray(result)) {
    return result.map((item) => String(item).trim()).filter(Boolean).slice(0, 4);
  }

  if (typeof result === 'string') {
    const text = result.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '');
    if (!text) {
      return [];
    }

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 4);
      }
    } catch (_) {
      // fallback abaixo
    }

    return text
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-\d.)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return [];
}

export function emptyProtocolState() {
  return {
    theme: '',
    questions: [],
    index: 0,
    answers: [],
  };
}
