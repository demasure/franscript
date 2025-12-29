/**
 * Script de migration : Vidéos → Sagas/Saisons/Episodes
 *
 * Ce script migre les vidéos existantes vers le nouveau modèle hiérarchique.
 *
 * Stratégies de migration :
 * 1. MODE AUTO : Chaque vidéo devient une saga avec 1 saison et 1 épisode
 * 2. MODE GROUPE : Toutes les vidéos sont regroupées dans une saga "Vidéos importées"
 *
 * Usage :
 * node migrate-videos-to-sagas.js [auto|groupe]
 */

const {
    getAllVideos,
    createSaga,
    createSaison,
    createEpisode
} = require('./database');

const MODE = process.argv[2] || 'auto';

console.log('🚀 Migration des vidéos vers le modèle Saga/Saison/Episode');
console.log(`📋 Mode: ${MODE === 'groupe' ? 'GROUPE (une seule saga)' : 'AUTO (une saga par vidéo)'}`);
console.log('');

async function migrateAuto() {
    console.log('🔄 Mode AUTO : Chaque vidéo → 1 saga + 1 saison + 1 épisode');
    console.log('');

    const videos = getAllVideos();

    if (videos.length === 0) {
        console.log('⚠️  Aucune vidéo à migrer');
        return;
    }

    console.log(`📹 ${videos.length} vidéo(s) à migrer`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const video of videos) {
        try {
            console.log(`📦 Migration: "${video.title}"`);

            // 1. Créer la saga (type 'film' car une seule vidéo)
            const saga = createSaga({
                title: video.title,
                description: video.description,
                cover_image: video.thumbnail_url,
                is_premium: video.is_paid === 1,
                type: 'film',
                tagIds: video.tags ? video.tags.map(t => t.id) : []
            });

            console.log(`   ✅ Saga créée (ID: ${saga.id})`);

            // 2. Créer une saison unique
            const saison = createSaison({
                saga_id: saga.id,
                title: 'Film',
                order_index: 1,
                description: null,
                is_premium: false // Hérité de la saga
            });

            console.log(`   ✅ Saison créée (ID: ${saison.id})`);

            // 3. Créer l'épisode (qui est en fait le film)
            const episode = createEpisode({
                saison_id: saison.id,
                title: video.title,
                episode_number: 1,
                video_url: video.video_url,
                subtitle_url: video.subtitle_url,
                thumbnail_url: video.thumbnail_url,
                duration: video.duration,
                is_premium: false // Hérité de la saison/saga
            });

            console.log(`   ✅ Épisode créé (ID: ${episode.id})`);
            console.log('');

            successCount++;

        } catch (error) {
            console.error(`   ❌ Erreur migration "${video.title}":`, error.message);
            errorCount++;
        }
    }

    console.log('═══════════════════════════════════════');
    console.log(`✅ Migration terminée`);
    console.log(`   Succès: ${successCount}`);
    console.log(`   Erreurs: ${errorCount}`);
    console.log('═══════════════════════════════════════');
}

async function migrateGroupe() {
    console.log('🔄 Mode GROUPE : Toutes les vidéos → 1 saga + 1 saison + N épisodes');
    console.log('');

    const videos = getAllVideos();

    if (videos.length === 0) {
        console.log('⚠️  Aucune vidéo à migrer');
        return;
    }

    console.log(`📹 ${videos.length} vidéo(s) à migrer`);
    console.log('');

    try {
        // 1. Créer la saga "Vidéos importées"
        console.log('📦 Création de la saga "Vidéos importées"...');
        const saga = createSaga({
            title: 'Vidéos importées',
            description: 'Collection de vidéos migrées depuis l\'ancien système',
            cover_image: null,
            is_premium: false,
            type: 'serie',
            tagIds: []
        });

        console.log(`   ✅ Saga créée (ID: ${saga.id})`);

        // 2. Créer une saison unique
        console.log('📦 Création de la saison...');
        const saison = createSaison({
            saga_id: saga.id,
            title: 'Saison 1',
            order_index: 1,
            description: 'Vidéos migrées',
            is_premium: false
        });

        console.log(`   ✅ Saison créée (ID: ${saison.id})`);
        console.log('');

        // 3. Créer un épisode pour chaque vidéo
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];

            try {
                console.log(`📹 Migration épisode ${i + 1}/${videos.length}: "${video.title}"`);

                const episode = createEpisode({
                    saison_id: saison.id,
                    title: video.title,
                    episode_number: i + 1,
                    video_url: video.video_url,
                    subtitle_url: video.subtitle_url,
                    thumbnail_url: video.thumbnail_url,
                    duration: video.duration,
                    is_premium: video.is_paid === 1
                });

                console.log(`   ✅ Épisode créé (ID: ${episode.id})`);
                successCount++;

            } catch (error) {
                console.error(`   ❌ Erreur migration "${video.title}":`, error.message);
                errorCount++;
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════');
        console.log(`✅ Migration terminée`);
        console.log(`   Succès: ${successCount}`);
        console.log(`   Erreurs: ${errorCount}`);
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
        process.exit(1);
    }
}

// Exécuter la migration selon le mode choisi
(async function() {
    try {
        if (MODE === 'groupe') {
            await migrateGroupe();
        } else {
            await migrateAuto();
        }

        console.log('');
        console.log('💡 Prochaines étapes :');
        console.log('   1. Vérifiez les données migrées dans la base');
        console.log('   2. Testez l\'affichage dans l\'interface admin');
        console.log('   3. Si tout est OK, vous pouvez conserver l\'ancien système en parallèle');
        console.log('      ou le désactiver progressivement');
        console.log('');

    } catch (error) {
        console.error('❌ Erreur durant la migration:', error);
        process.exit(1);
    }
})();
