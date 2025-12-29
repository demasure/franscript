/**
 * ============================================
 * ADMIN API MODULE
 * ============================================
 *
 * Couche d'abstraction pour tous les appels API admin.
 * Sépare strictement l'accès aux données de la logique UI.
 *
 * Principes:
 * - Une seule source de vérité (la BDD via l'API)
 * - Aucune donnée hardcodée
 * - Gestion d'erreurs centralisée
 * - Prêt pour mise en cache future
 */

const API_URL = 'http://localhost:3000';

// ============================================
// GESTION DES UTILISATEURS
// ============================================

/**
 * Récupère les utilisateurs avec pagination et filtres
 *
 * @param {Object} options - Options de requête
 * @param {number} [options.page=1] - Numéro de page
 * @param {number} [options.limit=50] - Nombre d'éléments par page
 * @param {string} [options.search=''] - Recherche dans email/username
 * @param {string} [options.role] - Filtrer par rôle (admin/user)
 * @param {boolean} [options.premium] - Filtrer par statut premium
 * @param {string} [options.sortBy='created_at'] - Champ de tri
 * @param {string} [options.sortOrder='DESC'] - Ordre de tri
 * @returns {Promise<Object>} { users: Array, pagination: Object }
 * @throws {Error} En cas d'erreur réseau ou serveur
 */
async function getUsers(options = {}) {
    const {
        page = 1,
        limit = 50,
        search = '',
        role = null,
        premium = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
    } = options;

    // Construction des query params
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);

    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (premium !== null) params.append('premium', premium);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const url = `${API_URL}/admin/users?${params.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
            throw new Error('AUTH_REQUIRED');
        }

        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Crée un nouvel utilisateur
 *
 * @param {Object} userData - Données de l'utilisateur
 * @param {string} userData.email - Email (requis, unique)
 * @param {string} userData.password - Mot de passe (requis, min 6 caractères)
 * @param {string} [userData.username] - Pseudo (optionnel)
 * @param {string} [userData.role='user'] - Rôle (admin/user)
 * @param {boolean} [userData.is_premium=false] - Statut premium
 * @returns {Promise<Object>} { message: string, user: Object }
 * @throws {Error} En cas de validation échouée ou erreur serveur
 */
async function createUser(userData) {
    const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Met à jour un utilisateur existant
 *
 * @param {number} userId - ID de l'utilisateur
 * @param {Object} userData - Données à mettre à jour
 * @param {string} [userData.email] - Nouvel email
 * @param {string} [userData.password] - Nouveau mot de passe (optionnel)
 * @param {string} [userData.username] - Nouveau pseudo
 * @param {string} [userData.role] - Nouveau rôle
 * @param {boolean} [userData.is_premium] - Nouveau statut premium
 * @returns {Promise<Object>} { message: string, user: Object }
 * @throws {Error} En cas d'erreur
 */
async function updateUser(userId, userData) {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Supprime un utilisateur
 *
 * @param {number} userId - ID de l'utilisateur à supprimer
 * @returns {Promise<Object>} { message: string }
 * @throws {Error} En cas d'erreur
 */
async function deleteUser(userId) {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
}

// ============================================
// EXPORTS
// ============================================

/**
 * API publique du module
 */
window.AdminAPI = {
    users: {
        getAll: getUsers,
        create: createUser,
        update: updateUser,
        delete: deleteUser
    }
};
