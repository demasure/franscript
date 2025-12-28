const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'franscript.db'));

console.log('🔧 Mise à jour des utilisateurs sans username...\n');

try {
    // Trouver tous les utilisateurs sans username
    const usersWithoutUsername = db.prepare(`
        SELECT id, email FROM users WHERE username IS NULL
    `).all();

    console.log(`Trouvé ${usersWithoutUsername.length} utilisateurs sans username`);

    if (usersWithoutUsername.length === 0) {
        console.log('✅ Tous les utilisateurs ont déjà un username');
        process.exit(0);
    }

    // Pour chaque utilisateur sans username, générer un username basé sur l'email
    const updateStmt = db.prepare('UPDATE users SET username = ? WHERE id = ?');

    for (const user of usersWithoutUsername) {
        // Générer un username: partie avant @ de l'email
        const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        updateStmt.run(username, user.id);
        console.log(`✅ User ${user.id} (${user.email}): username défini à "${username}"`);
    }

    console.log('\n✅ Mise à jour terminée avec succès!');
    process.exit(0);
} catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
}
