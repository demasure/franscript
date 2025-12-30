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

    // Migration : ajouter username_confirmed si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN username_confirmed INTEGER DEFAULT 0`);
        console.log('✅ Colonne "username_confirmed" ajoutée à la table users');
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

    // Migration : ajouter is_premium si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0`);
        console.log('✅ Colonne "is_premium" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter note_window_seconds si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN note_window_seconds INTEGER DEFAULT 10`);
        console.log('✅ Colonne "note_window_seconds" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter show_ai_help_default si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN show_ai_help_default INTEGER DEFAULT 1`);
        console.log('✅ Colonne "show_ai_help_default" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter show_notes_default si elle n'existe pas
    try {
        db.exec(`ALTER TABLE users ADD COLUMN show_notes_default INTEGER DEFAULT 1`);
        console.log('✅ Colonne "show_notes_default" ajoutée à la table users');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Migration : ajouter is_paid si elle n'existe pas
    try {
        db.exec(`ALTER TABLE videos ADD COLUMN is_paid INTEGER DEFAULT 0`);
        console.log('✅ Colonne "is_paid" ajoutée à la table videos');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // Table des signalements (reports)
    const createReportsTable = `
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'nouveau',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
    `;

    db.exec(createReportsTable);

    // ============================================
    // STRUCTURE ARBORESCENTE UNIVERSELLE
    // ============================================

    /**
     * Table content_nodes : structure arborescente générique
     *
     * Peut représenter :
     * - Un dossier (type='folder') : série, saison, catégorie, etc.
     * - Une vidéo (type='video') : film, épisode, etc.
     *
     * Hiérarchie infinie via parent_id :
     * - parent_id = null → nœud racine
     * - parent_id = X → enfant du nœud X
     *
     * Premium héritable :
     * - Si un parent est premium, ses enfants le sont aussi
     */
    const createContentNodesTable = `
        CREATE TABLE IF NOT EXISTS content_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL CHECK(type IN ('folder', 'video')),
            video_url TEXT,
            subtitle_url TEXT,
            thumbnail_url TEXT,
            duration INTEGER,
            is_premium INTEGER DEFAULT 0,
            order_index INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES content_nodes(id) ON DELETE CASCADE
        )
    `;

    // Table de relation content_nodes-tags (many-to-many)
    const createContentNodeTagsTable = `
        CREATE TABLE IF NOT EXISTS content_node_tags (
            node_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (node_id, tag_id),
            FOREIGN KEY (node_id) REFERENCES content_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    `;

    db.exec(createContentNodesTable);
    db.exec(createContentNodeTagsTable);

    // Migration : ajouter la colonne cover_url si elle n'existe pas
    try {
        db.exec(`ALTER TABLE content_nodes ADD COLUMN cover_url TEXT`);
        console.log('✅ Colonne "cover_url" ajoutée à la table content_nodes');
    } catch (error) {
        // La colonne existe déjà, ignorer l'erreur
    }

    // ========================================
    // MIGRATION : Unification sur cover_url
    // ========================================
    // Copier thumbnail_url vers cover_url si cover_url est vide
    try {
        const updateResult = db.prepare(`
            UPDATE content_nodes
            SET cover_url = thumbnail_url
            WHERE cover_url IS NULL AND thumbnail_url IS NOT NULL
        `).run();

        if (updateResult.changes > 0) {
            console.log(`✅ Migration: ${updateResult.changes} thumbnail_url copiés vers cover_url`);
        }
    } catch (error) {
        console.error('❌ Erreur migration thumbnail_url → cover_url:', error.message);
    }

    // Supprimer la colonne thumbnail_url (reconstruction de table nécessaire pour SQLite)
    try {
        // Vérifier si la colonne thumbnail_url existe encore
        const columns = db.prepare("PRAGMA table_info(content_nodes)").all();
        const hasThumbnailUrl = columns.some(col => col.name === 'thumbnail_url');

        if (hasThumbnailUrl) {
            console.log('🔄 Suppression de la colonne thumbnail_url...');

            // Créer table temporaire sans thumbnail_url
            db.exec(`
                CREATE TABLE content_nodes_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    parent_id INTEGER,
                    title TEXT NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL CHECK(type IN ('folder', 'video')),
                    video_url TEXT,
                    subtitle_url TEXT,
                    cover_url TEXT,
                    duration INTEGER,
                    is_premium INTEGER DEFAULT 0,
                    order_index INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES content_nodes(id) ON DELETE CASCADE
                )
            `);

            // Copier les données (sans thumbnail_url)
            db.exec(`
                INSERT INTO content_nodes_new
                    (id, parent_id, title, description, type, video_url, subtitle_url,
                     cover_url, duration, is_premium, order_index, created_at)
                SELECT
                    id, parent_id, title, description, type, video_url, subtitle_url,
                    cover_url, duration, is_premium, order_index, created_at
                FROM content_nodes
            `);

            // Remplacer l'ancienne table
            db.exec('DROP TABLE content_nodes');
            db.exec('ALTER TABLE content_nodes_new RENAME TO content_nodes');

            console.log('✅ Colonne thumbnail_url supprimée - cover_url est maintenant la source unique');
        }
    } catch (error) {
        console.error('❌ Erreur suppression thumbnail_url:', error.message);
    }

    console.log('✅ Base de données initialisée');
}

/**
 * Crée un nouvel utilisateur
 * @param {object} userData - { email, password_hash, username, profile_picture, role, is_premium }
 * @returns {object} L'utilisateur créé
 */
function createUser(userData) {
    const {
        email,
        password_hash,
        username,
        profile_picture,
        role = 'user',
        is_premium = 0
    } = userData;

    const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, username, profile_picture, role, is_premium)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        email,
        password_hash,
        username || null,
        profile_picture || null,
        role,
        is_premium
    );

    return {
        id: result.lastInsertRowid,
        email,
        username,
        profile_picture,
        role,
        is_premium
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
 * Trouve un utilisateur par son username
 * @param {string} username - Username de l'utilisateur
 * @returns {object|null} L'utilisateur ou null si non trouvé
 */
function findUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
}

/**
 * Trouve un utilisateur par son ID
 * @param {number} id - ID de l'utilisateur
 * @returns {object|null} L'utilisateur ou null si non trouvé
 */
function findUserById(id) {
    const stmt = db.prepare(`
        SELECT id, email, username, username_confirmed, profile_picture, role, is_premium,
               note_window_seconds, show_ai_help_default, show_notes_default, created_at
        FROM users
        WHERE id = ?
    `);
    return stmt.get(id);
}

/**
 * Met à jour les informations d'un utilisateur (profil et réglages)
 * @param {number} id - ID de l'utilisateur
 * @param {object} userData - Nouvelles données
 * @returns {object} L'utilisateur mis à jour
 */
function updateUser(id, userData) {
    const fields = [];
    const values = [];

    // Construire dynamiquement la requête selon les champs fournis
    if (userData.username !== undefined) {
        fields.push('username = ?');
        values.push(userData.username);
    }
    if (userData.username_confirmed !== undefined) {
        fields.push('username_confirmed = ?');
        values.push(userData.username_confirmed ? 1 : 0);
    }
    if (userData.profile_picture !== undefined) {
        fields.push('profile_picture = ?');
        values.push(userData.profile_picture);
    }
    if (userData.note_window_seconds !== undefined) {
        fields.push('note_window_seconds = ?');
        values.push(userData.note_window_seconds);
    }
    if (userData.show_ai_help_default !== undefined) {
        fields.push('show_ai_help_default = ?');
        values.push(userData.show_ai_help_default ? 1 : 0);
    }
    if (userData.show_notes_default !== undefined) {
        fields.push('show_notes_default = ?');
        values.push(userData.show_notes_default ? 1 : 0);
    }

    if (fields.length === 0) {
        return findUserById(id); // Rien à mettre à jour
    }

    values.push(id); // Ajouter l'ID à la fin pour le WHERE

    const stmt = db.prepare(`
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
    `);

    stmt.run(...values);
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

/**
 * Récupère tous les utilisateurs (admin uniquement)
 * @returns {Array} Liste de tous les utilisateurs (sans les mots de passe)
 */
function getAllUsers() {
    const stmt = db.prepare(`
        SELECT id, email, username, username_confirmed, profile_picture, role, is_premium, created_at
        FROM users
        ORDER BY created_at DESC
    `);
    return stmt.all();
}

/**
 * Récupère les utilisateurs avec pagination et filtres (future-proof)
 * @param {Object} options - Options de pagination et filtrage
 * @param {number} options.page - Numéro de page (commence à 1)
 * @param {number} options.limit - Nombre d'utilisateurs par page
 * @param {string} [options.search] - Recherche dans email/username
 * @param {string} [options.role] - Filtrer par rôle (admin/user)
 * @param {boolean} [options.premium] - Filtrer par statut premium
 * @param {string} [options.sortBy] - Champ de tri (created_at, email, username)
 * @param {string} [options.sortOrder] - Ordre de tri (ASC, DESC)
 * @returns {Array} Liste paginée des utilisateurs
 */
function getUsersPaginated(options = {}) {
    const {
        page = 1,
        limit = 50,
        search = '',
        role = null,
        premium = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
    } = options;

    // Construction dynamique de la requête WHERE
    const whereClauses = [];
    const params = [];

    if (search) {
        whereClauses.push('(email LIKE ? OR username LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
    }

    if (role) {
        whereClauses.push('role = ?');
        params.push(role);
    }

    if (premium !== null) {
        whereClauses.push('is_premium = ?');
        params.push(premium ? 1 : 0);
    }

    const whereSQL = whereClauses.length > 0
        ? 'WHERE ' + whereClauses.join(' AND ')
        : '';

    // Validation du tri pour éviter les injections SQL
    const allowedSortFields = ['created_at', 'email', 'username', 'role', 'is_premium'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Calcul de l'offset
    const offset = (page - 1) * limit;

    // Requête avec pagination
    const query = `
        SELECT id, email, username, username_confirmed, profile_picture, role, is_premium, created_at
        FROM users
        ${whereSQL}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

/**
 * Compte le nombre total d'utilisateurs avec filtres
 * @param {Object} filters - Mêmes filtres que getUsersPaginated
 * @param {string} [filters.search] - Recherche dans email/username
 * @param {string} [filters.role] - Filtrer par rôle
 * @param {boolean} [filters.premium] - Filtrer par statut premium
 * @returns {number} Nombre total d'utilisateurs correspondants
 */
function countUsersFiltered(filters = {}) {
    const {
        search = '',
        role = null,
        premium = null
    } = filters;

    const whereClauses = [];
    const params = [];

    if (search) {
        whereClauses.push('(email LIKE ? OR username LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
    }

    if (role) {
        whereClauses.push('role = ?');
        params.push(role);
    }

    if (premium !== null) {
        whereClauses.push('is_premium = ?');
        params.push(premium ? 1 : 0);
    }

    const whereSQL = whereClauses.length > 0
        ? 'WHERE ' + whereClauses.join(' AND ')
        : '';

    const query = `SELECT COUNT(*) as count FROM users ${whereSQL}`;
    const stmt = db.prepare(query);
    const result = stmt.get(...params);

    return result.count;
}

/**
 * Supprime un utilisateur par son ID
 * @param {number} id - ID de l'utilisateur à supprimer
 */
function deleteUser(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
 * Récupère une vidéo par son URL
 * @param {string} videoUrl - URL de la vidéo (ex: 'videos/ma_video.mp4')
 * @returns {object|null} La vidéo ou null si non trouvée
 */
function getVideoByUrl(videoUrl) {
    const video = db.prepare('SELECT * FROM videos WHERE video_url = ?').get(videoUrl);
    if (!video) return null;

    const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN video_tags vt ON t.id = vt.tag_id
        WHERE vt.video_id = ?
    `).all(video.id);
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

// ============================================
// GESTION DES SIGNALEMENTS
// ============================================

/**
 * Crée un signalement
 * @param {object} reportData - { user_id, video_id, message }
 * @returns {object} Le signalement créé
 */
function createReport(reportData) {
    const { user_id, video_id, message } = reportData;

    const stmt = db.prepare(`
        INSERT INTO reports (user_id, video_id, message)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(user_id, video_id, message);
    return {
        id: result.lastInsertRowid,
        user_id,
        video_id,
        message,
        status: 'nouveau'
    };
}

/**
 * Récupère tous les signalements (pour l'admin)
 * @returns {Array} Liste des signalements avec infos utilisateur et vidéo
 */
function getAllReports() {
    const stmt = db.prepare(`
        SELECT
            r.id,
            r.message,
            r.status,
            r.created_at,
            u.id as user_id,
            u.username,
            u.email,
            v.id as video_id,
            v.title as video_title
        FROM reports r
        JOIN users u ON r.user_id = u.id
        JOIN videos v ON r.video_id = v.id
        ORDER BY r.created_at DESC
    `);

    return stmt.all();
}

/**
 * Met à jour le statut d'un signalement
 * @param {number} reportId - ID du signalement
 * @param {string} status - Nouveau statut (nouveau, traité, ignoré)
 * @returns {boolean} True si mis à jour, false sinon
 */
function updateReportStatus(reportId, status) {
    const stmt = db.prepare('UPDATE reports SET status = ? WHERE id = ?');
    const result = stmt.run(status, reportId);
    return result.changes > 0;
}

// ============================================
// GESTION DES CONTENT NODES (Structure arborescente)
// ============================================

/**
 * Récupère tous les nœuds racines (parent_id = null) avec leurs tags
 * @returns {Array} Liste des nœuds racines
 */
function getRootNodes() {
    const nodes = db.prepare(`
        SELECT * FROM content_nodes
        WHERE parent_id IS NULL
        ORDER BY title COLLATE NOCASE ASC
    `).all();

    nodes.forEach(node => {
        node.tags = db.prepare(`
            SELECT t.* FROM tags t
            JOIN content_node_tags cnt ON t.id = cnt.tag_id
            WHERE cnt.node_id = ?
        `).all(node.id);
    });

    return nodes;
}

/**
 * Récupère tout l'arbre de contenu de manière récursive avec tags
 * @returns {Array} Arbre complet de nœuds avec leurs enfants et tags
 */
function getAllNodesTree() {
    // Fonction récursive pour charger un nœud et ses enfants
    function loadNodeWithChildren(nodeId = null) {
        const query = nodeId === null
            ? 'SELECT * FROM content_nodes WHERE parent_id IS NULL ORDER BY title COLLATE NOCASE ASC'
            : 'SELECT * FROM content_nodes WHERE parent_id = ? ORDER BY title COLLATE NOCASE ASC';

        const nodes = nodeId === null
            ? db.prepare(query).all()
            : db.prepare(query).all(nodeId);

        return nodes.map(node => {
            // Charger les tags du nœud
            node.tags = db.prepare(`
                SELECT t.* FROM tags t
                JOIN content_node_tags cnt ON t.id = cnt.tag_id
                WHERE cnt.node_id = ?
            `).all(node.id);

            // Si c'est un dossier, charger ses enfants récursivement
            if (node.type === 'folder') {
                node.children = loadNodeWithChildren(node.id);
            } else {
                node.children = [];
            }

            return node;
        });
    }

    return loadNodeWithChildren(null);
}

/**
 * Récupère les enfants d'un nœud
 * @param {number} parentId - ID du parent
 * @returns {Array} Liste des nœuds enfants
 */
function getChildNodes(parentId) {
    return db.prepare(`
        SELECT * FROM content_nodes
        WHERE parent_id = ?
        ORDER BY title COLLATE NOCASE ASC
    `).all(parentId);
}

/**
 * Récupère un nœud par son ID avec ses tags
 * @param {number} id - ID du nœud
 * @returns {object|null} Le nœud ou null
 */
function getNodeById(id) {
    const node = db.prepare('SELECT * FROM content_nodes WHERE id = ?').get(id);
    if (!node) return null;

    node.tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN content_node_tags cnt ON t.id = cnt.tag_id
        WHERE cnt.node_id = ?
    `).all(id);

    return node;
}

/**
 * Récupère un nœud avec ses tags locaux ET hérités
 * @param {number} id - ID du nœud
 * @returns {object} Nœud avec localTags et inheritedTags
 */
function getNodeWithInheritedTags(id) {
    const node = db.prepare('SELECT * FROM content_nodes WHERE id = ?').get(id);
    if (!node) return null;

    // Récupérer les tags locaux (directement attachés à ce nœud)
    node.localTags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN content_node_tags cnt ON t.id = cnt.tag_id
        WHERE cnt.node_id = ?
    `).all(id);

    // Récupérer les tags hérités des parents
    node.inheritedTags = [];
    const path = getNodePath(id);

    // Pour chaque parent dans le chemin (sauf le nœud lui-même)
    for (let i = 0; i < path.length - 1; i++) {
        const parentId = path[i].id;
        const parentTags = db.prepare(`
            SELECT t.* FROM tags t
            JOIN content_node_tags cnt ON t.id = cnt.tag_id
            WHERE cnt.node_id = ?
        `).all(parentId);

        // Ajouter les tags du parent qui ne sont pas déjà dans inheritedTags
        parentTags.forEach(tag => {
            if (!node.inheritedTags.find(t => t.id === tag.id)) {
                node.inheritedTags.push({ ...tag, inheritedFrom: path[i].title });
            }
        });
    }

    // Créer une liste combinée (tags = local + inherited)
    const localTagIds = node.localTags.map(t => t.id);
    node.tags = [
        ...node.localTags,
        ...node.inheritedTags.filter(t => !localTagIds.includes(t.id))
    ];

    return node;
}

/**
 * Crée un nouveau nœud (dossier ou vidéo)
 * SOURCE UNIQUE POUR LES IMAGES: cover_url pour TOUS les types (vidéo ET dossier)
 * @param {object} nodeData - { parent_id, title, description, type, video_url, subtitle_url, cover_url, is_premium, tagIds }
 * @returns {object} Le nœud créé
 */
function createNode(nodeData) {
    const {
        parent_id,
        title,
        description,
        type,
        video_url,
        subtitle_url,
        cover_url,
        duration,
        is_premium,
        order_index,
        tagIds
    } = nodeData;

    const stmt = db.prepare(`
        INSERT INTO content_nodes (
            parent_id, title, description, type, video_url, subtitle_url,
            cover_url, duration, is_premium, order_index
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        parent_id || null,
        title,
        description || null,
        type,
        video_url || null,
        subtitle_url || null,
        cover_url || null,
        duration || null,
        is_premium ? 1 : 0,
        order_index || 0
    );

    const nodeId = result.lastInsertRowid;

    // Associer les tags
    if (tagIds && tagIds.length > 0) {
        const insertTag = db.prepare('INSERT INTO content_node_tags (node_id, tag_id) VALUES (?, ?)');
        tagIds.forEach(tagId => insertTag.run(nodeId, tagId));
    }

    return getNodeById(nodeId);
}

/**
 * Met à jour un nœud
 * SOURCE UNIQUE POUR LES IMAGES: cover_url pour TOUS les types (vidéo ET dossier)
 * @param {number} id - ID du nœud
 * @param {object} nodeData - Nouvelles données
 * @returns {object} Le nœud mis à jour
 */
function updateNode(id, nodeData) {
    const {
        title,
        description,
        video_url,
        subtitle_url,
        cover_url,
        duration,
        is_premium,
        order_index,
        tagIds
    } = nodeData;

    const node = getNodeById(id);
    if (!node) return null;

    const stmt = db.prepare(`
        UPDATE content_nodes
        SET title = ?, description = ?, video_url = ?, subtitle_url = ?,
            cover_url = ?, duration = ?, is_premium = ?, order_index = ?
        WHERE id = ?
    `);

    stmt.run(
        title,
        description !== undefined ? (description || null) : node.description,
        video_url !== undefined ? (video_url || null) : node.video_url,
        subtitle_url !== undefined ? (subtitle_url || null) : node.subtitle_url,
        cover_url !== undefined ? (cover_url || null) : node.cover_url,
        duration !== undefined ? (duration || null) : node.duration,
        is_premium !== undefined ? (is_premium ? 1 : 0) : node.is_premium,
        order_index !== undefined ? order_index : node.order_index,
        id
    );

    // Mettre à jour les tags
    db.prepare('DELETE FROM content_node_tags WHERE node_id = ?').run(id);
    if (tagIds && tagIds.length > 0) {
        const insertTag = db.prepare('INSERT INTO content_node_tags (node_id, tag_id) VALUES (?, ?)');
        tagIds.forEach(tagId => insertTag.run(id, tagId));
    }

    return getNodeById(id);
}

/**
 * Supprime un nœud (cascade vers ses enfants)
 * @param {number} id - ID du nœud
 */
function deleteNode(id) {
    db.prepare('DELETE FROM content_nodes WHERE id = ?').run(id);
}

/**
 * Récupère le chemin complet d'un nœud (fil d'Ariane)
 * @param {number} nodeId - ID du nœud
 * @returns {Array} Tableau de nœuds du parent racine jusqu'au nœud
 */
function getNodePath(nodeId) {
    const path = [];
    let currentId = nodeId;

    while (currentId) {
        const node = getNodeById(currentId);
        if (!node) break;

        path.unshift(node);
        currentId = node.parent_id;
    }

    return path;
}

module.exports = {
    db,
    initDatabase,
    createUser,
    findUserByEmail,
    findUserByUsername,
    findUserById,
    updateUser,
    getAllUsers,
    getUsersPaginated,
    countUsersFiltered,
    deleteUser,
    countUsers,
    // Vidéos (ancien système - garder pour compatibilité)
    getAllVideos,
    getVideoById,
    getVideoByUrl,
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
    deleteNote,
    // Signalements
    createReport,
    getAllReports,
    updateReportStatus,
    // Content Nodes (structure arborescente)
    getRootNodes,
    getAllNodesTree,
    getChildNodes,
    getNodeById,
    getNodeWithInheritedTags,
    createNode,
    updateNode,
    deleteNode,
    getNodePath
};
