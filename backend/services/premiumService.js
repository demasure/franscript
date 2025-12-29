/**
 * Service de vérification des permissions premium
 *
 * Règles :
 * - Un épisode est premium si episode.is_premium === true
 *   OU si saison.is_premium === true
 *   OU si saga.is_premium === true
 *
 * - Un utilisateur peut accéder à un épisode premium si :
 *   - user.is_premium === true
 *   - OU user.role === 'admin'
 */

const {
    getEpisodeById,
    getSaisonById,
    getSagaById,
    findUserById
} = require('../database');

/**
 * Vérifie si un épisode est premium (hiérarchiquement)
 * @param {number} episodeId - ID de l'épisode
 * @returns {Promise<boolean>} true si l'épisode est premium
 */
async function isEpisodePremium(episodeId) {
    // Récupérer l'épisode
    const episode = getEpisodeById(episodeId);
    if (!episode) {
        throw new Error(`Épisode ${episodeId} introuvable`);
    }

    // Vérifier si l'épisode lui-même est premium
    if (episode.is_premium === 1) {
        return true;
    }

    // Récupérer la saison
    const saison = getSaisonById(episode.saison_id);
    if (!saison) {
        throw new Error(`Saison ${episode.saison_id} introuvable`);
    }

    // Vérifier si la saison est premium
    if (saison.is_premium === 1) {
        return true;
    }

    // Récupérer la saga
    const saga = getSagaById(saison.saga_id);
    if (!saga) {
        throw new Error(`Saga ${saison.saga_id} introuvable`);
    }

    // Vérifier si la saga est premium
    if (saga.is_premium === 1) {
        return true;
    }

    // Aucun niveau n'est premium
    return false;
}

/**
 * Vérifie si un utilisateur peut accéder à un épisode
 * @param {number|null} userId - ID de l'utilisateur (null si non connecté)
 * @param {number} episodeId - ID de l'épisode
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canUserAccessEpisode(userId, episodeId) {
    // Vérifier si l'épisode est premium
    const isPremium = await isEpisodePremium(episodeId);

    // Si l'épisode n'est pas premium, tout le monde peut y accéder
    if (!isPremium) {
        return {
            allowed: true
        };
    }

    // Épisode premium : vérifier l'utilisateur
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
        return {
            allowed: true
        };
    }

    // Vérifier si l'utilisateur est premium
    if (user.is_premium === 1) {
        return {
            allowed: true
        };
    }

    // Utilisateur non premium
    return {
        allowed: false,
        reason: 'Ce contenu est réservé aux membres Premium. Passez à Premium pour y accéder !'
    };
}

/**
 * Récupère les informations complètes d'un épisode avec son contexte (saga, saison)
 * Inclut les informations de premium
 * @param {number} episodeId - ID de l'épisode
 * @returns {Promise<object>} Épisode avec contexte
 */
async function getEpisodeWithContext(episodeId) {
    const episode = getEpisodeById(episodeId);
    if (!episode) {
        return null;
    }

    const saison = getSaisonById(episode.saison_id);
    const saga = saison ? getSagaById(saison.saga_id) : null;

    const isPremium = await isEpisodePremium(episodeId);

    return {
        episode,
        saison,
        saga,
        isPremium
    };
}

module.exports = {
    isEpisodePremium,
    canUserAccessEpisode,
    getEpisodeWithContext
};
