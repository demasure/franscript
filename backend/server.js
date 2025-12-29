const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { initDatabase, getVideoById, createVideo } = require('./database');
const authRoutes = require('./auth');
const userFeaturesRoutes = require('./userFeatures');
const profileRoutes = require('./profile');
const adminRoutes = require('./admin');
const subtitlesRoutes = require('./subtitles');
const { requireAuth, requireAdmin } = require('./middleware');

const app = express();
const PORT = 3000;

// Initialiser la base de données
initDatabase();

// Créer la vidéo de démonstration si elle n'existe pas
const demoVideo = getVideoById(1);
if (!demoVideo) {
    console.log('📹 Création de la vidéo de démonstration...');
    createVideo({
        title: 'Ma Première Vidéo',
        description: 'Introduction à FranScript avec sous-titres interactifs pour apprendre le français.',
        video_url: 'videos/ma_video.mp4',
        subtitle_url: 'videos/ma_video.vtt',
        is_paid: false,
        tagIds: []
    });
    console.log('✅ Vidéo de démonstration créée avec ID: 1');
}

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
        maxAge: 24 * 60 * 60 * 1000  // 24 heures
        // sameSite omis pour localhost (ajouter 'lax' ou 'strict' en prod avec HTTPS)
    }
}));

// Routes d'authentification
app.use('/auth', authRoutes);

// Routes des fonctionnalités utilisateur (commentaires, likes, notes)
app.use('/', userFeaturesRoutes);

// Routes de profil et signalements
app.use('/', profileRoutes);

// Routes sous-titres - Protégées par requireAuth et requireAdmin
// IMPORTANT: Doit être AVANT /admin car plus spécifique
app.use('/admin/subtitles', requireAuth, requireAdmin, subtitlesRoutes);

// Routes admin - Protégées par requireAuth et requireAdmin
app.use('/admin', requireAuth, requireAdmin, adminRoutes);

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

// Route publique pour récupérer toutes les vidéos (pour la page d'accueil)
app.get('/videos', (req, res) => {
    try {
        const { getAllVideos } = require('./database');
        const videos = getAllVideos();
        res.json({ videos });
    } catch (error) {
        console.error('Erreur récupération vidéos:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des vidéos' });
    }
});

// Route publique pour obtenir les métadonnées d'une vidéo par ID
app.get('/api/videos/:id', (req, res) => {
    try {
        const { getVideoById } = require('./database');
        const videoId = parseInt(req.params.id);

        if (!videoId) {
            return res.status(400).json({ error: 'ID vidéo invalide' });
        }

        const video = getVideoById(videoId);

        if (!video) {
            return res.status(404).json({ error: 'Vidéo introuvable' });
        }

        // Retourner les métadonnées de la vidéo
        res.json({ video });
    } catch (error) {
        console.error('Erreur récupération vidéo:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route publique pour récupérer tous les tags (pour filtres et admin)
app.get('/tags', (req, res) => {
    try {
        const { getAllTags } = require('./database');
        const tags = getAllTags();
        res.json({ tags });
    } catch (error) {
        console.error('Erreur récupération tags:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des tags' });
    }
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

// ============================================
// ROUTE PROTÉGÉE POUR LES VIDÉOS
// ============================================

/**
 * Route pour servir les fichiers vidéo avec contrôle d'accès premium
 * - Si la vidéo est gratuite (is_paid = 0) : accès libre
 * - Si la vidéo est payante (is_paid = 1) : vérifier que l'utilisateur est premium
 */
app.get('/videos/:filename', (req, res) => {
    const { getVideoByUrl, findUserById } = require('./database');
    const filename = req.params.filename;

    // Construire le chemin relatif comme stocké en base de données
    const videoPath = `videos/${filename}`;

    // Chercher la vidéo dans la base de données
    const video = getVideoByUrl(videoPath);

    // Si la vidéo n'existe pas en base, retourner 404
    if (!video) {
        // Permettre l'accès aux fichiers .vtt (sous-titres) sans restriction
        if (filename.endsWith('.vtt')) {
            const filePath = path.join(__dirname, '..', 'videos', filename);
            return res.sendFile(filePath);
        }
        return res.status(404).json({ error: 'Vidéo introuvable' });
    }

    // Si la vidéo est gratuite, servir directement
    if (!video.is_paid) {
        const filePath = path.join(__dirname, '..', 'videos', filename);
        return res.sendFile(filePath);
    }

    // Vidéo payante : vérifier que l'utilisateur est premium
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Cette vidéo nécessite un compte premium',
            isPaid: true,
            requiresPremium: true
        });
    }

    const user = findUserById(req.session.userId);

    if (!user || !user.is_premium) {
        return res.status(403).json({
            error: 'Cette vidéo est réservée aux membres premium',
            isPaid: true,
            requiresPremium: true
        });
    }

    // Utilisateur premium : servir la vidéo
    const filePath = path.join(__dirname, '..', 'videos', filename);
    res.sendFile(filePath);
});

// Servir les fichiers uploadés (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.listen(PORT, () => {
    console.log(`🤖 Backend FranScript démarré sur http://localhost:${PORT}`);
    console.log(`\n📡 Endpoints disponibles:`);
    console.log(`\n🔐 Authentification:`);
    console.log(`   POST /auth/register - Inscription`);
    console.log(`   POST /auth/login - Connexion`);
    console.log(`   POST /auth/logout - Déconnexion`);
    console.log(`   GET  /auth/me - Info utilisateur connecté`);
    console.log(`\n👑 Admin (admin uniquement):`);
    console.log(`   GET    /admin/videos - Liste des vidéos`);
    console.log(`   POST   /admin/videos - Créer une vidéo`);
    console.log(`   PUT    /admin/videos/:id - Modifier une vidéo`);
    console.log(`   DELETE /admin/videos/:id - Supprimer une vidéo`);
    console.log(`   GET    /admin/tags - Liste des tags`);
    console.log(`   POST   /admin/tags - Créer un tag`);
    console.log(`   DELETE /admin/tags/:id - Supprimer un tag`);
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
