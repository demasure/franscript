const express = require('express');
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail, findUserById, countUsers } = require('./database');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 *
 * Body: { email, password }
 *
 * Le premier utilisateur inscrit devient automatiquement admin
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email et mot de passe requis'
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

        // Créer l'utilisateur
        const user = createUser(email, passwordHash, role);

        // Créer la session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        res.status(201).json({
            message: 'Inscription réussie',
            user: {
                id: user.id,
                email: user.email,
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
            role: user.role
        }
    });
});

module.exports = router;
