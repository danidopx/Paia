const API = 'https://generativelanguage.googleapis.com/v1beta';
// Modelo rápido fixo - evita chamada extra de descoberta
const MODELO_RAPIDO = 'gemini-2.0-flash';
const MODELO_ANALISE = 'gemini-1.5-flash';

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

    // Tokens e modelo otimizados por tipo de request
    let modelo = MODELO_RAPIDO;
    let maxTokens = 300;

    if (prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
      maxTokens = 250; // 4 perguntas curtas, não precisa de mais
    } else if (prompt.startsWith('[SISTEMA_ANALISE]')) {
      modelo = MODELO_ANALISE;
      maxTokens = 600;
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 }
    };

    const r = await fetch(`${API}/models/${modelo}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('API error:', r.status, errText);
      return res.status(500).json({ error: `API retornou ${r.status}` });
    }
    const t = (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (t) {
      return res.status(200).json({
        result: t.trim(),
        meta: { nome: nome || 'desconhecido', prompt }
      });
    }

    res.status(500).json({ error: 'Sem resposta válida do modelo' });
  } catch {
    res.status(500).json({ error: 'Erro de conexão' });
  }
}