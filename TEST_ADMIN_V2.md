# 🧪 Test Admin Panel v2.0 - Guide Rapide

## ⚠️ VERSION 2.0 avec DEBUG PANEL

Cette version inclut:
- ✅ Panel de debug visible en haut de la page (fond jaune)
- ✅ Cache-busting pour éviter les problèmes de cache navigateur
- ✅ Logs détaillés dans la console avec préfixe `[v2.0]`
- ✅ Affichage visuel de chaque étape d'authentification
- ✅ Redirection retardée de 3 secondes avec alerte

## 📝 PROCÉDURE DE TEST

### 1. Mettre à jour le code

```bash
cd /home/user/franscript
git fetch origin
git pull origin claude/video-website-setup-SYOIN
```

**Vérifier que vous avez bien la v2.0:**
```bash
head -20 admin.html | grep "v2.0"
```
Vous devriez voir: `<title>FranScript - Panel Admin v2.0</title>`

### 2. Redémarrer le backend (si nécessaire)

```bash
cd backend
npm start
```

Le backend devrait afficher:
```
🤖 Backend FranScript démarré sur http://localhost:3000
```

### 3. Redémarrer le serveur frontend

```bash
# Tuer l'ancien http-server si actif
pkill -f http-server

# Lancer un nouveau serveur
npx http-server -p 8000
```

### 4. VIDER LE CACHE DU NAVIGATEUR

**Option 1 - Cache dur (recommandé):**
- Chrome/Edge: `Ctrl + Shift + Delete`
- Sélectionner "Cached images and files"
- Période: "All time"
- Cliquer sur "Clear data"

**Option 2 - Rechargement forcé:**
- `Ctrl + Shift + R` (Linux/Windows)
- `Cmd + Shift + R` (Mac)

### 5. Se connecter en tant qu'admin

1. Aller sur: `http://localhost:8000/auth-demo.html`
2. Se connecter avec vos identifiants admin
3. Vérifier que `/auth/me` affiche bien `"role": "admin"`

### 6. Accéder au panel admin

```
http://localhost:8000/admin.html
```

## ✅ CE QUE VOUS DEVRIEZ VOIR

### Si tout fonctionne:

**En haut de la page, un panel jaune avec:**
```
🔍 DEBUG MODE - VERSION 2.0 (28/12/2025)
✅ Page chargée: v2.0 avec cache-busting
✅ Cookies détectés: connect.sid=...
✅ Authentifié: votre@email.com
✅ Rôle: admin
```

**Dans la console (F12):**
```
[v2.0] Étape 1: Vérification des cookies
[v2.0] Cookies présents: OUI
[v2.0] Cookies: connect.sid=...
[v2.0] Étape 2: Appel à /auth/me
[v2.0] Status: 200
[v2.0] Étape 3: Parsing de la réponse
[v2.0] User data: {user: {id: 1, email: "...", role: "admin"}}
[v2.0] Étape 4: Vérification du rôle
[v2.0] Rôle: admin
[v2.0] ✅ SUCCÈS - Accès admin autorisé
```

### Si ça ne fonctionne pas:

**Panel jaune affichera exactement où ça coince:**

❌ **Aucun cookie détecté** → Problème de session, se reconnecter
❌ **Auth échouée: HTTP 401** → Session expirée, se reconnecter
❌ **Rôle insuffisant: user** → Compte n'est pas admin

## 📸 SCREENSHOT À PARTAGER

Si ça ne marche toujours pas, prenez un screenshot de:

1. **Le panel jaune de debug en haut de la page**
2. **La console du navigateur (F12 → Console)**

Cela nous dira exactement où le problème se situe.

## 🔧 Dépannage rapide

### "Je ne vois pas le panel jaune"
→ Vous n'avez pas la v2.0, vérifiez avec:
```bash
head -20 admin.html | grep "v2.0"
```

### "Panel jaune avec ❌ Aucun cookie détecté"
→ Session expirée, reconnectez-vous sur auth-demo.html

### "Panel jaune avec ❌ Auth échouée: HTTP 401"
→ Backend pas démarré ou session invalide

### "Panel jaune avec ❌ Rôle insuffisant: user"
→ Votre compte n'est pas admin. Supprimer la BDD et se réinscrire:
```bash
rm backend/franscript.db
# Redémarrer backend
# S'inscrire à nouveau (1er user = admin)
```

---

**Cette version v2.0 va nous dire EXACTEMENT où est le problème !** 🎯
