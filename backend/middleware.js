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

module.exports = {
    requireAuth,
    requireAdmin
};
