# 🔐 Guide d'Authentification FranScript

Ce guide explique comment utiliser le système d'authentification ajouté au backend FranScript.

## 📋 Vue d'ensemble

Le système d'authentification utilise :
- **SQLite** pour stocker les utilisateurs
- **bcrypt** pour hasher les mots de passe
- **express-session** pour gérer les sessions
- **Cookies HTTP-only** pour la sécurité

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Démarrer le serveur

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

### 3. Tester avec la page de démo

Ouvrez `auth-demo.html` dans votre navigateur :

```bash
# Depuis le répertoire racine du projet
npx http-server -p 8000
```

Puis accédez à : `http://localhost:8000/auth-demo.html`

## 🔑 API Endpoints

### POST /auth/register
**Inscription d'un nouvel utilisateur**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "monmotdepasse"}'
```

**Réponse :**
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

> 💡 **Important** : Le premier utilisateur inscrit devient automatiquement `admin`

### POST /auth/login
**Connexion d'un utilisateur**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "user@example.com", "password": "monmotdepasse"}'
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

> 💡 L'option `-c cookies.txt` sauvegarde le cookie de session

### GET /auth/me
**Récupérer les infos de l'utilisateur connecté**

```bash
curl http://localhost:3000/auth/me \
  -b cookies.txt
```

**Réponse :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### POST /auth/logout
**Déconnexion**

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

**Réponse :**
```json
{
  "message": "Déconnexion réussie"
}
```

## 🛡️ Protéger vos routes

### Middleware `requireAuth`
**Protège une route - accessible uniquement aux utilisateurs connectés**

```javascript
const { requireAuth } = require('./middleware');

app.get('/api/profile', requireAuth, (req, res) => {
    // Accessible par tous les utilisateurs connectés (user ou admin)
    res.json({
        userId: req.session.userId,
        role: req.session.userRole
    });
});
```

### Middleware `requireAdmin`
**Protège une route - accessible uniquement aux admins**

```javascript
const { requireAuth, requireAdmin } = require('./middleware');

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    // Accessible uniquement par les admins
    res.json({ message: 'Admin seulement' });
});
```

> ⚠️ **Important** : Toujours mettre `requireAuth` AVANT `requireAdmin`

## 🧪 Tester les routes protégées

### Route protégée (auth requise)

```bash
# Sans être connecté - échoue
curl http://localhost:3000/api/profile

# Avec session - fonctionne
curl http://localhost:3000/api/profile -b cookies.txt
```

### Route admin uniquement

```bash
# Avec un compte user - échoue avec 403
curl http://localhost:3000/api/admin/stats -b cookies.txt

# Avec un compte admin - fonctionne
curl http://localhost:3000/api/admin/stats -b cookies.txt
```

## 🎨 Intégration Frontend

### Exemple avec fetch

```javascript
// Inscription
async function register(email, password) {
    const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ⚠️ Important pour les cookies
        body: JSON.stringify({ email, password })
    });
    return response.json();
}

// Connexion
async function login(email, password) {
    const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });
    return response.json();
}

// Vérifier si connecté
async function checkAuth() {
    const response = await fetch('http://localhost:3000/auth/me', {
        credentials: 'include'
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Connecté en tant que:', data.user);
    } else {
        console.log('Non connecté');
    }
}

// Déconnexion
async function logout() {
    await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include'
    });
}
```

> 💡 **Important** : Toujours utiliser `credentials: 'include'` pour envoyer les cookies de session

## 📁 Structure des fichiers

```
backend/
├── server.js          # Point d'entrée, configuration Express
├── database.js        # Gestion SQLite et fonctions de BDD
├── auth.js            # Routes d'authentification
├── middleware.js      # Middlewares requireAuth et requireAdmin
├── package.json       # Dépendances
└── franscript.db      # Base de données SQLite (créée automatiquement)
```

## 🔒 Base de données

### Table `users`

| Colonne        | Type    | Description                    |
|----------------|---------|--------------------------------|
| id             | INTEGER | ID auto-incrémenté (PK)        |
| email          | TEXT    | Email unique                   |
| password_hash  | TEXT    | Hash bcrypt du mot de passe    |
| role           | TEXT    | 'user' ou 'admin'              |
| created_at     | DATETIME| Date de création               |

### Inspecter la base de données

```bash
# Installer sqlite3 CLI (si besoin)
sudo apt install sqlite3  # Linux
brew install sqlite3      # Mac

# Ouvrir la base
cd backend
sqlite3 franscript.db

# Lister les utilisateurs
SELECT * FROM users;

# Compter les utilisateurs
SELECT COUNT(*) FROM users;

# Sortir
.exit
```

## 🔐 Sécurité

### Ce qui est implémenté ✅

- ✅ Mots de passe hashés avec bcrypt (10 rounds)
- ✅ Sessions HTTP-only (pas accessibles en JavaScript)
- ✅ Validation des emails
- ✅ Validation longueur mot de passe (min 6 caractères)
- ✅ CORS configuré avec credentials
- ✅ Protection contre les doublons d'email

### Pour la production ⚠️

Si vous déployez en production, pensez à :

1. **Changer le secret de session** dans `server.js` :
   ```javascript
   secret: process.env.SESSION_SECRET || 'votre-secret-super-securise'
   ```

2. **Activer HTTPS** et configurer les cookies :
   ```javascript
   cookie: {
       httpOnly: true,
       secure: true,  // Uniquement HTTPS
       sameSite: 'strict'
   }
   ```

3. **Augmenter les exigences du mot de passe** :
   - Minimum 8-12 caractères
   - Majuscules, minuscules, chiffres, symboles

4. **Ajouter rate limiting** pour éviter le brute force

5. **Ajouter validation email** (envoi de code de confirmation)

## 🐛 Dépannage

### Erreur : "Non authentifié"

- Vérifiez que vous utilisez `credentials: 'include'` dans fetch
- Vérifiez que le CORS est correctement configuré
- Vérifiez que les cookies ne sont pas bloqués

### Erreur : "Cannot find module"

```bash
cd backend
npm install
```

### Base de données verrouillée

```bash
# Supprimer la base et recommencer
rm backend/franscript.db
npm start
```

### Le premier utilisateur n'est pas admin

La base contient déjà un utilisateur. Supprimez-la pour recommencer :

```bash
rm backend/franscript.db
```

## 📝 Exemples complets

### Scénario 1 : Inscription + Connexion

```bash
# 1. Inscription (devient admin)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "admin@franscript.fr", "password": "admin123"}'

# 2. Vérifier le statut
curl http://localhost:3000/auth/me -b cookies.txt

# 3. Tester route protégée
curl http://localhost:3000/api/profile -b cookies.txt

# 4. Tester route admin
curl http://localhost:3000/api/admin/stats -b cookies.txt
```

### Scénario 2 : Utilisateur normal

```bash
# Inscription (2e utilisateur = role user)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -c user-cookies.txt \
  -d '{"email": "user@franscript.fr", "password": "user123"}'

# Route protégée : ✅ Fonctionne
curl http://localhost:3000/api/profile -b user-cookies.txt

# Route admin : ❌ Échoue avec 403
curl http://localhost:3000/api/admin/stats -b user-cookies.txt
```

## 🎯 Prochaines étapes

Ce système est volontairement simple et pédagogique. Pour aller plus loin :

- Ajouter la réinitialisation de mot de passe
- Ajouter la vérification email
- Ajouter un système de roles plus granulaire
- Migrer vers PostgreSQL pour la production
- Ajouter JWT pour une API stateless

---

**Tout fonctionne ?** 🎉

Si vous avez des questions, consultez le code commenté dans `auth.js` et `middleware.js`.
