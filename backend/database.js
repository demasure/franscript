const Database = require('better-sqlite3');
const path = require('path');

// Créer/ouvrir la base de données SQLite
const db = new Database(path.join(__dirname, 'franscript.db'));

// Activer les foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialise la base de données avec toutes les tables
 * Crée les tables uniquement si elles n'existent pas déjà
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

    // Table des vidéos
    const createVideosTable = `
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            video_url TEXT NOT NULL,
            subtitle_url TEXT,
            thumbnail_url TEXT,
            level TEXT DEFAULT 'B2',
            duration INTEGER,
            is_paid INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Table des tags
    const createTagsTable = `
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL DEFAULT '#3498db'
        )
    `;

    // Table de relation videos-tags
    const createVideoTagsTable = `
        CREATE TABLE IF NOT EXISTS video_tags (
            video_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (video_id, tag_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    `;

    db.exec(createUsersTable);
    db.exec(createVideosTable);
    db.exec(createTagsTable);
    db.exec(createVideoTagsTable);

    // Migration : ajouter la colonne color si elle n'existe pas
    try {
        db.exec(`ALTER TABLE tags ADD COLUMN color TEXT NOT NULL DEFAULT '#3498db'`);
        console.log('✅ Colonne "color" ajoutée à la table tags');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter la colonne level si elle n'existe pas
    try {
        db.exec(`ALTER TABLE videos ADD COLUMN level TEXT DEFAULT 'B2'`);
        console.log('✅ Colonne "level" ajoutée à la table videos');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter la colonne duration si elle n'existe pas
    try {
        db.exec(`ALTER TABLE videos ADD COLUMN duration INTEGER`);
        console.log('✅ Colonne "duration" ajoutée à la table videos');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter la colonne thumbnail_url si elle n'existe pas
    try {
        db.exec(`ALTER TABLE videos ADD COLUMN thumbnail_url TEXT`);
        console.log('✅ Colonne "thumbnail_url" ajoutée à la table videos');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

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

// ============================================
// GESTION DES VIDÉOS
// ============================================

/**
 * Récupère toutes les vidéos avec leurs tags
 * @returns {Array} Liste des vidéos
 */
function getAllVideos() {
    const videos = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();

    // Pour chaque vidéo, récupérer ses tags
    videos.forEach(video => {
        const tags = db.prepare(`
            SELECT t.* FROM tags t
            JOIN video_tags vt ON t.id = vt.tag_id
            WHERE vt.video_id = ?
        `).all(video.id);
        video.tags = tags;
    });

    return videos;
}

/**
 * Récupère une vidéo par son ID
 * @param {number} id - ID de la vidéo
 * @returns {object|null} La vidéo ou null
 */
function getVideoById(id) {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    if (!video) return null;

    const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN video_tags vt ON t.id = vt.tag_id
        WHERE vt.video_id = ?
    `).all(id);
    video.tags = tags;

    return video;
}

/**
 * Crée une nouvelle vidéo
 * @param {object} videoData - { title, description, video_url, subtitle_url, thumbnail_url, level, duration, is_paid, tagIds }
 * @returns {object} La vidéo créée
 */
function createVideo(videoData) {
    const { title, description, video_url, subtitle_url, thumbnail_url, level, duration, is_paid, tagIds } = videoData;

    const stmt = db.prepare(`
        INSERT INTO videos (title, description, video_url, subtitle_url, thumbnail_url, level, duration, is_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(title, description, video_url, subtitle_url || null, thumbnail_url || null, level || 'B2', duration || null, is_paid ? 1 : 0);
    const videoId = result.lastInsertRowid;

    // Associer les tags
    if (tagIds && tagIds.length > 0) {
        const insertTag = db.prepare('INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)');
        tagIds.forEach(tagId => insertTag.run(videoId, tagId));
    }

    return getVideoById(videoId);
}

/**
 * Met à jour une vidéo
 * @param {number} id - ID de la vidéo
 * @param {object} videoData - { title, description, video_url, subtitle_url, thumbnail_url, level, duration, is_paid, tagIds }
 * @returns {object} La vidéo mise à jour
 */
function updateVideo(id, videoData) {
    const { title, description, video_url, subtitle_url, thumbnail_url, level, duration, is_paid, tagIds } = videoData;

    const stmt = db.prepare(`
        UPDATE videos
        SET title = ?, description = ?, video_url = ?, subtitle_url = ?, thumbnail_url = ?, level = ?, duration = ?, is_paid = ?
        WHERE id = ?
    `);

    stmt.run(title, description, video_url, subtitle_url || null, thumbnail_url || null, level || 'B2', duration || null, is_paid ? 1 : 0, id);

    // Mettre à jour les tags
    db.prepare('DELETE FROM video_tags WHERE video_id = ?').run(id);
    if (tagIds && tagIds.length > 0) {
        const insertTag = db.prepare('INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)');
        tagIds.forEach(tagId => insertTag.run(id, tagId));
    }

    return getVideoById(id);
}

/**
 * Supprime une vidéo
 * @param {number} id - ID de la vidéo
 */
function deleteVideo(id) {
    db.prepare('DELETE FROM videos WHERE id = ?').run(id);
}

// ============================================
// GESTION DES TAGS
// ============================================

/**
 * Récupère tous les tags
 * @returns {Array} Liste des tags
 */
function getAllTags() {
    return db.prepare('SELECT * FROM tags ORDER BY name').all();
}

/**
 * Crée un nouveau tag
 * @param {string} name - Nom du tag
 * @param {string} color - Couleur hexadécimale du tag
 * @returns {object} Le tag créé
 */
function createTag(name, color = '#3498db') {
    const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
    const result = stmt.run(name, color);
    return {
        id: result.lastInsertRowid,
        name,
        color
    };
}

/**
 * Met à jour un tag
 * @param {number} id - ID du tag
 * @param {string} name - Nouveau nom
 * @param {string} color - Nouvelle couleur
 * @returns {object} Le tag mis à jour
 */
function updateTag(id, name, color) {
    const stmt = db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?');
    stmt.run(name, color, id);
    return {
        id,
        name,
        color
    };
}

/**
 * Récupère un tag par son ID
 * @param {number} id - ID du tag
 * @returns {object|null} Le tag ou null
 */
function getTagById(id) {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}

/**
 * Supprime un tag
 * @param {number} id - ID du tag
 */
function deleteTag(id) {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

module.exports = {
    db,
    initDatabase,
    createUser,
    findUserByEmail,
    findUserById,
    countUsers,
    // Vidéos
    getAllVideos,
    getVideoById,
    createVideo,
    updateVideo,
    deleteVideo,
    // Tags
    getAllTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag
};
