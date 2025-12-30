const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'franscript.db');
const db = new Database(dbPath);

console.log('=== COLONNES DE LA TABLE comments ===');
const cols = db.prepare('PRAGMA table_info(comments)').all();
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

console.log('\n=== TEST REQUÊTE ===');
try {
    const test = db.prepare('SELECT c.node_id FROM comments c LIMIT 1').all();
    console.log('✅ Requête avec c.node_id fonctionne');
} catch (e) {
    console.log('❌ Erreur:', e.message);
}

db.close();
