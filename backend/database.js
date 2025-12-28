const Database = require('better-sqlite3');
const path = require('path');

// Créer/ouvrir la base de données SQLite
const db = new Database(path.join(__dirname, 'franscript.db'));

// Activer les foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialise la base de données avec la table users
 * Crée la table uniquement si elle n'existe pas déjà
 */
function initDatabase() {
    // Table des utilisateurs
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.exec(createUsersTable);
    console.log('✅ Base de données initialisée');
}

/**
 * Crée un nouvel utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} passwordHash - Hash du mot de passe
 * @param {string} role - Rôle (user ou admin)
 * @returns {object} L'utilisateur créé
 */
function createUser(email, passwordHash, role = 'user') {
    const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(email, passwordHash, role);
    return {
        id: result.lastInsertRowid,
        email,
        role
    };
}

/**
 * Trouve un utilisateur par son email
 * @param {string} email - Email de l'utilisateur
 * @returns {object|null} L'utilisateur ou null si non trouvé
 */
function findUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
}

/**
 * Trouve un utilisateur par son ID
 * @param {number} id - ID de l'utilisateur
 * @returns {object|null} L'utilisateur ou null si non trouvé
 */
function findUserById(id) {
    const stmt = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?');
    return stmt.get(id);
}

/**
 * Compte le nombre total d'utilisateurs
 * @returns {number} Le nombre d'utilisateurs
 */
function countUsers() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    return stmt.get().count;
}

module.exports = {
    db,
    initDatabase,
    createUser,
    findUserByEmail,
    findUserById,
    countUsers
};
