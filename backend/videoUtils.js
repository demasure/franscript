const { getVideoDurationInSeconds } = require('get-video-duration');
const path = require('path');

/**
 * Détecte automatiquement la durée d'une vidéo en secondes
 * @param {string} videoPath - Chemin relatif ou absolu de la vidéo (ex: "videos/ma_video.mp4")
 * @returns {Promise<number|null>} La durée en secondes ou null si impossible
 */
async function detectVideoDuration(videoPath) {
    try {
        // Si le chemin est relatif (commence par "videos/"), le rendre absolu
        let fullPath = videoPath;
        if (videoPath.startsWith('videos/')) {
            // Le dossier videos est dans le répertoire parent du backend
            fullPath = path.join(__dirname, '..', videoPath);
        }

        const duration = await getVideoDurationInSeconds(fullPath);
        return Math.round(duration); // Arrondir à la seconde
    } catch (error) {
        console.error(`❌ Erreur lors de la détection de la durée pour ${videoPath}:`, error.message);
        return null;
    }
}

module.exports = {
    detectVideoDuration
};
