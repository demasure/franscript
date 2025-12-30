/**
 * TEST COMPLET DES REQUÊTES COMMENTS
 * Simule exactement ce que fait le serveur
 */

console.log('=== TEST REQUÊTES COMMENTS ===\n');

// Charger database.js EXACTEMENT comme le serveur le fait
const {
    getCommentsByVideo,
    createComment,
    findUserById
} = require('./database');

console.log('1. Module database.js chargé ✅\n');

// Test 1: Vérifier qu'un utilisateur existe
console.log('2. Test findUserById(1):');
try {
    const user = findUserById(1);
    if (user) {
        console.log(`   ✅ Utilisateur trouvé: ${user.username} (ID: ${user.id})`);
    } else {
        console.log('   ❌ Aucun utilisateur avec ID=1');
    }
} catch (e) {
    console.log('   ❌ Erreur:', e.message);
}

// Test 2: getCommentsByVideo (LA requête qui échoue)
console.log('\n3. Test getCommentsByVideo(5):');
try {
    const comments = getCommentsByVideo(5);
    console.log(`   ✅ Requête réussie! ${comments.length} commentaire(s) trouvé(s)`);
    if (comments.length > 0) {
        console.log('   Premier commentaire:', comments[0]);
    }
} catch (e) {
    console.log('   ❌ ERREUR:', e.message);
    console.log('   Stack:', e.stack);
}

// Test 3: createComment (LA requête qui échoue)
console.log('\n4. Test createComment(1, 5, "Test comment"):');
try {
    const comment = createComment(1, 5, "Test comment");
    console.log('   ✅ Commentaire créé avec succès!');
    console.log('   ID:', comment.id);
    console.log('   node_id:', comment.node_id);

    // Nettoyer
    const Database = require('better-sqlite3');
    const path = require('path');
    const db = new Database(path.join(__dirname, 'franscript.db'));
    db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
    db.close();
    console.log('   (commentaire de test supprimé)');
} catch (e) {
    console.log('   ❌ ERREUR:', e.message);
    console.log('   Stack:', e.stack);
}

console.log('\n=== FIN DES TESTS ===');
