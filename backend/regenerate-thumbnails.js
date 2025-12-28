const { getAllVideos, updateVideo } = require('./database');
const { extractThumbnail } = require('./videoUtils');

/**
 * Régénère tous les thumbnails pour toutes les vidéos existantes
 */
async function regenerateAllThumbnails() {
    console.log('🎬 Début de la régénération des thumbnails...\n');

    const videos = getAllVideos();
    console.log(`📹 ${videos.length} vidéo(s) trouvée(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const video of videos) {
        console.log(`\n📹 Traitement: ${video.title} (ID: ${video.id})`);
        console.log(`   Vidéo: ${video.video_url}`);

        try {
            // Extraire le thumbnail
            const thumbnailPath = await extractThumbnail(video.video_url, video.id);

            if (thumbnailPath) {
                // Mettre à jour la base de données
                updateVideo(video.id, {
                    ...video,
                    thumbnail_url: thumbnailPath,
                    tagIds: video.tags.map(t => t.id)
                });

                console.log(`   ✅ Thumbnail créé: ${thumbnailPath}`);
                successCount++;
            } else {
                console.log(`   ❌ Échec de création du thumbnail`);
                errorCount++;
            }
        } catch (error) {
            console.error(`   ❌ Erreur:`, error.message);
            errorCount++;
        }
    }

    console.log('\n\n=== RÉSUMÉ ===');
    console.log(`✅ Réussis: ${successCount}`);
    console.log(`❌ Échoués: ${errorCount}`);
    console.log(`📊 Total: ${videos.length}`);
}

// Exécuter
regenerateAllThumbnails()
    .then(() => {
        console.log('\n✅ Script terminé');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
