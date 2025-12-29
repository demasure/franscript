const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('./franscript.db');

// Créer un utilisateur premium pour les tests
async function createPremiumUser() {
    const email = 'premium@test.com';
    const password = 'premium123';
    const username = 'Premium User';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existingUser) {
        console.log(`✅ L'utilisateur ${email} existe déjà`);

        // Mettre à jour pour être sûr qu'il est premium
        db.prepare(`
            UPDATE users
            SET is_premium = 1, username = ?
            WHERE email = ?
        `).run(username, email);

        console.log(`✅ Utilisateur mis à jour en tant que Premium`);

        const updatedUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE email = ?').get(email);
        console.log('\n📊 Utilisateur Premium:');
        console.log(updatedUser);
    } else {
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Insérer l'utilisateur
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, username, role, is_premium)
            VALUES (?, ?, ?, 'user', 1)
        `).run(email, passwordHash, username);

        console.log(`✅ Utilisateur premium créé avec succès!`);
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        console.log(`   ID: ${result.lastInsertRowid}`);

        const newUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE id = ?').get(result.lastInsertRowid);
        console.log('\n📊 Nouvel utilisateur Premium:');
        console.log(newUser);
    }

    // Afficher tous les utilisateurs
    console.log('\n📋 Liste de tous les utilisateurs:');
    const allUsers = db.prepare('SELECT id, email, username, role, is_premium FROM users ORDER BY id').all();
    allUsers.forEach(user => {
        const status = user.role === 'admin' ? '👑 Admin' : user.is_premium === 1 ? '💎 Premium' : '🆓 Gratuit';
        console.log(`   ${user.id}. ${user.email} (${user.username || 'Pas de pseudo'}) - ${status}`);
    });
}

createPremiumUser()
    .then(() => {
        db.close();
        console.log('\n✅ Terminé!');
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        db.close();
        process.exit(1);
    });
