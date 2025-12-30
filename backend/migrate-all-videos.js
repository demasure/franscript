const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('🔄 MIGRATION AUTOMATIQUE DES VIDÉOS VERS CONTENT_NODES\n');

try {
    // Vérifier si la table videos existe encore
    const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
    `).all();

    console.log('📋 Tables existantes:');
    tables.forEach(t => console.log('   -', t.name));

    const hasVideosTable = tables.some(t => t.name === 'videos');

    if (hasVideosTable) {
        console.log('\n✅ Table "videos" trouvée - migration nécessaire\n');

        // Récupérer toutes les vidéos de l'ancienne table
        const oldVideos = db.prepare('SELECT * FROM videos').all();
        console.log(`📹 ${oldVideos.length} vidéo(s) dans l'ancienne table "videos"`);

        // Récupérer les IDs déjà présents dans content_nodes
        const existingNodeIds = db.prepare(`
            SELECT id FROM content_nodes WHERE type = 'video'
        `).all().map(n => n.id);

        console.log(`📦 ${existingNodeIds.length} vidéo(s) déjà dans "content_nodes"`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Migrer chaque vidéo qui n'est pas déjà dans content_nodes
        for (const video of oldVideos) {
            // Vérifier si cette vidéo existe déjà dans content_nodes
            const existingNode = db.prepare(`
                SELECT * FROM content_nodes WHERE id = ?
            `).get(video.id);

            if (existingNode) {
                console.log(`   ⏭️  ID ${video.id} (${video.title}) - déjà dans content_nodes`);
                skippedCount++;
                continue;
            }

            try {
                // Insérer dans content_nodes avec le même ID
                db.prepare(`
                    INSERT INTO content_nodes (id, title, type, video_url, subtitle_url, cover_url, description, parent_id, is_premium, created_at, updated_at)
                    VALUES (?, ?, 'video', ?, ?, ?, ?, NULL, ?, ?, ?)
                `).run(
                    video.id,
                    video.title,
                    video.video_url,
                    video.subtitle_url,
                    video.cover_image || video.cover_url, // Compatibilité cover_image → cover_url
                    video.description || '',
                    video.is_premium || 0,
                    video.created_at || new Date().toISOString(),
                    video.updated_at || new Date().toISOString()
                );

                console.log(`   ✅ ID ${video.id} (${video.title}) - migré vers content_nodes`);
                migratedCount++;
            } catch (error) {
                console.error(`   ❌ ID ${video.id} - erreur: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n📊 RÉSUMÉ:');
        console.log(`   ✅ ${migratedCount} vidéo(s) migrée(s)`);
        console.log(`   ⏭️  ${skippedCount} vidéo(s) déjà présente(s)`);
        if (errorCount > 0) {
            console.log(`   ❌ ${errorCount} erreur(s)`);
        }

        // Vérifier maintenant que tous les IDs de videos existent dans content_nodes
        console.log('\n🔍 VÉRIFICATION FINALE:');
        const allVideoIds = oldVideos.map(v => v.id);
        const missingIds = [];

        for (const videoId of allVideoIds) {
            const exists = db.prepare('SELECT id FROM content_nodes WHERE id = ?').get(videoId);
            if (!exists) {
                missingIds.push(videoId);
            }
        }

        if (missingIds.length === 0) {
            console.log('   ✅ Toutes les vidéos sont maintenant dans content_nodes');
        } else {
            console.error(`   ❌ ${missingIds.length} vidéo(s) manquante(s):`, missingIds);
        }

    } else {
        console.log('\n⚠️  Table "videos" introuvable');
        console.log('   Soit elle a été supprimée, soit toutes les données sont déjà dans content_nodes');

        // Afficher les content_nodes existants
        const nodes = db.prepare('SELECT id, title, type FROM content_nodes ORDER BY id').all();
        console.log(`\n📦 ${nodes.length} content_node(s) dans la base:`);
        nodes.forEach(n => {
            console.log(`   - ID ${n.id}: "${n.title}" (${n.type})`);
        });
    }

    console.log('\n✅ Script terminé');

} catch (error) {
    console.error('❌ Erreur:', error);
    console.error(error.stack);
    process.exit(1);
} finally {
    db.close();
}
