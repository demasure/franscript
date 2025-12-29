const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    findUserById,
    findUserByUsername,
    updateUser,
    createReport,
    getAllReports,
    updateReportStatus
} = require('./database');

const router = express.Router();

// ============================================
// CONFIGURATION UPLOAD AVATAR
// ============================================

// Créer le dossier avatars s'il n'existe pas
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configuration multer pour l'upload d'avatars
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, avatarsDir);
    },
    filename: function (req, file, cb) {
        // Nom: userId-timestamp.ext
        const ext = path.extname(file.originalname);
        cb(null, `${req.session.userId}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max
    },
    fileFilter: function (req, file, cb) {
        // Accepter seulement images
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (ext && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou GIF.'));
    }
});

// ============================================
// ROUTES PROFIL UTILISATEUR
// ============================================

/**
 * GET /profile
 * Récupère le profil de l'utilisateur connecté
 */
router.get('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const user = findUserById(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        // Ne pas renvoyer le mot de passe
        const { password_hash, ...userProfile } = user;

        res.json(userProfile);
    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /profile
 * Met à jour le profil de l'utilisateur (pseudo, réglages)
 * Body: { username?, note_window_seconds?, show_ai_help_default?, show_notes_default? }
 *
 * RÈGLES PSEUDO:
 * - Peut être modifié une seule fois
 * - Doit être unique
 * - Devient définitif après confirmation
 */
router.put('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const { username, note_window_seconds, show_ai_help_default, show_notes_default } = req.body;
        const currentUser = findUserById(req.session.userId);

        if (!currentUser) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        // VALIDATION PSEUDO (si fourni)
        if (username !== undefined) {
            // Nettoyer le pseudo
            const trimmedUsername = username.trim();

            // Vérifier que le pseudo n'est pas vide
            if (trimmedUsername.length === 0) {
                return res.status(400).json({ error: 'Le pseudo ne peut pas être vide' });
            }

            // Vérifier longueur (3-20 caractères)
            if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
                return res.status(400).json({ error: 'Le pseudo doit contenir entre 3 et 20 caractères' });
            }

            // RÈGLE 1: Vérifier si le pseudo est déjà confirmé (définitif)
            if (currentUser.username_confirmed === 1) {
                return res.status(403).json({
                    error: 'Votre pseudo est définitif et ne peut plus être modifié',
                    isConfirmed: true
                });
            }

            // RÈGLE 2: Vérifier l'unicité du pseudo
            const existingUser = findUserByUsername(trimmedUsername);
            if (existingUser && existingUser.id !== req.session.userId) {
                return res.status(409).json({
                    error: 'Ce pseudo est déjà utilisé',
                    conflict: true
                });
            }

            // Tout est OK : mettre à jour le pseudo ET le marquer comme confirmé
            const updatedUser = updateUser(req.session.userId, {
                username: trimmedUsername,
                username_confirmed: true
            });

            const { password_hash, ...userProfile } = updatedUser;
            return res.json(userProfile);
        }

        // Mise à jour des réglages uniquement (sans pseudo)
        if (note_window_seconds !== undefined && (note_window_seconds < 1 || note_window_seconds > 60)) {
            return res.status(400).json({ error: 'La fenêtre temporelle doit être entre 1 et 60 secondes' });
        }

        const updatedUser = updateUser(req.session.userId, {
            note_window_seconds,
            show_ai_help_default,
            show_notes_default
        });

        const { password_hash, ...userProfile } = updatedUser;
        res.json(userProfile);

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /profile/avatar
 * Upload d'un avatar
 * Multipart form-data avec fichier "avatar"
 */
router.post('/profile/avatar', upload.single('avatar'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    try {
        // Supprimer l'ancien avatar si existant
        const user = findUserById(req.session.userId);
        if (user.profile_picture) {
            const oldAvatarPath = path.join(__dirname, '..', user.profile_picture);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // Mettre à jour avec le nouveau chemin
        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        const updatedUser = updateUser(req.session.userId, { profile_picture: avatarPath });

        // Ne pas renvoyer le mot de passe
        const { password_hash, ...userProfile } = updatedUser;

        res.json(userProfile);
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES SIGNALEMENTS
// ============================================

/**
 * POST /reports
 * Crée un nouveau signalement
 * Body: { video_id, message }
 */
router.post('/reports', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const { video_id, message } = req.body;

        // Validation
        if (!video_id || !message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Vidéo et message requis' });
        }

        if (message.length > 300) {
            return res.status(400).json({ error: 'Message trop long (max 300 caractères)' });
        }

        const report = createReport({
            user_id: req.session.userId,
            video_id: parseInt(video_id),
            message: message.trim()
        });

        res.status(201).json(report);
    } catch (error) {
        console.error('Erreur création signalement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /reports (ADMIN ONLY)
 * Récupère tous les signalements
 */
router.get('/reports', (req, res) => {
    // Vérifier que l'utilisateur est admin
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const user = findUserById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const reports = getAllReports();
        res.json(reports);
    } catch (error) {
        console.error('Erreur récupération signalements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /reports/:id/status (ADMIN ONLY)
 * Met à jour le statut d'un signalement
 * Body: { status }
 */
router.put('/reports/:id/status', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const user = findUserById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const { status } = req.body;
        const validStatuses = ['nouveau', 'traité', 'ignoré'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const reportId = parseInt(req.params.id);
        const updated = updateReportStatus(reportId, status);

        if (updated) {
            res.json({ success: true, status });
        } else {
            res.status(404).json({ error: 'Signalement introuvable' });
        }
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
