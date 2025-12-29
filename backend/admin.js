const express = require('express');
const bcrypt = require('bcrypt');
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
    // Nouveau modèle Saga/Saison/Episode
    getAllSagas,
    getSagaById,
    createSaga,
    updateSaga,
    deleteSaga,
    getSaisonsBySaga,
    getSaisonById,
    createSaison,
    updateSaison,
    deleteSaison,
    getEpisodesBySaison,
    getEpisodeById,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    db
} = require('./database');
const { detectVideoDuration, extractThumbnail } = require('./videoUtils');

const router = express.Router();

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
 *   level: string (B2, C1, C2)
 *   duration: number (en secondes)
 *   is_paid: boolean
 *   tagIds: number[] (IDs des tags)
 * }
 */
router.post('/videos', async (req, res) => {
    try {
        const { title, description, video_url, subtitle_url, level, is_paid, tagIds } = req.body;

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
            thumbnail_url: null, // Sera mis à jour juste après
            level: level || 'B2',
            duration: detectedDuration,
            is_paid: is_paid || false,
            tagIds: tagIds || []
        });

        // Extraire le thumbnail après création (en arrière-plan)
        extractThumbnail(video_url, video.id).then(thumbnailPath => {
            if (thumbnailPath) {
                updateVideo(video.id, {
                    ...video,
                    thumbnail_url: thumbnailPath,
                    tagIds: video.tags.map(t => t.id)
                });
            }
        });

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
 *   level: string (B2, C1, C2)
 *   duration: number (en secondes)
 *   is_paid: boolean
 *   tagIds: number[]
 * }
 */
router.put('/videos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, video_url, subtitle_url, level, is_paid, tagIds } = req.body;

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
        let thumbnailUrl = existingVideo.thumbnail_url;

        if (video_url !== existingVideo.video_url) {
            detectedDuration = await detectVideoDuration(video_url);
            console.log(`📹 Durée détectée pour "${title}": ${detectedDuration ? detectedDuration + 's' : 'Non détectée'}`);

            // Extraire nouveau thumbnail en arrière-plan
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

        const video = updateVideo(id, {
            title,
            description: description || '',
            video_url,
            subtitle_url,
            thumbnail_url: thumbnailUrl,
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

// ============================================
// ROUTES SAGAS - Admin uniquement
// ============================================

/**
 * GET /admin/sagas
 * Récupère toutes les sagas
 */
router.get('/sagas', (req, res) => {
    try {
        const sagas = getAllSagas();
        res.json({ sagas });
    } catch (error) {
        console.error('Erreur récupération sagas:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des sagas' });
    }
});

/**
 * GET /admin/sagas/:id
 * Récupère une saga par son ID
 */
router.get('/sagas/:id', (req, res) => {
    try {
        const saga = getSagaById(parseInt(req.params.id));
        if (!saga) {
            return res.status(404).json({ error: 'Saga non trouvée' });
        }
        res.json({ saga });
    } catch (error) {
        console.error('Erreur récupération saga:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la saga' });
    }
});

/**
 * POST /admin/sagas
 * Crée une nouvelle saga
 */
router.post('/sagas', (req, res) => {
    try {
        const { title, description, cover_image, is_premium, type, tagIds } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Le titre est requis' });
        }

        const saga = createSaga({
            title,
            description,
            cover_image,
            is_premium: is_premium || false,
            type: type || 'serie',
            tagIds: tagIds || []
        });

        res.status(201).json({
            message: 'Saga créée avec succès',
            saga
        });
    } catch (error) {
        console.error('Erreur création saga:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la saga' });
    }
});

/**
 * PUT /admin/sagas/:id
 * Met à jour une saga
 */
router.put('/sagas/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, cover_image, is_premium, type, tagIds } = req.body;

        const existingSaga = getSagaById(id);
        if (!existingSaga) {
            return res.status(404).json({ error: 'Saga non trouvée' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Le titre est requis' });
        }

        const saga = updateSaga(id, {
            title,
            description,
            cover_image,
            is_premium: is_premium || false,
            type: type || 'serie',
            tagIds: tagIds || []
        });

        res.json({
            message: 'Saga mise à jour avec succès',
            saga
        });
    } catch (error) {
        console.error('Erreur mise à jour saga:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la saga' });
    }
});

/**
 * DELETE /admin/sagas/:id
 * Supprime une saga
 */
router.delete('/sagas/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const saga = getSagaById(id);
        if (!saga) {
            return res.status(404).json({ error: 'Saga non trouvée' });
        }

        deleteSaga(id);
        res.json({ message: 'Saga supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression saga:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la saga' });
    }
});

// ============================================
// ROUTES SAISONS - Admin uniquement
// ============================================

/**
 * GET /admin/saisons/saga/:sagaId
 * Récupère toutes les saisons d'une saga
 */
router.get('/saisons/saga/:sagaId', (req, res) => {
    try {
        const sagaId = parseInt(req.params.sagaId);
        const saisons = getSaisonsBySaga(sagaId);
        res.json({ saisons });
    } catch (error) {
        console.error('Erreur récupération saisons:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des saisons' });
    }
});

/**
 * GET /admin/saisons/:id
 * Récupère une saison par son ID
 */
router.get('/saisons/:id', (req, res) => {
    try {
        const saison = getSaisonById(parseInt(req.params.id));
        if (!saison) {
            return res.status(404).json({ error: 'Saison non trouvée' });
        }
        res.json({ saison });
    } catch (error) {
        console.error('Erreur récupération saison:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la saison' });
    }
});

/**
 * POST /admin/saisons
 * Crée une nouvelle saison
 */
router.post('/saisons', (req, res) => {
    try {
        const { saga_id, title, order_index, description, is_premium } = req.body;

        if (!saga_id || !title) {
            return res.status(400).json({ error: 'La saga et le titre sont requis' });
        }

        // Vérifier que la saga existe
        const saga = getSagaById(saga_id);
        if (!saga) {
            return res.status(404).json({ error: 'Saga non trouvée' });
        }

        const saison = createSaison({
            saga_id,
            title,
            order_index: order_index || 1,
            description,
            is_premium: is_premium || false
        });

        res.status(201).json({
            message: 'Saison créée avec succès',
            saison
        });
    } catch (error) {
        console.error('Erreur création saison:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la saison' });
    }
});

/**
 * PUT /admin/saisons/:id
 * Met à jour une saison
 */
router.put('/saisons/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, order_index, description, is_premium } = req.body;

        const existingSaison = getSaisonById(id);
        if (!existingSaison) {
            return res.status(404).json({ error: 'Saison non trouvée' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Le titre est requis' });
        }

        const saison = updateSaison(id, {
            title,
            order_index: order_index || 1,
            description,
            is_premium: is_premium || false
        });

        res.json({
            message: 'Saison mise à jour avec succès',
            saison
        });
    } catch (error) {
        console.error('Erreur mise à jour saison:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la saison' });
    }
});

/**
 * DELETE /admin/saisons/:id
 * Supprime une saison
 */
router.delete('/saisons/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const saison = getSaisonById(id);
        if (!saison) {
            return res.status(404).json({ error: 'Saison non trouvée' });
        }

        deleteSaison(id);
        res.json({ message: 'Saison supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression saison:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la saison' });
    }
});

// ============================================
// ROUTES EPISODES - Admin uniquement
// ============================================

/**
 * GET /admin/episodes/saison/:saisonId
 * Récupère tous les épisodes d'une saison
 */
router.get('/episodes/saison/:saisonId', (req, res) => {
    try {
        const saisonId = parseInt(req.params.saisonId);
        const episodes = getEpisodesBySaison(saisonId);
        res.json({ episodes });
    } catch (error) {
        console.error('Erreur récupération épisodes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des épisodes' });
    }
});

/**
 * GET /admin/episodes/:id
 * Récupère un épisode par son ID
 */
router.get('/episodes/:id', (req, res) => {
    try {
        const episode = getEpisodeById(parseInt(req.params.id));
        if (!episode) {
            return res.status(404).json({ error: 'Épisode non trouvé' });
        }
        res.json({ episode });
    } catch (error) {
        console.error('Erreur récupération épisode:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'épisode' });
    }
});

/**
 * POST /admin/episodes
 * Crée un nouvel épisode
 */
router.post('/episodes', async (req, res) => {
    try {
        const {
            saison_id,
            title,
            episode_number,
            video_url,
            subtitle_url,
            is_premium
        } = req.body;

        if (!saison_id || !title || !video_url) {
            return res.status(400).json({
                error: 'La saison, le titre et l\'URL vidéo sont requis'
            });
        }

        // Vérifier que la saison existe
        const saison = getSaisonById(saison_id);
        if (!saison) {
            return res.status(404).json({ error: 'Saison non trouvée' });
        }

        // Détecter automatiquement la durée
        const detectedDuration = await detectVideoDuration(video_url);

        const episode = createEpisode({
            saison_id,
            title,
            episode_number: episode_number || 1,
            video_url,
            subtitle_url,
            thumbnail_url: null,
            duration: detectedDuration,
            is_premium: is_premium || false
        });

        // Extraire le thumbnail en arrière-plan
        extractThumbnail(video_url, episode.id, 'episodes').then(thumbnailPath => {
            if (thumbnailPath) {
                updateEpisode(episode.id, {
                    ...episode,
                    thumbnail_url: thumbnailPath
                });
            }
        });

        res.status(201).json({
            message: 'Épisode créé avec succès',
            episode
        });
    } catch (error) {
        console.error('Erreur création épisode:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'épisode' });
    }
});

/**
 * PUT /admin/episodes/:id
 * Met à jour un épisode
 */
router.put('/episodes/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const {
            title,
            episode_number,
            video_url,
            subtitle_url,
            is_premium
        } = req.body;

        const existingEpisode = getEpisodeById(id);
        if (!existingEpisode) {
            return res.status(404).json({ error: 'Épisode non trouvé' });
        }

        if (!title || !video_url) {
            return res.status(400).json({
                error: 'Le titre et l\'URL vidéo sont requis'
            });
        }

        // Détecter la durée si l'URL a changé
        let detectedDuration = existingEpisode.duration;
        let thumbnailUrl = existingEpisode.thumbnail_url;

        if (video_url !== existingEpisode.video_url) {
            detectedDuration = await detectVideoDuration(video_url);

            // Extraire nouveau thumbnail en arrière-plan
            extractThumbnail(video_url, id, 'episodes').then(thumbnailPath => {
                if (thumbnailPath) {
                    updateEpisode(id, {
                        title,
                        episode_number: episode_number || 1,
                        video_url,
                        subtitle_url,
                        thumbnail_url: thumbnailPath,
                        duration: detectedDuration,
                        is_premium: is_premium || false
                    });
                }
            });
        }

        const episode = updateEpisode(id, {
            title,
            episode_number: episode_number || 1,
            video_url,
            subtitle_url,
            thumbnail_url: thumbnailUrl,
            duration: detectedDuration,
            is_premium: is_premium || false
        });

        res.json({
            message: 'Épisode mis à jour avec succès',
            episode
        });
    } catch (error) {
        console.error('Erreur mise à jour épisode:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'épisode' });
    }
});

/**
 * DELETE /admin/episodes/:id
 * Supprime un épisode
 */
router.delete('/episodes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const episode = getEpisodeById(id);
        if (!episode) {
            return res.status(404).json({ error: 'Épisode non trouvé' });
        }

        deleteEpisode(id);
        res.json({ message: 'Épisode supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression épisode:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'épisode' });
    }
});

module.exports = router;
