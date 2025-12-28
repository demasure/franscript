# 🧭 Guide de Navigation FranScript

## Vue d'ensemble

Le site dispose maintenant d'une navigation complète et dynamique qui s'adapte au statut de connexion de l'utilisateur.

## Composants de navigation

### 1. Navbar dynamique (`navbar.js` + `navbar.css`)

**Fichiers:**
- `/navbar.js` - Script de gestion de la navbar
- `/navbar.css` - Styles de la navbar

**Fonctionnalités:**
- Détection automatique du statut de connexion via `/auth/me`
- Affichage conditionnel des boutons
- Gestion de la déconnexion
- Bouton admin visible uniquement pour les admins

### 2. États de la navbar

#### Utilisateur NON connecté

```
[Accueil] [Vidéos] [À propos]    [Connexion] [Inscription]
```

#### Utilisateur CONNECTÉ

```
[Accueil] [Vidéos] [À propos]    Connecté en tant que user@email.com [Déconnexion]
```

#### Admin CONNECTÉ

```
[Accueil] [Vidéos] [À propos]    Connecté en tant que admin@email.com [Déconnexion] [👑 Espace Admin]
```

## Pages et redirections

### Page d'accueil (`/index.html`)
- **Navbar:** Oui, dynamique
- **Accessible:** Par tous (connecté ou non)
- **Redirection après login:** OUI (depuis auth-demo.html)
- **Redirection après logout:** OUI (depuis toutes les pages)

### Page de connexion (`/auth-demo.html`)
- **Navbar:** Lien "Retour à l'accueil" uniquement
- **Accessible:** Par tous
- **Redirection après succès:**
  - Login réussi → `/index.html` (1 seconde)
  - Inscription réussie → `/index.html` (1 seconde)

### Lecteur vidéo (`/player.html`)
- **Navbar:** Oui, avec "Retour aux vidéos" + navbar dynamique
- **Accessible:** Par tous (connecté ou non)

### Panel admin (`/admin.html`)
- **Navbar:** Propre header avec lien "Retour à l'accueil"
- **Accessible:** ADMINS UNIQUEMENT
- **Protection backend:** `requireAuth` + `requireAdmin`
- **Redirections:**
  - Non connecté → `/auth-demo.html` (avec alerte)
  - Connecté mais pas admin → `/index.html` (avec alerte)
  - Logout → `/index.html`

## API Backend

### Route `/auth/me`

**Méthode:** GET
**Authentification:** Requise (session)

**Réponse si connecté (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Réponse si NON connecté (401):**
```json
{
  "error": "Non authentifié"
}
```

### Route `/auth/logout`

**Méthode:** POST
**Authentification:** Requise (session)

Détruit la session et renvoie succès.

## Tests manuels

### Test 1: Navigation utilisateur non connecté

```bash
# 1. Démarrer les serveurs
cd backend && npm start &
npx http-server -p 8000
```

1. Ouvrir `http://localhost:8000/index.html`
2. Vérifier la navbar → Doit afficher **[Connexion] [Inscription]**
3. Cliquer sur "Connexion" → Redirige vers `/auth-demo.html`
4. Cliquer sur "Retour à l'accueil" → Retour à `/index.html`

### Test 2: Connexion et navigation

1. Aller sur `/auth-demo.html`
2. Se connecter avec un compte existant
3. **Vérifier:** Message "Connexion réussie ! Redirection..."
4. **Vérifier:** Redirection automatique vers `/index.html` après 1 seconde
5. **Vérifier:** Navbar affiche "Connecté en tant que [email]" + bouton "Déconnexion"

### Test 3: Inscription et navigation

1. Aller sur `/auth-demo.html`
2. Cliquer sur l'onglet "Inscription"
3. S'inscrire avec un nouveau compte
4. **Vérifier:** Message "Inscription réussie ! Redirection..."
5. **Vérifier:** Redirection automatique vers `/index.html`
6. **Vérifier:** Navbar affiche le statut connecté

### Test 4: Bouton admin

1. Se connecter en tant qu'admin (premier utilisateur inscrit)
2. Aller sur `/index.html`
3. **Vérifier:** Navbar affiche le bouton **[👑 Espace Admin]**
4. Cliquer sur "Espace Admin" → Redirige vers `/admin.html`
5. **Vérifier:** Panel admin s'affiche correctement

### Test 5: Protection admin

1. Se connecter en tant qu'utilisateur normal (pas admin)
2. Tenter d'accéder à `/admin.html` directement
3. **Vérifier:** Alerte "Accès réservé aux administrateurs"
4. **Vérifier:** Redirection vers `/index.html`

### Test 6: Déconnexion

1. Être connecté sur n'importe quelle page
2. Cliquer sur "Déconnexion" dans la navbar
3. **Vérifier:** Redirection vers `/index.html`
4. **Vérifier:** Navbar affiche à nouveau **[Connexion] [Inscription]**

### Test 7: Persistance de session

1. Se connecter
2. Naviguer entre les pages (`/index.html` → `/player.html` → `/index.html`)
3. **Vérifier:** La navbar reste cohérente (statut connecté)
4. **Vérifier:** Pas de re-login nécessaire

### Test 8: Expiration de session

1. Se connecter
2. Redémarrer le backend (`Ctrl+C` puis `npm start`)
3. Rafraîchir `/index.html`
4. **Vérifier:** Navbar affiche **[Connexion] [Inscription]** (session perdue)

## Structure des fichiers

```
franscript/
├── index.html           # Page d'accueil (navbar dynamique)
├── auth-demo.html       # Login/Register (lien retour accueil)
├── player.html          # Lecteur vidéo (navbar dynamique)
├── admin.html           # Panel admin (navbar propre)
├── navbar.js            # Script navbar dynamique
├── navbar.css           # Styles navbar
└── backend/
    └── auth.js          # Routes auth (dont /auth/me)
```

## Sécurité

### Frontend
- Les boutons sont cachés/affichés selon le rôle
- **ATTENTION:** C'est uniquement pour l'UX, pas pour la sécurité

### Backend
- **Vraie protection:** Middlewares `requireAuth` et `requireAdmin`
- Routes `/admin/*` protégées côté serveur
- Un utilisateur peut tenter d'accéder à `/admin.html` mais les requêtes API échoueront (403)

## Notes importantes

### Cookies de session
- Les cookies sont **httpOnly** (non accessibles en JavaScript)
- Envoyés automatiquement avec `credentials: 'include'`
- Le test `document.cookie` renvoie vide mais les cookies fonctionnent

### Chemins absolus
- Tous les liens utilisent des chemins absolus (`/index.html` au lieu de `index.html`)
- Évite les problèmes de navigation entre dossiers

### Cache
- `navbar.css` et `navbar.js` peuvent être mis en cache
- En cas de problème, vider le cache navigateur (Ctrl+Shift+Suppr)

---

**Navigation fonctionnelle et prête pour production !** 🎉
