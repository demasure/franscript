/**
 * SYNCHRONISATION AUTOMATIQUE DE LA BASE DE DONNÉES
 *
 * Ce script s'exécute au démarrage du serveur pour garantir que:
 * - Toutes les vidéos de l'ancienne table "videos" sont dans "content_nodes"
 * - Les foreign keys fonctionnent correctement
 * - L'application est "pastproof" (fonctionne avec les données existantes)
 */

const Database = require('better-sqlite3');
const path = require('path');

function syncDatabase(dbPath) {
    const db = new Database(dbPath);

    console.log('🔄 Auto-sync base de données...');

    try {
        // Vérifier si la table videos existe
        const tables = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='videos'
        `).get();

        if (!tables) {
            console.log('   ✅ Pas de table "videos" legacy - structure moderne OK');
            db.close();
            return { migrated: 0, skipped: 0 };
        }

        // Récupérer toutes les vidéos
        const oldVideos = db.prepare('SELECT * FROM videos').all();

        if (oldVideos.length === 0) {
            console.log('   ✅ Table "videos" vide - rien à migrer');
            db.close();
            return { migrated: 0, skipped: 0 };
        }

        let migratedCount = 0;
        let skippedCount = 0;

        // Migrer chaque vidéo qui n'est pas déjà dans content_nodes
        const checkStmt = db.prepare('SELECT id FROM content_nodes WHERE id = ?');
        const insertStmt = db.prepare(`
            INSERT INTO content_nodes (id, title, type, video_url, subtitle_url, cover_url, description, parent_id, is_premium, created_at)
            VALUES (?, ?, 'video', ?, ?, ?, ?, NULL, ?, ?)
        `);

        for (const video of oldVideos) {
            const exists = checkStmt.get(video.id);

            if (exists) {
                skippedCount++;
                continue;
            }

            try {
                insertStmt.run(
                    video.id,
                    video.title,
                    video.video_url,
                    video.subtitle_url,
                    video.cover_image || video.cover_url || video.thumbnail_url,
                    video.description || '',
                    video.is_premium || video.is_paid || 0,
                    video.created_at || new Date().toISOString()
                );
                migratedCount++;
            } catch (error) {
                console.error(`   ⚠️  Erreur migration vidéo ID ${video.id}:`, error.message);
            }
        }

        if (migratedCount > 0) {
            console.log(`   ✅ ${migratedCount} vidéo(s) migrée(s) depuis table "videos"`);
        }
        if (skippedCount > 0) {
            console.log(`   ⏭️  ${skippedCount} vidéo(s) déjà présente(s)`);
        }

        db.close();
        return { migrated: migratedCount, skipped: skippedCount };

    } catch (error) {
        console.error('❌ Erreur auto-sync:', error.message);
        db.close();
        throw error;
    }
}

// Export pour utilisation dans server.js
module.exports = { syncDatabase };

// Si exécuté directement
if (require.main === module) {
    const dbPath = path.join(__dirname, 'franscript.db');
    const result = syncDatabase(dbPath);
    console.log('\n📊 Résumé:', result);
}
