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

    // Table des commentaires
    const createCommentsTable = `
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
    `;

    // Table des likes sur les commentaires
    const createCommentLikesTable = `
        CREATE TABLE IF NOT EXISTS comment_likes (
            user_id INTEGER NOT NULL,
            comment_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, comment_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
        )
    `;

    // Table des notes personnelles sur les sous-titres
    const createSubtitleNotesTable = `
        CREATE TABLE IF NOT EXISTS subtitle_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            start_time REAL NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
    `;

    db.exec(createUsersTable);
    db.exec(createVideosTable);
    db.exec(createTagsTable);
    db.exec(createVideoTagsTable);
    db.exec(createCommentsTable);
    db.exec(createCommentLikesTable);
    db.exec(createSubtitleNotesTable);

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

    // Migration : ajouter la colonne username si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
        console.log('✅ Colonne "username" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter la colonne profile_picture si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN profile_picture TEXT`);
        console.log('✅ Colonne "profile_picture" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    console.log('✅ Base de données initialisée');
}

/**
 * Crée un nouvel utilisateur
 * @param {object} userData - { email, passwordHash, username, profile_picture, role }
 * @returns {object} L'utilisateur créé
 */
function createUser(userData) {
    const { email, passwordHash, username, profile_picture, role = 'user' } = userData;

    const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, username, profile_picture, role)
        VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(email, passwordHash, username || null, profile_picture || null, role);
    return {
        id: result.lastInsertRowid,
        email,
        username,
        profile_picture,
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
    const stmt = db.prepare('SELECT id, email, username, profile_picture, role, created_at FROM users WHERE id = ?');
    return stmt.get(id);
}

/**
 * Met à jour les informations d'un utilisateur
 * @param {number} id - ID de l'utilisateur
 * @param {object} userData - { username, profile_picture }
 * @returns {object} L'utilisateur mis à jour
 */
function updateUser(id, userData) {
    const { username, profile_picture } = userData;

    const stmt = db.prepare(`
        UPDATE users
        SET username = ?, profile_picture = ?
        WHERE id = ?
    `);

    stmt.run(username || null, profile_picture || null, id);
    return findUserById(id);
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

// ============================================
// GESTION DES COMMENTAIRES
// ============================================

/**
 * Récupère tous les commentaires d'une vidéo avec les infos utilisateur
 * @param {number} videoId - ID de la vidéo
 * @returns {Array} Liste des commentaires
 */
function getCommentsByVideo(videoId) {
    const comments = db.prepare(`
        SELECT c.*, u.username, u.profile_picture, u.email
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.video_id = ?
        ORDER BY c.created_at DESC
    `).all(videoId);

    // Ajouter le nombre de likes pour chaque commentaire
    comments.forEach(comment => {
        const likeCount = db.prepare('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?')
            .get(comment.id).count;
        comment.like_count = likeCount;
    });

    return comments;
}

/**
 * Crée un nouveau commentaire
 * @param {number} userId - ID de l'utilisateur
 * @param {number} videoId - ID de la vidéo
 * @param {string} text - Texte du commentaire
 * @returns {object} Le commentaire créé
 */
function createComment(userId, videoId, text) {
    const stmt = db.prepare(`
        INSERT INTO comments (user_id, video_id, text)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, videoId, text);
    return {
        id: result.lastInsertRowid,
        user_id: userId,
        video_id: videoId,
        text,
        created_at: new Date().toISOString()
    };
}

/**
 * Supprime un commentaire (seulement si c'est l'auteur)
 * @param {number} commentId - ID du commentaire
 * @param {number} userId - ID de l'utilisateur qui demande la suppression
 * @returns {boolean} True si supprimé, false sinon
 */
function deleteComment(commentId, userId) {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

    if (!comment || comment.user_id !== userId) {
        return false; // Pas le droit de supprimer
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    return true;
}

// ============================================
// GESTION DES LIKES SUR COMMENTAIRES
// ============================================

/**
 * Vérifie si un utilisateur a liké un commentaire
 * @param {number} userId - ID de l'utilisateur
 * @param {number} commentId - ID du commentaire
 * @returns {boolean} True si liké, false sinon
 */
function hasUserLikedComment(userId, commentId) {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM comment_likes
        WHERE user_id = ? AND comment_id = ?
    `).get(userId, commentId);

    return result.count > 0;
}

/**
 * Like un commentaire
 * @param {number} userId - ID de l'utilisateur
 * @param {number} commentId - ID du commentaire
 * @returns {boolean} True si ajouté, false si déjà liké
 */
function likeComment(userId, commentId) {
    if (hasUserLikedComment(userId, commentId)) {
        return false; // Déjà liké
    }

    const stmt = db.prepare(`
        INSERT INTO comment_likes (user_id, comment_id)
        VALUES (?, ?)
    `);

    stmt.run(userId, commentId);
    return true;
}

/**
 * Unlike un commentaire
 * @param {number} userId - ID de l'utilisateur
 * @param {number} commentId - ID du commentaire
 * @returns {boolean} True si supprimé, false si pas liké
 */
function unlikeComment(userId, commentId) {
    if (!hasUserLikedComment(userId, commentId)) {
        return false; // Pas liké
    }

    const stmt = db.prepare(`
        DELETE FROM comment_likes
        WHERE user_id = ? AND comment_id = ?
    `);

    stmt.run(userId, commentId);
    return true;
}

// ============================================
// GESTION DES NOTES PERSONNELLES
// ============================================

/**
 * Récupère toutes les notes d'un utilisateur pour une vidéo
 * @param {number} userId - ID de l'utilisateur
 * @param {number} videoId - ID de la vidéo
 * @returns {Array} Liste des notes
 */
function getNotesByUserAndVideo(userId, videoId) {
    return db.prepare(`
        SELECT * FROM subtitle_notes
        WHERE user_id = ? AND video_id = ?
        ORDER BY start_time ASC
    `).all(userId, videoId);
}

/**
 * Crée une nouvelle note
 * @param {number} userId - ID de l'utilisateur
 * @param {number} videoId - ID de la vidéo
 * @param {number} startTime - Timecode de début (en secondes)
 * @param {string} text - Texte de la note
 * @returns {object} La note créée
 */
function createNote(userId, videoId, startTime, text) {
    const stmt = db.prepare(`
        INSERT INTO subtitle_notes (user_id, video_id, start_time, text)
        VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(userId, videoId, startTime, text);
    return {
        id: result.lastInsertRowid,
        user_id: userId,
        video_id: videoId,
        start_time: startTime,
        text,
        created_at: new Date().toISOString()
    };
}

/**
 * Met à jour une note
 * @param {number} noteId - ID de la note
 * @param {number} userId - ID de l'utilisateur (pour vérifier la propriété)
 * @param {string} text - Nouveau texte
 * @returns {boolean} True si mise à jour, false sinon
 */
function updateNote(noteId, userId, text) {
    const note = db.prepare('SELECT * FROM subtitle_notes WHERE id = ?').get(noteId);

    if (!note || note.user_id !== userId) {
        return false; // Pas le droit de modifier
    }

    db.prepare('UPDATE subtitle_notes SET text = ? WHERE id = ?').run(text, noteId);
    return true;
}

/**
 * Supprime une note
 * @param {number} noteId - ID de la note
 * @param {number} userId - ID de l'utilisateur (pour vérifier la propriété)
 * @returns {boolean} True si supprimé, false sinon
 */
function deleteNote(noteId, userId) {
    const note = db.prepare('SELECT * FROM subtitle_notes WHERE id = ?').get(noteId);

    if (!note || note.user_id !== userId) {
        return false; // Pas le droit de supprimer
    }

    db.prepare('DELETE FROM subtitle_notes WHERE id = ?').run(noteId);
    return true;
}

module.exports = {
    db,
    initDatabase,
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
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
    deleteTag,
    // Commentaires
    getCommentsByVideo,
    createComment,
    deleteComment,
    // Likes
    hasUserLikedComment,
    likeComment,
    unlikeComment,
    // Notes
    getNotesByUserAndVideo,
    createNote,
    updateNote,
    deleteNote
};
