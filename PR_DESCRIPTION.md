# Fix: Thumbnails upload + admin UI fixes (switchTab, sanitize)

## 🎯 Résumé

Patch minimal pour ajouter la gestion des thumbnails dans l'admin, corriger des bugs UI et améliorer la sécurité.

## ✨ Changements

### Backend (backend/admin.js)
- ✅ Ajout route `POST /admin/upload-thumbnail` avec multer (5MB max, images uniquement)
- ✅ Modification `POST /admin/videos` pour accepter et persister `thumbnail_url`
- ✅ Modification `PUT /admin/videos/:id` pour accepter et persister `thumbnail_url`
- ✅ Si `thumbnail_url` fourni, utilisation directe ; sinon extraction automatique FFmpeg
- ✅ Création automatique du dossier `uploads/thumbnails/`

### Frontend (admin.html)
**Features thumbnails:**
- ✅ Ajout champ `thumbnail_url` (texte) dans formulaire vidéo
- ✅ Ajout input file pour upload avec preview (80x45px)
- ✅ Upload automatique vers `/admin/upload-thumbnail` au changement de fichier
- ✅ Remplissage auto du champ URL après upload réussi
- ✅ Affichage colonne thumbnail dans tableau des vidéos
- ✅ Chargement thumbnail lors de l'édition
- ✅ Reset complet des champs thumbnail dans resetVideoForm()

**Bug fixes UI:**
- 🐛 Fix `switchTab(e, tab)` : ajout paramètre event explicite (admin.html:846)
- 🐛 Fix `filterReports(e, status)` : ajout paramètre event explicite (admin.html:1653)
- 🐛 Suppression dépendance variable globale `event` (non standard)

**Sécurité:**
- 🔒 `displayVideos()` : sécurisé via `createElement` + `textContent` (admin.html:1011-1081)
- 🔒 `displayTags()` : sécurisé via `createElement` + `textContent` (admin.html:1246-1282)
- 🔒 Protection contre XSS dans titres vidéos et noms de tags
- 🔒 Remplacement `innerHTML` par création sécurisée d'éléments DOM

## 📂 Fichiers modifiés

- `backend/admin.js` (114 insertions, 31 deletions)
- `admin.html` (213 insertions, 37 deletions)

## 🧪 Guide de test

### 1. Installation
```bash
# Aucune nouvelle dépendance (multer déjà installé)
npm install
```

### 2. Lancer le backend
```bash
cd backend
node server.js
```
Le serveur devrait démarrer sur http://localhost:3000

### 3. Tester l'upload de thumbnail

**A. Via l'interface admin:**
1. Ouvrir http://localhost:3000/admin.html
2. Se connecter en tant qu'admin
3. Dans "Ajouter une vidéo", utiliser le champ "Uploader une vignette"
4. Sélectionner une image (JPG/PNG/GIF/WebP, max 5MB)
5. ✅ Vérifier que :
   - Un preview s'affiche immédiatement
   - Le champ "URL de la vignette" se remplit automatiquement
   - Message de succès "Vignette uploadée avec succès"

**B. Soumettre la vidéo:**
1. Remplir titre + video_url
2. Cliquer "Créer la vidéo"
3. ✅ Vérifier que la vidéo apparaît dans la liste avec sa vignette

**C. Éditer une vidéo:**
1. Cliquer "Modifier" sur une vidéo
2. ✅ Vérifier que le thumbnail existant s'affiche en preview
3. Uploader une nouvelle vignette
4. ✅ Vérifier que le preview change
5. Cliquer "Mettre à jour"
6. ✅ Vérifier que la nouvelle vignette est conservée

**D. Test curl (optionnel):**
```bash
# Upload direct
curl -X POST http://localhost:3000/admin/upload-thumbnail \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "thumbnail=@./test-image.jpg"

# Devrait retourner:
# {"url":"/uploads/thumbnails/thumbnail-1234567890-abc123.jpg","filename":"...","size":...}
```

### 4. Tester les correctifs UI

**A. switchTab:**
1. Ouvrir l'admin
2. Cliquer sur les onglets "Vidéos", "Tags", "Signalements", "Statistiques"
3. ✅ Vérifier qu'il n'y a **aucune erreur console**
4. ✅ Vérifier que les onglets changent correctement

**B. filterReports:**
1. Aller dans l'onglet "Signalements"
2. Cliquer sur "Tous", "Nouveaux", "Traités", "Ignorés"
3. ✅ Vérifier qu'il n'y a **aucune erreur console**
4. ✅ Vérifier que les filtres fonctionnent

### 5. Tester la sécurité (anti-XSS)

**A. Créer une vidéo avec titre malicieux:**
```javascript
// Dans le formulaire, mettre comme titre:
<img src=x onerror=alert('XSS')>

// ✅ Le titre doit s'afficher comme texte brut (pas d'exécution JS)
```

**B. Créer un tag avec nom malicieux:**
```javascript
// Dans le formulaire tag, mettre comme nom:
<script>alert('XSS')</script>

// ✅ Le nom doit s'afficher comme texte brut (pas d'exécution JS)
```

### 6. Vérifier l'accessibilité des thumbnails

```bash
# Vérifier que le dossier existe
ls uploads/thumbnails/

# Les images doivent être servies via /uploads
# Ouvrir dans le navigateur:
http://localhost:3000/uploads/thumbnails/thumbnail-1234567890-abc123.jpg
```

## ⚠️ Notes importantes

### Pas de migration DB nécessaire
Le champ `thumbnail_url` existe **déjà** dans la table `videos` (SQLite). Aucune migration requise.

### Compatibilité backward
- Les vidéos sans `thumbnail_url` affichent "—" dans la table
- L'extraction automatique FFmpeg continue de fonctionner si aucun thumbnail fourni
- Pas de breaking changes

### Limitations connues
- Stockage local dans `uploads/thumbnails/` (TODO: migration future vers S3/R2)
- Taille max 5MB par image
- Formats acceptés : JPG, PNG, GIF, WebP

### Sécurité
- Route `/admin/upload-thumbnail` protégée par middlewares `requireAuth` + `requireAdmin`
- Validation mimetype côté serveur (multer)
- Sanitization XSS sur tous les affichages dynamiques

## ✅ Critères d'acceptation

- [x] Admin peut uploader une image via le formulaire
- [x] Preview s'affiche immédiatement
- [x] URL se remplit automatiquement
- [x] Vidéo créée/éditée conserve `thumbnail_url` en BDD
- [x] Liste des vidéos affiche les vignettes
- [x] Route `/admin/upload-thumbnail` fonctionne (testable via curl)
- [x] `switchTab` ne dépend plus de variable `event` globale
- [x] `filterReports` ne dépend plus de variable `event` globale
- [x] Titres vidéos et noms de tags ne permettent plus XSS
- [x] Aucune erreur console lors de l'utilisation

## 🔮 Améliorations futures

- [ ] Migration vers stockage cloud (S3/R2)
- [ ] Compression automatique des images (sharp)
- [ ] Crop/resize avant upload
- [ ] Drag & drop pour upload
- [ ] Tests automatisés (Jest/Mocha)

---

**Branch:** `claude/fix-thumbnails-admin-s2pER`
**Commits:** 2 (backend + frontend)
**Type:** Patch minimal, sûr et testable

## 📝 Instructions pour créer la PR

Ouvrir manuellement la PR via :
https://github.com/demasure/franscript/pull/new/claude/fix-thumbnails-admin-s2pER

Ou utiliser la commande :
```bash
gh pr create --title "Fix: Thumbnails upload + admin UI fixes (switchTab, sanitize)" --body-file PR_DESCRIPTION.md --base claude/video-website-setup-SYOIN
```
