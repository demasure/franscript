const express = require('express');
const {
    getAllVideos,
    getVideoById,
    createVideo,
    updateVideo,
    deleteVideo,
    getAllTags,
    createTag,
    deleteTag
} = require('./database');

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
 *   is_paid: boolean
 *   tagIds: number[] (IDs des tags)
 * }
 */
router.post('/videos', (req, res) => {
    try {
        const { title, description, video_url, subtitle_url, is_paid, tagIds } = req.body;

        // Validation
        if (!title || !video_url) {
            return res.status(400).json({
                error: 'Le titre et l\'URL de la vidéo sont requis'
            });
        }

        const video = createVideo({
            title,
            description: description || '',
            video_url,
            subtitle_url,
            is_paid: is_paid || false,
            tagIds: tagIds || []
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
 *   is_paid: boolean
 *   tagIds: number[]
 * }
 */
router.put('/videos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, video_url, subtitle_url, is_paid, tagIds } = req.body;

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

        const video = updateVideo(id, {
            title,
            description: description || '',
            video_url,
            subtitle_url,
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

module.exports = router;
