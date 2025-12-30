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
    // Content Nodes (structure arborescente)
    getRootNodes,
    getChildNodes,
    getNodeById,
    getNodeWithInheritedTags,
    createNode,
    updateNode,
    deleteNode,
    getNodePath,
    db
} = require('./database');
const { detectVideoDuration, extractThumbnail } = require('./videoUtils');

const router = express.Router();

// ============================================
// ROUTES VIDÉOS - Admin uniquement
// ============================================

/**
 * GET /admin/videos
 * Récupère toutes les vidéos (ancien système)
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
 * GET /admin/videos/all-with-paths
 * Récupère toutes les vidéos du système ContentNode avec leur chemin arborescent
 */
router.get('/videos/all-with-paths', (req, res) => {
    try {
        // Récupérer toutes les vidéos (ContentNode de type 'video')
        const videos = db.prepare(`
            SELECT * FROM content_nodes
            WHERE type = 'video'
            ORDER BY created_at DESC
        `).all();

        // Pour chaque vidéo, récupérer son chemin complet et ses tags
        const videosWithPaths = videos.map(video => {
            const path = getNodePath(video.id);
            const tags = db.prepare(`
                SELECT t.* FROM tags t
                INNER JOIN content_node_tags cnt ON t.id = cnt.tag_id
                WHERE cnt.node_id = ?
            `).all(video.id);

            return {
                ...video,
                path,
                tags
            };
        });

        res.json({ videos: videosWithPaths });
    } catch (error) {
        console.error('Erreur récupération vidéos avec chemins:', error);
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
// ROUTES CONTENT NODES - Admin uniquement
// ============================================

/**
 * GET /admin/content/roots
 * Récupère tous les nœuds racines
 */
router.get('/content/roots', (req, res) => {
    try {
        const nodes = getRootNodes();
        res.json({ nodes });
    } catch (error) {
        console.error('Erreur récupération nœuds racines:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /admin/content/:id/children
 * Récupère les enfants d'un nœud
 */
router.get('/content/:id/children', (req, res) => {
    try {
        const parentId = parseInt(req.params.id);
        const children = getChildNodes(parentId);
        res.json({ children });
    } catch (error) {
        console.error('Erreur récupération enfants:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /admin/content/:id
 * Récupère un nœud par son ID avec tags locaux ET hérités
 */
router.get('/content/:id', (req, res) => {
    try {
        const node = getNodeWithInheritedTags(parseInt(req.params.id));
        if (!node) {
            return res.status(404).json({ error: 'Nœud introuvable' });
        }
        res.json({ node });
    } catch (error) {
        console.error('Erreur récupération nœud:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /admin/content
 * Crée un nouveau nœud (dossier ou vidéo)
 */
router.post('/content', async (req, res) => {
    try {
        const {
            parent_id,
            title,
            description,
            type,
            video_url,
            subtitle_url,
            cover_url,
            is_premium,
            order_index,
            tagIds
        } = req.body;

        if (!title || !type) {
            return res.status(400).json({ error: 'Titre et type requis' });
        }

        if (type === 'video' && !video_url) {
            return res.status(400).json({ error: 'URL vidéo requise pour type video' });
        }

        // Détecter durée si vidéo
        let duration = null;
        if (type === 'video') {
            duration = await detectVideoDuration(video_url);
        }

        const node = createNode({
            parent_id,
            title,
            description,
            type,
            video_url,
            subtitle_url,
            cover_url,
            duration,
            is_premium: is_premium || false,
            order_index: order_index || 0,
            tagIds: tagIds || []
        });

        // Génération automatique de thumbnail si pas de cover_url
        if (type === 'video' && video_url && !cover_url) {
            extractThumbnail(video_url, node.id).then(thumbnailPath => {
                if (thumbnailPath) {
                    // Récupérer les tags existants pour ne pas les écraser
                    const existingTags = node.tags ? node.tags.map(t => t.id) : [];
                    updateNode(node.id, {
                        ...node,
                        cover_url: thumbnailPath,
                        tagIds: existingTags
                    });
                    console.log(`✅ Thumbnail auto-généré pour "${title}": ${thumbnailPath}`);
                }
            }).catch(err => {
                console.error(`❌ Erreur génération thumbnail pour "${title}":`, err.message);
            });
        }

        res.status(201).json({ message: 'Nœud créé', node });
    } catch (error) {
        console.error('Erreur création nœud:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /admin/content/:id
 * Met à jour un nœud
 */
router.put('/content/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existingNode = getNodeById(id);

        if (!existingNode) {
            return res.status(404).json({ error: 'Nœud introuvable' });
        }

        const {
            title,
            description,
            video_url,
            subtitle_url,
            cover_url,
            is_premium,
            order_index,
            tagIds
        } = req.body;

        // Détecter durée si URL changée
        let duration = existingNode.duration;
        if (existingNode.type === 'video' && video_url && video_url !== existingNode.video_url) {
            duration = await detectVideoDuration(video_url);
        }

        const node = updateNode(id, {
            title,
            description,
            video_url,
            subtitle_url,
            cover_url,
            duration,
            is_premium,
            order_index,
            tagIds
        });

        // Génération automatique de thumbnail si :
        // - c'est une vidéo
        // - le video_url a changé OU il n'y avait pas de cover_url
        // - pas de cover_url fourni dans la requête
        const videoUrlChanged = video_url && video_url !== existingNode.video_url;
        const noCoverUrl = !cover_url && !existingNode.cover_url;

        if (existingNode.type === 'video' && video_url && (videoUrlChanged || noCoverUrl) && cover_url === undefined) {
            extractThumbnail(video_url, id).then(thumbnailPath => {
                if (thumbnailPath) {
                    // Récupérer les tags existants pour ne pas les écraser
                    const existingTags = node.tags ? node.tags.map(t => t.id) : [];
                    updateNode(id, {
                        ...node,
                        cover_url: thumbnailPath,
                        tagIds: existingTags
                    });
                    console.log(`✅ Thumbnail auto-généré pour "${node.title}": ${thumbnailPath}`);
                }
            }).catch(err => {
                console.error(`❌ Erreur génération thumbnail pour "${node.title}":`, err.message);
            });
        }

        res.json({ message: 'Nœud mis à jour', node });
    } catch (error) {
        console.error('Erreur mise à jour nœud:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * DELETE /admin/content/:id
 * Supprime un nœud (et ses enfants via CASCADE)
 */
router.delete('/content/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const node = getNodeById(id);

        if (!node) {
            return res.status(404).json({ error: 'Nœud introuvable' });
        }

        deleteNode(id);
        res.json({ message: 'Nœud supprimé' });
    } catch (error) {
        console.error('Erreur suppression nœud:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
