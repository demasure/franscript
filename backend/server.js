const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Fonction pour appeler Ollama
async function callOllama(prompt, model = 'llama3.1:8b') {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 200
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

    const prompt = `Tu es un assistant d'apprentissage du français. Explique cette phrase de manière claire et concise en français (maximum 3 phrases).

Contexte: ${context || ''}

Phrase à expliquer: "${text}"

Explication:`;

    const explanation = await callOllama(prompt);

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
