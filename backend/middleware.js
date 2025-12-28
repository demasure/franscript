/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 *
 * Vérifie si une session existe avec un userId
 * Si oui, continue vers la route suivante
 * Sinon, renvoie une erreur 401
 *
 * Usage:
 *   app.get('/protected', requireAuth, (req, res) => { ... })
 */
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Authentification requise'
        });
    }
    next();
}

/**
 * Middleware pour vérifier si l'utilisateur est admin
 *
 * Vérifie si l'utilisateur est connecté ET a le rôle admin
 * Si oui, continue vers la route suivante
 * Sinon, renvoie une erreur 403 (Forbidden)
 *
 * Usage:
 *   app.get('/admin/users', requireAuth, requireAdmin, (req, res) => { ... })
 *
 * Note: Toujours utiliser requireAuth AVANT requireAdmin
 */
function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Authentification requise'
        });
    }

    if (req.session.userRole !== 'admin') {
        return res.status(403).json({
            error: 'Accès réservé aux administrateurs'
        });
    }

    next();
}

/**
 * Middleware pour vérifier l'accès à une vidéo payante
 *
 * Vérifie si la vidéo est payante (is_paid = 1)
 * Si oui, vérifie que l'utilisateur est premium (is_premium = 1)
 * Sinon, renvoie une erreur 403 (Forbidden)
 *
 * Usage: Ajouter ce middleware sur les routes qui servent le contenu vidéo
 *
 * IMPORTANT: La logique doit être côté backend pour la sécurité
 */
function checkVideoAccess(req, res, next) {
    const { getVideoById, findUserById } = require('./database');

    // Récupérer l'ID de la vidéo (peut être dans params ou query selon la route)
    const videoId = parseInt(req.params.videoId || req.query.id);

    if (!videoId) {
        return res.status(400).json({ error: 'ID vidéo requis' });
    }

    const video = getVideoById(videoId);

    if (!video) {
        return res.status(404).json({ error: 'Vidéo introuvable' });
    }

    // Si la vidéo n'est pas payante, accès libre
    if (!video.is_paid) {
        return next();
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

    // Utilisateur premium : accès autorisé
    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    checkVideoAccess
};
