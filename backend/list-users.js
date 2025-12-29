const Database = require('better-sqlite3');
const db = new Database('./franscript.db');

console.log('\n📋 Liste de tous les utilisateurs:\n');

const users = db.prepare(`
    SELECT id, email, username, role, is_premium, created_at
    FROM users
    ORDER BY id
`).all();

if (users.length === 0) {
    console.log('❌ Aucun utilisateur trouvé dans la base de données');
} else {
    console.log(`Total: ${users.length} utilisateur(s)\n`);

    users.forEach(user => {
        const status = user.role === 'admin' ? '👑 Admin' : user.is_premium === 1 ? '💎 Premium' : '🆓 Gratuit';
        console.log(`${user.id}. ${user.email}`);
        console.log(`   Pseudo: ${user.username || '(aucun)'}`);
        console.log(`   Statut: ${status}`);
        console.log(`   Créé: ${user.created_at}`);
        console.log('');
    });
}

db.close();
