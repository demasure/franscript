const Database = require('better-sqlite3');
const path = require('path');

/**
 * Script pour forcer la recréation des tables comments, subtitle_notes et reports
 * sans les contraintes FOREIGN KEY vers videos
 */

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('🔧 Recréation des tables sans FK vers videos...\n');

try {
    // Désactiver les FOREIGN KEYs
    db.pragma('foreign_keys = OFF');

    // SUPPRIMER ET RECRÉER TABLE COMMENTS
    console.log('📝 Recréation table comments...');

    // Sauvegarder les données
    const comments = db.prepare('SELECT * FROM comments').all();
    console.log(`   💾 ${comments.length} commentaires sauvegardés`);

    // Supprimer et recréer
    db.exec('DROP TABLE IF EXISTS comments');
    db.exec(`
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Restaurer les données
    if (comments.length > 0) {
        const stmt = db.prepare('INSERT INTO comments (id, user_id, video_id, text, created_at) VALUES (?, ?, ?, ?, ?)');
        comments.forEach(c => {
            stmt.run(c.id, c.user_id, c.video_id, c.text, c.created_at);
        });
        console.log(`   ✅ ${comments.length} commentaires restaurés`);
    }

    // SUPPRIMER ET RECRÉER TABLE SUBTITLE_NOTES
    console.log('📝 Recréation table subtitle_notes...');

    const notes = db.prepare('SELECT * FROM subtitle_notes').all();
    console.log(`   💾 ${notes.length} notes sauvegardées`);

    db.exec('DROP TABLE IF EXISTS subtitle_notes');
    db.exec(`
        CREATE TABLE subtitle_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            start_time REAL NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    if (notes.length > 0) {
        const stmt = db.prepare('INSERT INTO subtitle_notes (id, user_id, video_id, start_time, text, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        notes.forEach(n => {
            stmt.run(n.id, n.user_id, n.video_id, n.start_time, n.text, n.created_at);
        });
        console.log(`   ✅ ${notes.length} notes restaurées`);
    }

    // SUPPRIMER ET RECRÉER TABLE REPORTS
    console.log('📝 Recréation table reports...');

    const reports = db.prepare('SELECT * FROM reports').all();
    console.log(`   💾 ${reports.length} signalements sauvegardés`);

    db.exec('DROP TABLE IF EXISTS reports');
    db.exec(`
        CREATE TABLE reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'nouveau',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    if (reports.length > 0) {
        const stmt = db.prepare('INSERT INTO reports (id, user_id, video_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        reports.forEach(r => {
            stmt.run(r.id, r.user_id, r.video_id, r.message, r.status, r.created_at);
        });
        console.log(`   ✅ ${reports.length} signalements restaurés`);
    }

    // Réactiver les FOREIGN KEYs
    db.pragma('foreign_keys = ON');

    console.log('\n✅ Recréation terminée avec succès !');
    console.log('Les tables sont maintenant sans contraintes vers videos.');

    // Vérification
    console.log('\n🔍 VÉRIFICATION :');
    const commentsFKs = db.prepare('PRAGMA foreign_key_list(comments)').all();
    console.log('comments FK:', commentsFKs.length === 1 && commentsFKs[0].table === 'users' ? '✅ OK (uniquement users)' : '❌ Problème');

    const notesFKs = db.prepare('PRAGMA foreign_key_list(subtitle_notes)').all();
    console.log('subtitle_notes FK:', notesFKs.length === 1 && notesFKs[0].table === 'users' ? '✅ OK (uniquement users)' : '❌ Problème');

    const reportsFKs = db.prepare('PRAGMA foreign_key_list(reports)').all();
    console.log('reports FK:', reportsFKs.length === 1 && reportsFKs[0].table === 'users' ? '✅ OK (uniquement users)' : '❌ Problème');

} catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
} finally {
    db.close();
}
