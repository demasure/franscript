const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getAllVideos,
    getVideoById,
    createVideo,
    updateVideo,
    deleteVideo,
    getAllTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
    getAllUsers,
    getUsersPaginated,
    countUsersFiltered,
    findUserById,
    createUser,
    updateUser,
    deleteUser,
    countUsers,
    db
} = require('./database');
const { detectVideoDuration, extractThumbnail } = require('./videoUtils');

const router = express.Router();

// ============================================
// CONFIGURATION UPLOAD THUMBNAILS
// ============================================

// Créer le dossier thumbnails s'il n'existe pas
const thumbnailsDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Configuration multer pour l'upload de thumbnails
const thumbnailStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, thumbnailsDir);
    },
    filename: function (req, file, cb) {
        // Nom: thumbnail-timestamp-random.ext
        const ext = path.extname(file.originalname);
        const filename = `thumbnail-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        cb(null, filename);
    }
});

const thumbnailUpload = multer({
    storage: thumbnailStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: function (req, file, cb) {
        // Accepter seulement images
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (ext && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.'));
    }
});

// ============================================
// ROUTE UPLOAD THUMBNAIL - Admin uniquement
// ============================================

/**
 * POST /admin/upload-thumbnail
 * Upload d'une vignette (thumbnail) pour une vidéo
 * Multipart form-data avec fichier "thumbnail"
 *
 * Retourne: { url: "/uploads/thumbnails/filename.jpg" }
 */
router.post('/upload-thumbnail', thumbnailUpload.single('thumbnail'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    try {
        // Retourner l'URL du fichier uploadé
        const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;

        console.log(`✅ Thumbnail uploadé: ${thumbnailUrl}`);

        res.json({
            url: thumbnailUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Erreur upload thumbnail:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload du thumbnail' });
    }
});

// ============================================
// ROUTES VIDÉOS - Admin uniquement
// ============================================

/**
 * GET /admin/videos
 * Récupère toutes les vidéos
 */
router.get('/videos', (req, res) => {
    try {
        const videos = getAllVideos();
        res.json({ videos });
    } catch (error) {
        console.error('Erreur récupération vidéos:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des vidéos' });
    }
});

/**
 * GET /admin/videos/:id
 * Récupère une vidéo par son ID
 */
router.get('/videos/:id', (req, res) => {
    try {
        const video = getVideoById(parseInt(req.params.id));
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }
        res.json({ video });
    } catch (error) {
        console.error('Erreur récupération vidéo:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la vidéo' });
    }
});

/**
 * POST /admin/videos
 * Crée une nouvelle vidéo
 *
 * Body: {
 *   title: string (requis)
 *   description: string
 *   video_url: string (requis)
 *   subtitle_url: string
 *   thumbnail_url: string (optionnel, URL de la vignette)
 *   level: string (B2, C1, C2)
 *   duration: number (en secondes)
 *   is_paid: boolean
 *   tagIds: number[] (IDs des tags)
 * }
 */
router.post('/videos', async (req, res) => {
    try {
        const { title, description, video_url, subtitle_url, thumbnail_url, level, is_paid, tagIds } = req.body;

        // Validation
        if (!title || !video_url) {
            return res.status(400).json({
                error: 'Le titre et l\'URL de la vidéo sont requis'
            });
        }

        // Détecter automatiquement la durée et créer la vidéo d'abord
        const detectedDuration = await detectVideoDuration(video_url);
        console.log(`📹 Durée détectée pour "${title}": ${detectedDuration ? detectedDuration + 's' : 'Non détectée'}`);

        const video = createVideo({
            title,
            description: description || '',
            video_url,
            subtitle_url,
            thumbnail_url: thumbnail_url || null, // Utiliser thumbnail_url fourni ou null
            level: level || 'B2',
            duration: detectedDuration,
            is_paid: is_paid || false,
            tagIds: tagIds || []
        });

        // Si aucun thumbnail fourni, extraire automatiquement (en arrière-plan)
        if (!thumbnail_url) {
            extractThumbnail(video_url, video.id).then(thumbnailPath => {
                if (thumbnailPath) {
                    updateVideo(video.id, {
                        ...video,
                        thumbnail_url: thumbnailPath,
                        tagIds: video.tags.map(t => t.id)
                    });
                }
            });
        }

        res.status(201).json({
            message: 'Vidéo créée avec succès',
            video
        });
    } catch (error) {
        console.error('Erreur création vidéo:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la vidéo' });
    }
});

/**
 * PUT /admin/videos/:id
 * Met à jour une vidéo
 *
 * Body: {
 *   title: string
 *   description: string
 *   video_url: string
 *   subtitle_url: string
 *   thumbnail_url: string (optionnel, URL de la vignette)
 *   level: string (B2, C1, C2)
 *   duration: number (en secondes)
 *   is_paid: boolean
 *   tagIds: number[]
 * }
 */
router.put('/videos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, video_url, subtitle_url, thumbnail_url, level, is_paid, tagIds } = req.body;

        // Vérifier que la vidéo existe
        const existingVideo = getVideoById(id);
        if (!existingVideo) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }

        // Validation
        if (!title || !video_url) {
            return res.status(400).json({
                error: 'Le titre et l\'URL de la vidéo sont requis'
            });
        }

        // Détecter automatiquement la durée de la vidéo si l'URL a changé
        let detectedDuration = existingVideo.duration;
        let finalThumbnailUrl = thumbnail_url !== undefined ? thumbnail_url : existingVideo.thumbnail_url;

        if (video_url !== existingVideo.video_url) {
            detectedDuration = await detectVideoDuration(video_url);
            console.log(`📹 Durée détectée pour "${title}": ${detectedDuration ? detectedDuration + 's' : 'Non détectée'}`);

            // Extraire nouveau thumbnail en arrière-plan SEULEMENT si aucun thumbnail fourni
            if (thumbnail_url === undefined) {
                extractThumbnail(video_url, id).then(thumbnailPath => {
                    if (thumbnailPath) {
                        updateVideo(id, {
                            title,
                            description: description || '',
                            video_url,
                            subtitle_url,
                            thumbnail_url: thumbnailPath,
                            level: level || 'B2',
                            duration: detectedDuration,
                            is_paid: is_paid || false,
                            tagIds: tagIds || []
                        });
                    }
                });
            }
        }

        const video = updateVideo(id, {
            title,
            description: description || '',
            video_url,
            subtitle_url,
            thumbnail_url: finalThumbnailUrl,
            level: level || 'B2',
            duration: detectedDuration,
            is_paid: is_paid || false,
            tagIds: tagIds || []
        });

        res.json({
            message: 'Vidéo mise à jour avec succès',
            video
        });
    } catch (error) {
        console.error('Erreur mise à jour vidéo:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la vidéo' });
    }
});

/**
 * DELETE /admin/videos/:id
 * Supprime une vidéo
 */
router.delete('/videos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Vérifier que la vidéo existe
        const video = getVideoById(id);
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }

        deleteVideo(id);

        res.json({
            message: 'Vidéo supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur suppression vidéo:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la vidéo' });
    }
});

// ============================================
// ROUTES TAGS - Admin uniquement
// ============================================

/**
 * GET /admin/tags
 * Récupère tous les tags
 */
router.get('/tags', (req, res) => {
    try {
        const tags = getAllTags();
        res.json({ tags });
    } catch (error) {
        console.error('Erreur récupération tags:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des tags' });
    }
});

/**
 * POST /admin/tags
 * Crée un nouveau tag
 *
 * Body: { name: string, color: string }
 */
router.post('/tags', (req, res) => {
    try {
        const { name, color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom du tag est requis' });
        }

        const tag = createTag(name.trim(), color || '#3498db');

        res.status(201).json({
            message: 'Tag créé avec succès',
            tag
        });
    } catch (error) {
        // Erreur de contrainte unique (tag déjà existant)
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Ce tag existe déjà' });
        }

        console.error('Erreur création tag:', error);
        res.status(500).json({ error: 'Erreur lors de la création du tag' });
    }
});

/**
 * PUT /admin/tags/:id
 * Met à jour un tag
 *
 * Body: { name: string, color: string }
 */
router.put('/tags/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, color } = req.body;

        // Vérifier que le tag existe
        const existingTag = getTagById(id);
        if (!existingTag) {
            return res.status(404).json({ error: 'Tag non trouvé' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom du tag est requis' });
        }

        const tag = updateTag(id, name.trim(), color || '#3498db');

        res.json({
            message: 'Tag mis à jour avec succès',
            tag
        });
    } catch (error) {
        // Erreur de contrainte unique (tag déjà existant)
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Ce nom de tag existe déjà' });
        }

        console.error('Erreur mise à jour tag:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du tag' });
    }
});

/**
 * DELETE /admin/tags/:id
 * Supprime un tag
 */
router.delete('/tags/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        deleteTag(id);

        res.json({
            message: 'Tag supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur suppression tag:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du tag' });
    }
});

// ============================================
// ROUTES UTILISATEURS - Admin uniquement
// ============================================

/**
 * GET /admin/users
 * Récupère les utilisateurs avec pagination et filtres optionnels
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: nombre d'utilisateurs par page (défaut: 50, max: 100)
 * - search: recherche dans email/username
 * - role: filtrer par rôle (admin/user)
 * - premium: filtrer par statut premium (true/false)
 * - sortBy: champ de tri (created_at, email, username, role, is_premium)
 * - sortOrder: ordre de tri (ASC/DESC)
 *
 * Exemple: GET /admin/users?page=2&limit=20&search=test&role=admin
 */
router.get('/users', (req, res) => {
    try {
        // 1. Extraction et validation des paramètres de requête
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const search = req.query.search || '';
        const role = req.query.role || null;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        // Conversion du paramètre premium (string -> boolean ou null)
        let premium = null;
        if (req.query.premium === 'true') premium = true;
        if (req.query.premium === 'false') premium = false;

        // 2. Récupération des utilisateurs paginés
        const users = getUsersPaginated({
            page,
            limit,
            search,
            role,
            premium,
            sortBy,
            sortOrder
        });

        // 3. Comptage total pour la pagination
        const totalUsers = countUsersFiltered({
            search,
            role,
            premium
        });

        const totalPages = Math.ceil(totalUsers / limit);

        // 4. Réponse structurée
        res.json({
            users,
            pagination: {
                page,
                limit,
                total: totalUsers,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

        // Log pour monitoring (utile en production)
        console.log(`📊 GET /admin/users - Page ${page}/${totalPages} (${users.length}/${totalUsers} users)`);

    } catch (error) {
        console.error('❌ Erreur récupération utilisateurs:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des utilisateurs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /admin/users
 * Crée un nouvel utilisateur
 */
router.post('/users', async (req, res) => {
    try {
        const { email, password, username, role, is_premium } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'L\'email et le mot de passe sont requis' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format d\'email invalide' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const user = createUser({
            email,
            password_hash,
            username: username || null,
            role: role || 'user',
            is_premium: is_premium ? 1 : 0
        });

        const { password_hash: _, ...userWithoutPassword } = user;
        res.status(201).json({ message: 'Utilisateur créé avec succès', user: userWithoutPassword });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        console.error('Erreur création utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
});

/**
 * PUT /admin/users/:id
 * Met à jour un utilisateur
 */
router.put('/users/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { email, username, role, is_premium, password } = req.body;

        const existingUser = findUserById(id);
        if (!existingUser) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const updateData = {};
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Format d\'email invalide' });
            }
            updateData.email = email;
        }
        if (username !== undefined) updateData.username = username;
        if (role !== undefined) updateData.role = role;
        if (is_premium !== undefined) updateData.is_premium = is_premium ? 1 : 0;

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
            }
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        const user = updateUser(id, updateData);
        const { password_hash: _, ...userWithoutPassword } = user;
        res.json({ message: 'Utilisateur mis à jour avec succès', user: userWithoutPassword });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        console.error('Erreur mise à jour utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
});

/**
 * DELETE /admin/users/:id
 * Supprime un utilisateur
 */
router.delete('/users/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = findUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (req.session.userId === id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const deleted = deleteUser(id);
        if (deleted) {
            res.json({ message: 'Utilisateur supprimé avec succès' });
        } else {
            res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur suppression utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
    }
});

// ============================================
// ROUTE STATISTIQUES - Admin uniquement
// ============================================

/**
 * GET /admin/stats
 * Récupère les statistiques globales du site
 */
router.get('/stats', (req, res) => {
    try {
        const videos = getAllVideos();
        const tags = getAllTags();
        const totalUsers = countUsers();

        // Stats vidéos
        const totalVideos = videos.length;
        const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
        const avgDuration = totalVideos > 0 ? Math.round(totalDuration / totalVideos) : 0;

        // Vidéos par niveau
        const videosByLevel = videos.reduce((acc, v) => {
            const level = v.level || 'B2';
            acc[level] = (acc[level] || 0) + 1;
            return acc;
        }, {});

        // Tags les plus utilisés
        const tagUsage = {};
        videos.forEach(v => {
            v.tags.forEach(t => {
                tagUsage[t.name] = (tagUsage[t.name] || 0) + 1;
            });
        });

        const stats = {
            overview: {
                totalVideos,
                totalUsers,
                totalTags: tags.length,
                totalDuration,
                avgDuration
            },
            videosByLevel,
            tagUsage,
            recentVideos: videos.slice(0, 5).map(v => ({
                id: v.id,
                title: v.title,
                level: v.level,
                created_at: v.created_at
            }))
        };

        res.json(stats);
    } catch (error) {
        console.error('Erreur récupération stats:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

module.exports = router;
