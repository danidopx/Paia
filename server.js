const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

app.post('/api/ai', (req, res) => {
    const { action, prompt } = req.body || {};

    if (action === 'listModels') {
        return res.json({ providers: { gemini: ['gemini-2.0-flash'], openai: ['gpt-4o-mini'] } });
    }

    if (prompt && prompt.startsWith('[SISTEMA_PERGUNTAS]')) {
        // Return exactly JSON array as string to mimic AI response
        const questions = [
            'O que mais te chama atenção nesse tema?',
            'Como você testaria sua hipótese?',
            'Que resultado você espera encontrar e por quê?',
            'Que recursos você precisa para investigar melhor?'
        ];
        return res.json({ result: JSON.stringify(questions) });
    }

    if (prompt && prompt.startsWith('[SISTEMA_ANALISE]')) {
        return res.json({ result: 'Analisando suas respostas: há coerência nas suas observações e uma hipótese interessante. Reforce a metodologia.' });
    }

    // Default simple echo
    return res.json({ result: `Teca respondeu: ${prompt || ''}` });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mock API server running on http://localhost:${port}`));
