const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('=== SCHÉMA TABLE COMMENTS ===');
const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='comments'`).get();
console.log(schema ? schema.sql : 'TABLE DOES NOT EXIST');

console.log('\n=== FOREIGN KEYS DE COMMENTS ===');
const fks = db.prepare('PRAGMA foreign_key_list(comments)').all();
if (fks.length === 0) {
    console.log('  (aucune FK)');
} else {
    fks.forEach(fk => console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`));
}

console.log('\n=== TABLES EXISTANTES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n=== VÉRIFICATION content_nodes ===');
try {
    const count = db.prepare(`SELECT COUNT(*) as c FROM content_nodes WHERE type = 'video'`).get();
    console.log(`  Nombre de vidéos (type='video') : ${count.c}`);

    const sample = db.prepare(`SELECT id, title, type FROM content_nodes WHERE type = 'video' LIMIT 3`).all();
    console.log('  Exemples :');
    sample.forEach(node => console.log(`    - ID=${node.id}, title="${node.title}", type=${node.type}`));
} catch (e) {
    console.log('  Erreur:', e.message);
}

console.log('\n=== VÉRIFICATION users ===');
try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    console.log(`  Nombre d'utilisateurs : ${count.c}`);

    const sample = db.prepare('SELECT id, username FROM users LIMIT 3').all();
    console.log('  Exemples :');
    sample.forEach(u => console.log(`    - ID=${u.id}, username="${u.username}"`));
} catch (e) {
    console.log('  Erreur:', e.message);
}

db.close();
