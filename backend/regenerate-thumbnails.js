const { updateNode, db } = require('./database');
const { extractThumbnail } = require('./videoUtils');

/**
 * Régénère toutes les images d'affiche pour les vidéos
 * SOURCE UNIQUE: utilise cover_image pour TOUS les contenus
 */
async function regenerateAllThumbnails() {
    console.log('🎬 Début de la régénération des images d\'affiche...\n');

    // Récupérer seulement les vidéos (pas les dossiers)
    const videos = db.prepare(`
        SELECT * FROM content_nodes
        WHERE type = 'video'
    `).all();
    console.log(`📹 ${videos.length} vidéo(s) trouvée(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const video of videos) {
        console.log(`\n📹 Traitement: ${video.title} (ID: ${video.id})`);
        console.log(`   Vidéo: ${video.video_url}`);

        try {
            // Extraire l'image d'affiche
            const coverImagePath = await extractThumbnail(video.video_url, video.id);

            if (coverImagePath) {
                // Récupérer les tags existants du nœud
                const existingTags = db.prepare(`
                    SELECT tag_id FROM content_node_tags
                    WHERE node_id = ?
                `).all(video.id);

                // Mettre à jour la base de données - SOURCE UNIQUE: cover_image
                updateNode(video.id, {
                    ...video,
                    cover_image: coverImagePath,
                    tagIds: existingTags.map(t => t.tag_id)
                });

                console.log(`   ✅ Image d'affiche créée: ${coverImagePath}`);
                successCount++;
            } else {
                console.log(`   ❌ Échec de création de l'image`);
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
