const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('./franscript.db');

// Créer un utilisateur gratuit (non-premium) pour les tests
async function createFreeUser() {
    const email = 'free@test.com';
    const password = 'free123';
    const username = 'Free User';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existingUser) {
        console.log(`✅ L'utilisateur ${email} existe déjà`);

        // Mettre à jour pour être sûr qu'il n'est PAS premium
        db.prepare(`
            UPDATE users
            SET is_premium = 0, username = ?, role = 'user'
            WHERE email = ?
        `).run(username, email);

        console.log(`✅ Utilisateur mis à jour en tant que Free`);

        const updatedUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE email = ?').get(email);
        console.log('\n📊 Utilisateur Free:');
        console.log(updatedUser);
    } else {
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Insérer l'utilisateur
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, username, role, is_premium)
            VALUES (?, ?, ?, 'user', 0)
        `).run(email, passwordHash, username);

        console.log(`✅ Utilisateur gratuit créé avec succès!`);
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        console.log(`   ID: ${result.lastInsertRowid}`);

        const newUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE id = ?').get(result.lastInsertRowid);
        console.log('\n📊 Nouvel utilisateur Free:');
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

createFreeUser()
    .then(() => {
        db.close();
        console.log('\n✅ Terminé!');
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        db.close();
        process.exit(1);
    });
