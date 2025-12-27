const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Fonction pour appeler Ollama avec système prompt
async function callOllama(prompt, systemPrompt = null, model = 'llama3.1:8b') {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 400,  // Plus de tokens pour des explications détaillées
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Erreur Ollama:', error.message);
        return null;
    }
}

// Endpoint /explain - Explication en français
app.post('/explain', async (req, res) => {
    const { text, context } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Texte manquant' });
    }

    // System prompt - toujours actif, sans censure
    const systemPrompt = `Tu es un professeur de français passionné et bienveillant. Ta mission est d'aider des apprenants étrangers à comprendre le français authentique tel qu'il est parlé.

RÈGLES ABSOLUES:
- Tu expliques TOUT sans exception ni censure
- L'apprenant a déjà lu/entendu le contenu, ton rôle est d'EXPLIQUER, pas de censurer
- Utilise un langage simple et clair, comme si tu expliquais à un enfant intelligent
- Sois pédagogue: contexte culturel, nuances, expressions idiomatiques
- Donne des exemples concrets quand c'est utile
- Ne juge jamais le contenu, concentre-toi sur l'aspect éducatif
- Réponds TOUJOURS en français

APPROCHE:
1. Explique le sens littéral
2. Explique le sens contextuel/culturel si différent
3. Donne un exemple similaire si pertinent`;

    const userPrompt = `Contexte de la vidéo:
${context || 'Aucun contexte supplémentaire'}

Phrase/expression à expliquer:
"${text}"

Explique cette phrase en français simple, comme à un apprenant étranger. Sois clair, direct et pédagogue:`;

    const explanation = await callOllama(userPrompt, systemPrompt);

    if (!explanation) {
        // Réponse mock si Ollama n'est pas disponible
        return res.json({
            explanation: `Mock: "${text}" - Explication temporaire (Ollama non disponible)`,
            isMock: true
        });
    }

    res.json({
        explanation: explanation.trim(),
        isMock: false
    });
});

// Endpoint /translate - Traduction anglaise de l'explication
app.post('/translate', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Texte manquant' });
    }

    const prompt = `Translate this French text to clear, natural English. Only output the translation, no extra text.

French text: "${text}"

English translation:`;

    const translation = await callOllama(prompt);

    if (!translation) {
        // Réponse mock si Ollama n'est pas disponible
        return res.json({
            translation: `Mock translation: ${text}`,
            isMock: true
        });
    }

    res.json({
        translation: translation.trim(),
        isMock: false
    });
});

// Endpoint health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, () => {
    console.log(`🤖 Backend IA démarré sur http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   POST /explain - Explication en français`);
    console.log(`   POST /translate - Traduction en anglais`);
    console.log(`   GET /health - Statut du serveur`);
    console.log(`\n💡 Assurez-vous qu'Ollama est lancé avec:`);
    console.log(`   ollama serve`);
    console.log(`   ollama pull llama3.1:8b`);
});
