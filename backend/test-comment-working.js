/**
 * TEST DE CRÉATION DE COMMENTAIRE AVEC UN NODE_ID VALIDE
 */

console.log('=== TEST COMMENTAIRE SUR NODE EXISTANT ===\n');

const {
    getCommentsByVideo,
    createComment,
    getNodeById
} = require('./database');

// Vérifier que le node ID=1 existe
console.log('1. Vérification node ID=1:');
const node = getNodeById(1);
if (!node) {
    console.log('   ❌ Node ID=1 n\'existe pas! Impossible de tester.');
    process.exit(1);
}
console.log(`   ✅ Node trouvé: "${node.title}" (type: ${node.type})`);

// Créer un commentaire sur ce node
console.log('\n2. Création commentaire sur node ID=1:');
try {
    const comment = createComment(1, 1, "Test commentaire sur contenu existant");
    console.log('   ✅ Commentaire créé avec succès!');
    console.log(`   ID: ${comment.id}, node_id: ${comment.node_id}`);

    // Vérifier qu'on peut le récupérer
    console.log('\n3. Récupération des commentaires:');
    const comments = getCommentsByVideo(1);
    console.log(`   ✅ ${comments.length} commentaire(s) trouvé(s)`);

    // Nettoyer
    const Database = require('better-sqlite3');
    const path = require('path');
    const db = new Database(path.join(__dirname, 'franscript.db'));
    db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
    db.close();
    console.log('\n4. Nettoyage: commentaire de test supprimé ✅');

    console.log('\n=== ✅ TOUS LES TESTS RÉUSSIS ===');
    console.log('\nLa structure comments est CORRECTE.');
    console.log('Le problème vient de l\'utilisation d\'un node_id inexistant (5).');
    console.log('\nSOLUTION: Utiliser un node_id qui existe (1, 2, ou 8).');

} catch (e) {
    console.log('   ❌ ERREUR:', e.message);
    console.log('   Stack:', e.stack);
    console.log('\n=== ❌ TEST ÉCHOUÉ ===');
    process.exit(1);
}
