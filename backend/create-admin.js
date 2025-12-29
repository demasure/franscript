const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('./franscript.db');

// Créer un utilisateur admin pour l'interface d'administration
async function createAdmin() {
    const email = 'admin@test.com';
    const password = 'admin123';
    const username = 'Super Admin';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existingUser) {
        console.log(`✅ L'utilisateur ${email} existe déjà`);

        // Mettre à jour pour être sûr qu'il est admin
        db.prepare(`
            UPDATE users
            SET role = 'admin', username = ?, is_premium = 1
            WHERE email = ?
        `).run(username, email);

        console.log(`✅ Utilisateur mis à jour en tant qu'Admin`);

        const updatedUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE email = ?').get(email);
        console.log('\n👑 Utilisateur Admin:');
        console.log(updatedUser);
    } else {
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Insérer l'utilisateur
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, username, role, is_premium)
            VALUES (?, ?, ?, 'admin', 1)
        `).run(email, passwordHash, username);

        console.log(`✅ Utilisateur admin créé avec succès!`);
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        console.log(`   ID: ${result.lastInsertRowid}`);

        const newUser = db.prepare('SELECT id, email, username, role, is_premium FROM users WHERE id = ?').get(result.lastInsertRowid);
        console.log('\n👑 Nouvel utilisateur Admin:');
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

createAdmin()
    .then(() => {
        db.close();
        console.log('\n✅ Terminé!');
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        db.close();
        process.exit(1);
    });
