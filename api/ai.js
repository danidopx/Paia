const API = 'https://generativelanguage.googleapis.com/v1beta';

async function getModelosAtivos(key) {
  try {
    const { models } = await fetch(`${API}/models?key=${key}`).then(r => r.json());
    return models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
  } catch {
    return ['gemini-2.0-flash'];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt, nome } = req.body;
  const key = process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  try {
    const modelos = await getModelosAtivos(key);

    let systemInstructionText = `Você é a Professora Teca.

          REGRAS:
          - Responda sempre em pt-BR.
          - Seja direta, clara e com humor nerd + emojis 📚🧪.
          - NÃO enrole nem corte explicações importantes.

          TAMANHO DA RESPOSTA:
          - Se for UMA palavra: explique de forma simples e completa (1 ou 2 frases resumidos em até 50 caracteres).
          - Se for uma FRASE ou pergunta: responda com até 200 caracteres.
          - NÃO use mínimo fixo de caracteres.

          CONTEXTO:
          - Se souber o nome da pessoa, use de forma leve.
          - Se não souber o nome, pergunte primeiro e depois explique.
          - "Consultando..." = busca por conhecimento especializado.

          PRIORIDADE:
          - Sempre priorize clareza e explicação correta, mesmo que seja curta.`;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      systemInstructionText = `Você é a Professora Teca. Gere exatamente 4 perguntas INVESTIGATIVAS E DIVERTIDAS sobre o tema solicitado, feitas sob a ótica de PRÉ-ADOLESCENTES E ADOLESCENTES atuais.
      REGRAS:
      - Use uma linguagem super leve, faça referências a games, cultura pop, internet e cultura nerd contemporânea.
      - NÃO USE PALAVRAS REBUSCADAS OU DIFÍCEIS. Use a linguagem do dia a dia.
      - Aborde problemas reais da rotina deles de forma envolvente.
      - Mantenha a essência do método científico, mas com nomes práticos na hora de perguntar: 1. A parada que acontece (Observação), 2. O que causou esse "bug" (Hipótese), 3. Como testar/resolver (Teste/Reflexão), 4. O que a gente aprendeu com isso (Conclusão).
      - Retorne APENAS as 4 perguntas finais organizadas, numeradas de 1 a 4 em linhas separadas. SEM texto extra!`;
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      systemInstructionText = `Você é a Professora Teca. Faça uma análise final carinhosa e nerd sobre as respostas do aluno ao protocolo científico. Máximo de 500 caracteres. Avalie com base no método científico. Elogie a curiosidade cientifica.`;
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.8 }
    };

    for (const m of modelos) {
      const r = await fetch(`${API}/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!r.ok) continue;

      const t = (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) {
        return res.status(200).json({
          result: t.trim(),
          meta: {
            nome: nome || 'desconhecido',
            prompt
          }
        });
      }
    }

    res.status(500).json({ error: 'Sem uma boa resposta válida' });
  } catch {
    res.status(500).json({ error: 'Erro de conexão' });
  }
}