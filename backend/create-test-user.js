const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('./database');

/**
 * Crée un utilisateur de test "user" pour démonstration
 */
async function createTestUser() {
    console.log('👤 Création d\'un utilisateur de test...\n');

    const email = 'user@test.com';
    const username = 'user';
    const password = 'password123';  // Mot de passe simple pour test

    try {
        // Vérifier si l'utilisateur existe déjà
        const existing = findUserByEmail(email);
        if (existing) {
            console.log('⚠️  L\'utilisateur existe déjà:');
            console.log(`   Email: ${email}`);
            console.log(`   Username: ${existing.username || 'N/A'}`);
            console.log(`   Role: ${existing.role}`);
            console.log('\n💡 Pour tester, utilisez:');
            console.log(`   Email: ${email}`);
            console.log(`   Mot de passe: password123`);
            return;
        }

        // Hash du mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Créer l'utilisateur
        const user = createUser({
            email,
            passwordHash,
            username,
            profile_picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
            role: 'user'  // Utilisateur normal (pas admin)
        });

        console.log('✅ Utilisateur de test créé avec succès!\n');
        console.log('📋 Informations de connexion:');
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        console.log(`   Username: ${username}`);
        console.log(`   Role: ${user.role}`);
        console.log('\n💡 Utilisez ces identifiants sur /auth.html');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    }
}

// Exécuter
createTestUser()
    .then(() => {
        console.log('\n✅ Script terminé');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
