const { getAllVideos, updateVideo } = require('./database');
const { detectVideoDuration } = require('./videoUtils');

async function updateAllDurations() {
    console.log('=== MISE À JOUR DES DURÉES DE TOUTES LES VIDÉOS ===\n');

    const videos = getAllVideos();

    if (videos.length === 0) {
        console.log('❌ Aucune vidéo dans la base de données');
        return;
    }

    for (const video of videos) {
        console.log(`\n📹 Traitement: ${video.title}`);
        console.log(`   URL: ${video.video_url}`);
        console.log(`   Durée actuelle: ${video.duration ? video.duration + 's' : 'NULL'}`);

        // Détecter la durée
        const detectedDuration = await detectVideoDuration(video.video_url);

        if (detectedDuration) {
            console.log(`   ✅ Durée détectée: ${detectedDuration}s (${Math.floor(detectedDuration/60)}:${(detectedDuration%60).toString().padStart(2, '0')})`);

            // Mettre à jour dans la base de données
            updateVideo(video.id, {
                title: video.title,
                description: video.description || '',
                video_url: video.video_url,
                subtitle_url: video.subtitle_url,
                level: video.level || 'B2',
                duration: detectedDuration,
                is_paid: video.is_paid === 1,
                tagIds: video.tags.map(t => t.id)
            });

            console.log(`   💾 Durée sauvegardée dans la base de données`);
        } else {
            console.log(`   ❌ Impossible de détecter la durée - fichier introuvable`);
        }
    }

    console.log('\n✨ Mise à jour terminée !');
}

updateAllDurations().catch(console.error);
