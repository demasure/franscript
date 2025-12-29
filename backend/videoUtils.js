const { getVideoDurationInSeconds } = require('get-video-duration');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

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

/**
 * Extrait une image d'affiche d'une vidéo
 * SOURCE UNIQUE: génère cover_image pour TOUS les contenus
 * @param {string} videoPath - Chemin relatif de la vidéo (ex: "videos/ma_video.mp4")
 * @param {number} videoId - ID de la vidéo/contenu pour nommer l'image
 * @returns {Promise<string|null>} Le chemin relatif de l'image (cover_image) ou null si erreur
 */
async function extractThumbnail(videoPath, videoId) {
    return new Promise(async (resolve) => {
        try {
            // Préparer les chemins
            let fullVideoPath = videoPath;
            if (videoPath.startsWith('videos/')) {
                fullVideoPath = path.join(__dirname, '..', videoPath);
            }

            // Vérifier que le fichier existe
            if (!fs.existsSync(fullVideoPath)) {
                console.error(`❌ Fichier vidéo introuvable: ${fullVideoPath}`);
                resolve(null);
                return;
            }

            // Créer le dossier thumbnails s'il n'existe pas
            const thumbnailsDir = path.join(__dirname, '..', 'thumbnails');
            if (!fs.existsSync(thumbnailsDir)) {
                fs.mkdirSync(thumbnailsDir, { recursive: true });
            }

            // Nom du fichier thumbnail
            const thumbnailFileName = `video-${videoId}.jpg`;
            const thumbnailPath = path.join(thumbnailsDir, thumbnailFileName);
            const relativeThumbnailPath = `thumbnails/${thumbnailFileName}`;

            // Extraire le thumbnail à 10% de la durée de la vidéo
            ffmpeg(fullVideoPath)
                .screenshots({
                    timestamps: ['10%'],
                    filename: thumbnailFileName,
                    folder: thumbnailsDir,
                    size: '400x225'
                })
                .on('end', () => {
                    console.log(`✅ Thumbnail créé: ${relativeThumbnailPath}`);
                    resolve(relativeThumbnailPath);
                })
                .on('error', (err) => {
                    console.error(`❌ Erreur extraction thumbnail: ${err.message}`);
                    resolve(null);
                });

        } catch (error) {
            console.error(`❌ Erreur lors de l'extraction du thumbnail:`, error.message);
            resolve(null);
        }
    });
}

module.exports = {
    detectVideoDuration,
    extractThumbnail
};
