const Database = require('better-sqlite3');
const path = require('path');

/**
 * Script de migration pour adapter les tables comments, subtitle_notes et reports
 * au nouveau système ContentNode (supprimer les contraintes FOREIGN KEY vers videos)
 */

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('🔧 Migration des tables vers système ContentNode...\n');

try {
    // Vérifier quelles tables ont besoin de migration
    const commentsFKs = db.prepare('PRAGMA foreign_key_list(comments)').all();
    const notesFKs = db.prepare('PRAGMA foreign_key_list(subtitle_notes)').all();
    const reportsFKs = db.prepare('PRAGMA foreign_key_list(reports)').all();

    const commentsNeedsMigration = commentsFKs.some(fk => fk.table === 'videos');
    const notesNeedsMigration = notesFKs.some(fk => fk.table === 'videos');
    const reportsNeedsMigration = reportsFKs.some(fk => fk.table === 'videos');

    if (!commentsNeedsMigration && !notesNeedsMigration && !reportsNeedsMigration) {
        console.log('✅ Toutes les tables sont déjà migrées !');
        process.exit(0);
    }

    // Désactiver temporairement les FOREIGN KEYs
    db.pragma('foreign_keys = OFF');

    // MIGRATION TABLE COMMENTS (si nécessaire)
    if (commentsNeedsMigration) {
        console.log('📝 Migration table comments...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS comments_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        db.exec(`
            INSERT INTO comments_new (id, user_id, video_id, text, created_at)
            SELECT id, user_id, video_id, text, created_at FROM comments
        `);
        db.exec(`DROP TABLE comments`);
        db.exec(`ALTER TABLE comments_new RENAME TO comments`);
        console.log('✅ Table comments migrée');
    } else {
        console.log('⏭️  Table comments déjà migrée');
    }

    // MIGRATION TABLE SUBTITLE_NOTES (si nécessaire)
    if (notesNeedsMigration) {
        console.log('📝 Migration table subtitle_notes...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS subtitle_notes_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                start_time REAL NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        db.exec(`
            INSERT INTO subtitle_notes_new (id, user_id, video_id, start_time, text, created_at)
            SELECT id, user_id, video_id, start_time, text, created_at FROM subtitle_notes
        `);
        db.exec(`DROP TABLE subtitle_notes`);
        db.exec(`ALTER TABLE subtitle_notes_new RENAME TO subtitle_notes`);
        console.log('✅ Table subtitle_notes migrée');
    } else {
        console.log('⏭️  Table subtitle_notes déjà migrée');
    }

    // MIGRATION TABLE REPORTS (si nécessaire)
    if (reportsNeedsMigration) {
        console.log('📝 Migration table reports...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS reports_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'nouveau',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        db.exec(`
            INSERT INTO reports_new (id, user_id, video_id, message, status, created_at)
            SELECT id, user_id, video_id, message, status, created_at FROM reports
        `);
        db.exec(`DROP TABLE reports`);
        db.exec(`ALTER TABLE reports_new RENAME TO reports`);
        console.log('✅ Table reports migrée');
    } else {
        console.log('⏭️  Table reports déjà migrée');
    }

    // Réactiver les FOREIGN KEYs
    db.pragma('foreign_keys = ON');

    console.log('\n✅ Migration terminée avec succès !');
    console.log('Les tables comments, subtitle_notes et reports sont maintenant compatibles avec ContentNode.');

} catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error);
    process.exit(1);
} finally {
    db.close();
}
