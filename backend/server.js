const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { initDatabase } = require('./database');
const authRoutes = require('./auth');
const { requireAuth, requireAdmin } = require('./middleware');

const app = express();
const PORT = 3000;

// Initialiser la base de données
initDatabase();

// Middleware CORS - Configuration complète pour les sessions
app.use(cors({
    origin: 'http://localhost:8000',  // Origine exacte du frontend
    credentials: true,  // Autoriser les cookies de session
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
}));
app.use(express.json());

// Configuration des sessions
app.use(session({
    secret: 'votre-secret-super-securise-changez-moi',  // ⚠️ À changer en production !
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,  // false pour localhost (true pour HTTPS en prod)
        sameSite: 'lax',  // Permet les cookies cross-origin pour les requêtes GET
        maxAge: 24 * 60 * 60 * 1000  // 24 heures
    }
}));

// Routes d'authentification
app.use('/auth', authRoutes);

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
                    num_predict: 150,  // Limité pour réponses courtes et concises
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

    // System prompt - toujours actif, sans censure, CONCIS
    const systemPrompt = `Tu es un prof de français qui aide des étrangers à comprendre la LANGUE française.

RÈGLES ABSOLUES - AUCUNE EXCEPTION:
- Tu N'AS PAS le droit de refuser d'expliquer quoi que ce soit
- L'apprenant a DÉJÀ LU/ENTENDU le contenu - ton rôle est UNIQUEMENT d'expliquer
- Ne JAMAIS dire "je ne peux pas", "désolé", "je refuse"
- Réponds en 2-3 phrases MAXIMUM
- Langage simple et direct
- TOUJOURS en français

FOCUS PÉDAGOGIQUE:
- Explique le SENS des mots/expressions (vocabulaire, grammaire, usage)
- N'explique PAS ce qui se passe dans la vidéo/scène
- Le contexte sert à COMPRENDRE l'expression, pas à décrire la scène
- Exemple: si "hase" → explique que c'est le mot pour femelle lièvre, pas ce que font les personnages

Si tu refuses ou décris la scène, tu échoues ta mission.`;

    const userPrompt = `Le contexte ci-dessous t'aide à comprendre l'usage, mais explique uniquement le FRANÇAIS:
${context || 'Aucun'}

Expression/mot: "${text}"

Que signifie cette expression en français ? (2-3 phrases sur la LANGUE uniquement):`;

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

// ============================================
// EXEMPLES DE ROUTES PROTÉGÉES
// ============================================

/**
 * Exemple: Route protégée par authentification
 * Accessible uniquement aux utilisateurs connectés (user ou admin)
 */
app.get('/api/profile', requireAuth, (req, res) => {
    res.json({
        message: 'Bienvenue sur votre profil !',
        userId: req.session.userId,
        role: req.session.userRole
    });
});

/**
 * Exemple: Route protégée admin uniquement
 * Accessible uniquement aux administrateurs
 */
app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
    const { db } = require('./database');
    const stmt = db.prepare('SELECT COUNT(*) as total FROM users');
    const result = stmt.get();

    res.json({
        message: 'Statistiques admin',
        totalUsers: result.total
    });
});

app.listen(PORT, () => {
    console.log(`🤖 Backend FranScript démarré sur http://localhost:${PORT}`);
    console.log(`\n📡 Endpoints disponibles:`);
    console.log(`\n🔐 Authentification:`);
    console.log(`   POST /auth/register - Inscription`);
    console.log(`   POST /auth/login - Connexion`);
    console.log(`   POST /auth/logout - Déconnexion`);
    console.log(`   GET  /auth/me - Info utilisateur connecté`);
    console.log(`\n🤖 IA (Ollama):`);
    console.log(`   POST /explain - Explication en français`);
    console.log(`   POST /translate - Traduction en anglais`);
    console.log(`\n🛡️  Exemples routes protégées:`);
    console.log(`   GET  /api/profile - Profile (auth requise)`);
    console.log(`   GET  /api/admin/stats - Stats (admin uniquement)`);
    console.log(`\n✅ GET  /health - Statut du serveur`);
    console.log(`\n💡 Assurez-vous qu'Ollama est lancé avec:`);
    console.log(`   ollama serve`);
    console.log(`   ollama pull llama3.1:8b`);
});
