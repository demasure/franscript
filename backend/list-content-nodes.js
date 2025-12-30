const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'franscript.db'));

console.log('=== CONTENT_NODES ===\n');
const nodes = db.prepare('SELECT id, title, type FROM content_nodes ORDER BY id').all();

if (nodes.length === 0) {
    console.log('❌ Aucun content_node dans la base!');
} else {
    console.log(`${nodes.length} node(s) trouvé(s):\n`);
    nodes.forEach(n => console.log(`  ID=${n.id}, title="${n.title}", type=${n.type}`));
}

console.log('\n=== VÉRIFICATION NODE_ID=5 ===');
const node5 = db.prepare('SELECT * FROM content_nodes WHERE id = 5').get();
if (node5) {
    console.log('✅ Node ID=5 existe:');
    console.log(`   Titre: ${node5.title}`);
    console.log(`   Type: ${node5.type}`);
} else {
    console.log('❌ Node ID=5 N\'EXISTE PAS!');
    console.log('   C\'est pourquoi la FK échoue lors de createComment(1, 5, ...)');
}

db.close();
