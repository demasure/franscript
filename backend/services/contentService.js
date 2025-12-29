/**
 * Service de gestion du contenu et des permissions premium
 *
 * Logique d'héritage premium :
 * - Un nœud est premium si LUI ou UN DE SES PARENTS est premium
 * - Vérification récursive en remontant l'arbre
 */

const { getNodeById, getNodePath, findUserById } = require('../database');

/**
 * Vérifie si un nœud est premium (avec héritage depuis les parents)
 * @param {number} nodeId - ID du nœud
 * @returns {Promise<boolean>} true si le nœud ou un parent est premium
 */
async function isNodePremium(nodeId) {
    const path = getNodePath(nodeId);

    // Parcourir le chemin : si un nœud est premium, tout le sous-arbre l'est
    for (const node of path) {
        if (node.is_premium === 1) {
            return true;
        }
    }

    return false;
}

/**
 * Vérifie si un utilisateur peut accéder à un nœud
 * @param {number|null} userId - ID de l'utilisateur (null si non connecté)
 * @param {number} nodeId - ID du nœud
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canUserAccessNode(userId, nodeId) {
    // Vérifier si le nœud est premium
    const isPremium = await isNodePremium(nodeId);

    // Si le nœud n'est pas premium, accès libre
    if (!isPremium) {
        return { allowed: true };
    }

    // Nœud premium : vérifier l'utilisateur
    if (!userId) {
        return {
            allowed: false,
            reason: 'Vous devez vous connecter pour accéder à ce contenu premium'
        };
    }

    // Récupérer l'utilisateur
    const user = findUserById(userId);
    if (!user) {
        return {
            allowed: false,
            reason: 'Utilisateur introuvable'
        };
    }

    // Les admins ont accès à tout
    if (user.role === 'admin') {
        return { allowed: true };
    }

    // Vérifier si l'utilisateur est premium
    if (user.is_premium === 1) {
        return { allowed: true };
    }

    // Utilisateur non premium
    return {
        allowed: false,
        reason: 'Ce contenu est réservé aux membres Premium. Passez à Premium pour y accéder !'
    };
}

/**
 * Récupère un nœud avec ses informations de contexte et d'accès
 * @param {number} nodeId - ID du nœud
 * @param {number|null} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<object>} Nœud avec contexte
 */
async function getNodeWithContext(nodeId, userId = null) {
    const node = getNodeById(nodeId);
    if (!node) {
        return null;
    }

    const path = getNodePath(nodeId);
    const isPremium = await isNodePremium(nodeId);
    const accessCheck = await canUserAccessNode(userId, nodeId);

    return {
        node,
        path,
        isPremium,
        access: accessCheck
    };
}

module.exports = {
    isNodePremium,
    canUserAccessNode,
    getNodeWithContext
};
