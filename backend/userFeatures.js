const express = require('express');
const {
    getCommentsByVideo,
    createComment,
    deleteComment,
    hasUserLikedComment,
    likeComment,
    unlikeComment,
    getNotesByUserAndVideo,
    createNote,
    updateNote,
    deleteNote,
    findUserById
} = require('./database');

const router = express.Router();

// ============================================
// ROUTES COMMENTAIRES
// ============================================

/**
 * GET /comments/:videoId
 * Récupère tous les commentaires d'une vidéo
 */
router.get('/comments/:videoId', (req, res) => {
    try {
        const videoId = parseInt(req.params.videoId);
        const comments = getCommentsByVideo(videoId);

        // Si l'utilisateur est connecté, ajouter l'info "liked_by_user"
        if (req.session.userId) {
            comments.forEach(comment => {
                comment.liked_by_user = hasUserLikedComment(req.session.userId, comment.id);
            });
        }

        res.json(comments);
    } catch (error) {
        console.error('Erreur récupération commentaires:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /comments
 * Crée un nouveau commentaire
 * Body: { video_id, text }
 */
router.post('/comments', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        console.error('❌ POST /comments : session.userId manquant');
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const { video_id, node_id, text } = req.body;
        const userId = req.session.userId;

        // Accepter video_id OU node_id (rétrocompatibilité frontend)
        const contentNodeId = node_id || video_id;

        console.log('📝 POST /comments - Tentative création commentaire');
        console.log('   userId:', userId, '(type:', typeof userId, ')');
        console.log('   node_id:', contentNodeId, '(type:', typeof contentNodeId, ')');
        console.log('   text length:', text?.length || 0);

        // Validation
        if (!contentNodeId || !text || text.trim().length === 0) {
            console.error('❌ Validation échouée: node_id ou text manquant');
            return res.status(400).json({ error: 'Node ID et texte requis' });
        }

        if (text.length > 1000) {
            console.error('❌ Validation échouée: texte trop long');
            return res.status(400).json({ error: 'Commentaire trop long (max 1000 caractères)' });
        }

        // VÉRIFICATION CRITIQUE: l'utilisateur existe-t-il dans la table users ?
        const { findUserById } = require('./database');
        const user = findUserById(userId);

        if (!user) {
            console.error(`❌ FOREIGN KEY VIOLATION PRÉVENTÉE: user_id=${userId} n'existe pas dans la table users`);
            return res.status(400).json({
                error: 'Utilisateur inexistant',
                details: `L'utilisateur avec l'ID ${userId} n'existe pas dans la base de données`
            });
        }

        console.log('✅ Utilisateur trouvé:', user.username, '(id:', user.id, ')');

        // VÉRIFICATION: le content_node existe-t-il ?
        const { getNodeById } = require('./database');
        const node = getNodeById(contentNodeId);

        if (!node) {
            console.error(`❌ Content node inexistant: node_id=${contentNodeId} n'existe pas dans content_nodes`);
            return res.status(400).json({
                error: 'Contenu inexistant',
                details: `Le contenu avec l'ID ${contentNodeId} n'existe pas`
            });
        }

        console.log('✅ Content node trouvé:', node.title, '(id:', node.id, ', type:', node.type, ')');

        const comment = createComment(userId, contentNodeId, text.trim());

        console.log('✅ Commentaire créé avec succès (id:', comment.id, ')');

        res.status(201).json({
            message: 'Commentaire créé',
            comment
        });
    } catch (error) {
        console.error('❌ Erreur création commentaire:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
});

/**
 * DELETE /comments/:commentId
 * Supprime un commentaire (auteur ou admin)
 */
router.delete('/comments/:commentId', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const commentId = parseInt(req.params.commentId);

        // Vérifier si l'utilisateur est admin
        const user = findUserById(req.session.userId);
        const isAdmin = user && user.role === 'admin';

        const deleted = deleteComment(commentId, req.session.userId, isAdmin);

        if (!deleted) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        res.json({ message: 'Commentaire supprimé' });
    } catch (error) {
        console.error('Erreur suppression commentaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES LIKES
// ============================================

/**
 * POST /comments/:commentId/like
 * Like ou unlike un commentaire (toggle)
 */
router.post('/comments/:commentId/like', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.session.userId;

        // Toggle: si déjà liké, unliker, sinon liker
        const alreadyLiked = hasUserLikedComment(userId, commentId);

        if (alreadyLiked) {
            unlikeComment(userId, commentId);
            res.json({ message: 'Like retiré', liked: false });
        } else {
            likeComment(userId, commentId);
            res.json({ message: 'Like ajouté', liked: true });
        }
    } catch (error) {
        console.error('Erreur toggle like:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES NOTES PERSONNELLES
// ============================================

/**
 * GET /notes/:videoId
 * Récupère toutes les notes de l'utilisateur pour une vidéo
 */
router.get('/notes/:videoId', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const videoId = parseInt(req.params.videoId);
        const notes = getNotesByUserAndVideo(req.session.userId, videoId);

        res.json(notes);
    } catch (error) {
        console.error('Erreur récupération notes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /notes
 * Crée une nouvelle note
 * Body: { video_id, start_time, text }
 */
router.post('/notes', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const { video_id, node_id, start_time, text } = req.body;

        // Accepter video_id OU node_id (rétrocompatibilité frontend)
        const contentNodeId = node_id || video_id;

        // Validation
        if (!contentNodeId || start_time === undefined || !text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Node ID, timecode et texte requis' });
        }

        if (text.length > 500) {
            return res.status(400).json({ error: 'Note trop longue (max 500 caractères)' });
        }

        const note = createNote(req.session.userId, contentNodeId, start_time, text.trim());

        res.status(201).json({
            message: 'Note créée',
            note
        });
    } catch (error) {
        console.error('Erreur création note:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /notes/:noteId
 * Met à jour une note
 * Body: { text }
 */
router.put('/notes/:noteId', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const noteId = parseInt(req.params.noteId);
        const { text } = req.body;

        // Validation
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Texte requis' });
        }

        if (text.length > 500) {
            return res.status(400).json({ error: 'Note trop longue (max 500 caractères)' });
        }

        const updated = updateNote(noteId, req.session.userId, text.trim());

        if (!updated) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        res.json({ message: 'Note mise à jour' });
    } catch (error) {
        console.error('Erreur mise à jour note:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * DELETE /notes/:noteId
 * Supprime une note
 */
router.delete('/notes/:noteId', (req, res) => {
    // Vérifier que l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const noteId = parseInt(req.params.noteId);
        const deleted = deleteNote(noteId, req.session.userId);

        if (!deleted) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        res.json({ message: 'Note supprimée' });
    } catch (error) {
        console.error('Erreur suppression note:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
