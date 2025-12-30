const Database = require('better-sqlite3');
const path = require('path');

/**
 * CORRECTION STRUCTURELLE
 *
 * Renommer video_id → node_id dans comments, subtitle_notes, reports
 * Ajouter FK vers content_nodes(id)
 */

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('🔧 CORRECTION STRUCTURELLE : video_id → node_id\n');

try {
    db.pragma('foreign_keys = OFF');

    // ============================================
    // TABLE COMMENTS
    // ============================================
    console.log('📝 Correction table comments...');

    const comments = db.prepare('SELECT * FROM comments').all();
    console.log(`   💾 ${comments.length} commentaires sauvegardés`);

    db.exec('DROP TABLE IF EXISTS comments');
    db.exec(`
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            node_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (node_id) REFERENCES content_nodes(id) ON DELETE CASCADE
        )
    `);

    if (comments.length > 0) {
        const stmt = db.prepare('INSERT INTO comments (id, user_id, node_id, text, created_at) VALUES (?, ?, ?, ?, ?)');
        comments.forEach(c => {
            stmt.run(c.id, c.user_id, c.video_id, c.text, c.created_at);
        });
        console.log(`   ✅ ${comments.length} commentaires restaurés avec node_id`);
    }

    // ============================================
    // TABLE SUBTITLE_NOTES
    // ============================================
    console.log('📝 Correction table subtitle_notes...');

    const notes = db.prepare('SELECT * FROM subtitle_notes').all();
    console.log(`   💾 ${notes.length} notes sauvegardées`);

    db.exec('DROP TABLE IF EXISTS subtitle_notes');
    db.exec(`
        CREATE TABLE subtitle_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            node_id INTEGER NOT NULL,
            start_time REAL NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (node_id) REFERENCES content_nodes(id) ON DELETE CASCADE
        )
    `);

    if (notes.length > 0) {
        const stmt = db.prepare('INSERT INTO subtitle_notes (id, user_id, node_id, start_time, text, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        notes.forEach(n => {
            stmt.run(n.id, n.user_id, n.video_id, n.start_time, n.text, n.created_at);
        });
        console.log(`   ✅ ${notes.length} notes restaurées avec node_id`);
    }

    // ============================================
    // TABLE REPORTS
    // ============================================
    console.log('📝 Correction table reports...');

    const reports = db.prepare('SELECT * FROM reports').all();
    console.log(`   💾 ${reports.length} signalements sauvegardés`);

    db.exec('DROP TABLE IF EXISTS reports');
    db.exec(`
        CREATE TABLE reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            node_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'nouveau',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (node_id) REFERENCES content_nodes(id) ON DELETE CASCADE
        )
    `);

    if (reports.length > 0) {
        const stmt = db.prepare('INSERT INTO reports (id, user_id, node_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        reports.forEach(r => {
            stmt.run(r.id, r.user_id, r.video_id, r.message, r.status, r.created_at);
        });
        console.log(`   ✅ ${reports.length} signalements restaurés avec node_id`);
    }

    db.pragma('foreign_keys = ON');

    console.log('\n🔍 VÉRIFICATION :');

    const commentsFKs = db.prepare('PRAGMA foreign_key_list(comments)').all();
    console.log('comments FK:');
    commentsFKs.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));

    const notesFKs = db.prepare('PRAGMA foreign_key_list(subtitle_notes)').all();
    console.log('subtitle_notes FK:');
    notesFKs.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));

    const reportsFKs = db.prepare('PRAGMA foreign_key_list(reports)').all();
    console.log('reports FK:');
    reportsFKs.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`));

    console.log('\n✅ Correction structurelle terminée !');
    console.log('Les commentaires, notes et reports référencent maintenant content_nodes.');

} catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
} finally {
    db.close();
}
