const express = require('express');
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail, findUserById, updateUser, countUsers } = require('./database');

const router = express.Router();
const SALT_ROUNDS = 10;

// Avatar par défaut (collection d'avatars neutres)
const DEFAULT_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5'
];

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 *
 * Body: { email, password, username }
 *
 * Le premier utilisateur inscrit devient automatiquement admin
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Validation des champs
        if (!email || !password || !username) {
            return res.status(400).json({
                error: 'Email, mot de passe et pseudo requis'
            });
        }

        // Validation email basique
        if (!email.includes('@')) {
            return res.status(400).json({
                error: 'Email invalide'
            });
        }

        // Validation mot de passe (minimum 6 caractères)
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Le mot de passe doit contenir au moins 6 caractères'
            });
        }

        // Validation pseudo (3-20 caractères, alphanumérique + underscore)
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                error: 'Le pseudo doit contenir entre 3 et 20 caractères'
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                error: 'Le pseudo ne peut contenir que des lettres, chiffres et underscores'
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                error: 'Cet email est déjà utilisé'
            });
        }

        // Hash du mot de passe
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Le premier utilisateur devient admin
        const userCount = countUsers();
        const role = userCount === 0 ? 'admin' : 'user';

        // Choisir un avatar par défaut aléatoire
        const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

        // Créer l'utilisateur
        const user = createUser({
            email,
            passwordHash,
            username,
            profile_picture: randomAvatar,
            role
        });

        // Créer la session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        res.status(201).json({
            message: 'Inscription réussie',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                profile_picture: user.profile_picture,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'inscription'
        });
    }
});

/**
 * POST /auth/login
 * Connexion d'un utilisateur
 *
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email et mot de passe requis'
            });
        }

        // Trouver l'utilisateur
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Email ou mot de passe incorrect'
            });
        }

        // Créer la session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        res.json({
            message: 'Connexion réussie',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            error: 'Erreur lors de la connexion'
        });
    }
});

/**
 * POST /auth/logout
 * Déconnexion de l'utilisateur
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur déconnexion:', err);
            return res.status(500).json({
                error: 'Erreur lors de la déconnexion'
            });
        }

        res.clearCookie('connect.sid');
        res.json({
            message: 'Déconnexion réussie'
        });
    });
});

/**
 * GET /auth/me
 * Récupère les informations de l'utilisateur connecté
 */
router.get('/me', (req, res) => {
    // Vérifier si l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Non authentifié'
        });
    }

    // Récupérer l'utilisateur
    const user = findUserById(req.session.userId);
    if (!user) {
        return res.status(404).json({
            error: 'Utilisateur non trouvé'
        });
    }

    res.json({
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile_picture: user.profile_picture,
            role: user.role
        }
    });
});

/**
 * PUT /auth/profile
 * Met à jour le profil de l'utilisateur connecté
 * Body: { username, profile_picture }
 */
router.put('/profile', (req, res) => {
    // Vérifier si l'utilisateur est connecté
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Non authentifié'
        });
    }

    try {
        const { username, profile_picture } = req.body;

        // Validation pseudo si fourni
        if (username) {
            if (username.length < 3 || username.length > 20) {
                return res.status(400).json({
                    error: 'Le pseudo doit contenir entre 3 et 20 caractères'
                });
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({
                    error: 'Le pseudo ne peut contenir que des lettres, chiffres et underscores'
                });
            }
        }

        // Mettre à jour l'utilisateur
        const updatedUser = updateUser(req.session.userId, {
            username: username || undefined,
            profile_picture: profile_picture || undefined
        });

        res.json({
            message: 'Profil mis à jour',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                profile_picture: updatedUser.profile_picture,
                role: updatedUser.role
            }
        });

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({
            error: 'Erreur lors de la mise à jour du profil'
        });
    }
});

module.exports = router;
