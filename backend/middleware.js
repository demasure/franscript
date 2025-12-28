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
    console.log('🔐 [requireAuth] Session:', req.session);
    console.log('🔐 [requireAuth] userId:', req.session.userId);
    if (!req.session.userId) {
        console.log('❌ [requireAuth] REJET: pas de userId');
        return res.status(401).json({
            error: 'Authentification requise'
        });
    }
    console.log('✅ [requireAuth] OK');
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
    console.log('👑 [requireAdmin] Session:', req.session);
    console.log('👑 [requireAdmin] userId:', req.session.userId);
    console.log('👑 [requireAdmin] userRole:', req.session.userRole);
    if (!req.session.userId) {
        console.log('❌ [requireAdmin] REJET: pas de userId');
        return res.status(401).json({
            error: 'Authentification requise'
        });
    }

    if (req.session.userRole !== 'admin') {
        console.log('❌ [requireAdmin] REJET: rôle =', req.session.userRole, '(pas admin)');
        return res.status(403).json({
            error: 'Accès réservé aux administrateurs'
        });
    }

    console.log('✅ [requireAdmin] OK');
    next();
}

module.exports = {
    requireAuth,
    requireAdmin
};
