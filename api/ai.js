const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODELOS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt, nome } = req.body;
  const key = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    let systemInstructionText = `Você é a Professora Teca.
          REGRAS:
          - Responda sempre em pt-BR.
          - Seja direta, clara e com humor nerd + emojis 📚🧪.
          - NÃO enrole nem corte explicações importantes.
          TAMANHO DA RESPOSTA:
          - Explique termos de forma simples (máx 200 caracteres).
          CONTEXTO:
          - Se souber o nome da pessoa (${nome || 'aluna'}), use de forma leve.`;

    let maxTokens = 300;
    let isQuestionMode = false;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      isQuestionMode = true;
      maxTokens = 400;
      systemInstructionText = `Você é a Professora Teca. Gere exatamente 4 perguntas INVESTIGATIVAS E DIVERTIDAS para adolescentes (11-13 anos).
      REGRAS:
      - Use referências pop/nerd contemporâneas.
      - Retorne APENAS um array JSON de strings. Exemplo: ["p1", "p2", "p3", "p4"].
      - NÃO adicione introduções, explicações ou markdown fora do bloco JSON.`;
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      maxTokens = 600;
      systemInstructionText = `Você é a Professora Teca. Analise as respostas do aluno ao protocolo científico de forma carinhosa e nerd. Máximo 500 caracteres.`;
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        maxOutputTokens: maxTokens, 
        temperature: 0.8,
        responseMimeType: isQuestionMode ? "application/json" : "text/plain"
      }
    };

    // Rotação de modelos para tratar 429
    for (const modelo of MODELOS) {
      const r = await fetch(`${API}/models/${modelo}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (r.status === 429) {
        console.warn(`Modelo ${modelo} retornou 429, tentando o próximo...`);
        continue;
      }

      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ error: `Erro API: ${r.status}`, details: errText });
      }

      const data = await r.json();
      const t = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (t) {
        return res.status(200).json({
          result: t.trim(),
          meta: { model: modelo }
        });
      }
    }

    return res.status(429).json({ 
      fallback: true, 
      error: "Limite temporário da IA. Tente novamente em instantes." 
    });

  } catch (e) {
    console.error('Erro Handler:', e);
    res.status(500).json({ error: 'Falha interna no laboratório.' });
  }
}