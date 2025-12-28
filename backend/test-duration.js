const { getAllVideos } = require('./database');
const { detectVideoDuration } = require('./videoUtils');

async function testDuration() {
    console.log('=== TEST DE DÉTECTION DE DURÉE ===\n');

    const videos = getAllVideos();

    if (videos.length === 0) {
        console.log('❌ Aucune vidéo dans la base de données');
        return;
    }

    for (const video of videos) {
        console.log(`\n📹 Vidéo: ${video.title}`);
        console.log(`   URL: ${video.video_url}`);
        console.log(`   Durée en DB: ${video.duration ? video.duration + 's' : 'NULL'}`);

        // Tester la détection
        console.log(`   Test de détection...`);
        const detectedDuration = await detectVideoDuration(video.video_url);

        if (detectedDuration) {
            console.log(`   ✅ Durée détectée: ${detectedDuration}s (${Math.floor(detectedDuration/60)}:${(detectedDuration%60).toString().padStart(2, '0')})`);
        } else {
            console.log(`   ❌ Impossible de détecter la durée`);
            console.log(`   → Vérifiez que le fichier existe à: ${video.video_url}`);
        }
    }
}

testDuration().catch(console.error);
