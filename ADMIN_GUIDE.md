# 👑 Guide du Panel Admin FranScript

Ce guide explique comment utiliser le panel administrateur pour gérer les vidéos et les tags.

## 🎯 Vue d'ensemble

Le panel admin permet de :
- ✅ Créer / Modifier / Supprimer des vidéos
- ✅ Gérer les tags
- ✅ Définir si une vidéo est gratuite ou payante (booléen uniquement)
- ✅ **NOUVEAU:** Gérer les utilisateurs (création, modification, suppression)
- ⚠️ Accessible uniquement aux utilisateurs avec le rôle **admin**

## 🚀 Accès au panel

### 1. Se connecter en tant qu'admin

**Compte admin par défaut:**
- Email: `admin@test.com`
- Mot de passe: `admin123`

Pour créer un compte admin:
```bash
cd backend
node create-admin.js
```

Autres comptes de test disponibles:
- **Premium:** `premium@test.com` / `premium123`
- **Gratuit:** `free@test.com` / `free123`

### 2. Accéder au panel admin

Une fois connecté en tant qu'admin :

```
http://localhost:8000/admin.html
```

> ⚠️ Si vous n'êtes pas admin, vous serez redirigé vers la page de connexion.

## 📋 Structure de la base de données

### Table `videos`

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER | ID auto-incrémenté (PK) |
| title | TEXT | Titre de la vidéo (requis) |
| description | TEXT | Description de la vidéo |
| video_url | TEXT | URL du fichier vidéo (requis) |
| subtitle_url | TEXT | URL du fichier sous-titres (.vtt) |
| is_paid | INTEGER | 0 = gratuite, 1 = payante |
| created_at | DATETIME | Date de création |

### Table `tags`

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER | ID auto-incrémenté (PK) |
| name | TEXT | Nom du tag (unique) |

### Table `video_tags`

| Colonne | Type | Description |
|---------|------|-------------|
| video_id | INTEGER | Référence à videos(id) |
| tag_id | INTEGER | Référence à tags(id) |

## 🔌 API Endpoints

Toutes les routes admin nécessitent :
- ✅ Authentification (`requireAuth`)
- 👑 Rôle admin (`requireAdmin`)

### Vidéos

#### GET /admin/videos
Récupère toutes les vidéos avec leurs tags

```bash
curl http://localhost:3000/admin/videos \
  -b cookies.txt
```

**Réponse :**
```json
{
  "videos": [
    {
      "id": 1,
      "title": "Ma Première Vidéo",
      "description": "Introduction à FranScript",
      "video_url": "videos/ma_video.mp4",
      "subtitle_url": "videos/ma_video.vtt",
      "is_paid": 0,
      "created_at": "2025-12-28 10:00:00",
      "tags": [
        { "id": 1, "name": "Education" },
        { "id": 2, "name": "Culte" }
      ]
    }
  ]
}
```

#### GET /admin/videos/:id
Récupère une vidéo par son ID

```bash
curl http://localhost:3000/admin/videos/1 \
  -b cookies.txt
```

#### POST /admin/videos
Crée une nouvelle vidéo

```bash
curl -X POST http://localhost:3000/admin/videos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Les Intouchables",
    "description": "Film culte français",
    "video_url": "videos/intouchables.mp4",
    "subtitle_url": "videos/intouchables.vtt",
    "is_paid": false,
    "tagIds": [1, 2]
  }'
```

**Paramètres :**
- `title` (requis) : Titre de la vidéo
- `description` : Description
- `video_url` (requis) : Chemin relatif ou URL de la vidéo
- `subtitle_url` : Chemin relatif ou URL des sous-titres
- `is_paid` : true ou false (défaut: false)
- `tagIds` : Array d'IDs de tags

**Réponse :**
```json
{
  "message": "Vidéo créée avec succès",
  "video": {
    "id": 2,
    "title": "Les Intouchables",
    ...
  }
}
```

#### PUT /admin/videos/:id
Met à jour une vidéo

```bash
curl -X PUT http://localhost:3000/admin/videos/2 \
  -H "Content-Type": application/json" \
  -b cookies.txt \
  -d '{
    "title": "Les Intouchables (Updated)",
    "description": "Film culte français - Version Director",
    "video_url": "videos/intouchables.mp4",
    "subtitle_url": "videos/intouchables.vtt",
    "is_paid": true,
    "tagIds": [1, 2, 3]
  }'
```

#### DELETE /admin/videos/:id
Supprime une vidéo

```bash
curl -X DELETE http://localhost:3000/admin/videos/2 \
  -b cookies.txt
```

**Réponse :**
```json
{
  "message": "Vidéo supprimée avec succès"
}
```

### Tags

#### GET /admin/tags
Récupère tous les tags

```bash
curl http://localhost:3000/admin/tags \
  -b cookies.txt
```

**Réponse :**
```json
{
  "tags": [
    { "id": 1, "name": "Education" },
    { "id": 2, "name": "Culte" },
    { "id": 3, "name": "Comédie" }
  ]
}
```

#### POST /admin/tags
Crée un nouveau tag

```bash
curl -X POST http://localhost:3000/admin/tags \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Drame"}'
```

**Réponse :**
```json
{
  "message": "Tag créé avec succès",
  "tag": {
    "id": 4,
    "name": "Drame"
  }
}
```

#### DELETE /admin/tags/:id
Supprime un tag

```bash
curl -X DELETE http://localhost:3000/admin/tags/4 \
  -b cookies.txt
```

> ⚠️ La suppression d'un tag supprime automatiquement ses associations avec les vidéos (CASCADE).

### Utilisateurs

#### GET /admin/users
Récupère tous les utilisateurs

```bash
curl http://localhost:3000/admin/users \
  -b cookies.txt
```

**Réponse :**
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@test.com",
      "username": "Super Admin",
      "role": "admin",
      "is_premium": 1,
      "created_at": "2025-12-29 10:00:00"
    }
  ]
}
```

#### POST /admin/users
Crée un nouvel utilisateur

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "newuser@test.com",
    "password": "motdepasse123",
    "username": "Nouveau User",
    "role": "user",
    "is_premium": false
  }'
```

**Paramètres :**
- `email` (requis) : Email unique de l'utilisateur
- `password` (requis) : Mot de passe (min 6 caractères)
- `username` : Pseudo (optionnel)
- `role` : "user" ou "admin" (défaut: "user")
- `is_premium` : true ou false (défaut: false)

#### PUT /admin/users/:id
Met à jour un utilisateur

```bash
curl -X PUT http://localhost:3000/admin/users/2 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "updated@test.com",
    "username": "Updated User",
    "role": "admin",
    "is_premium": true,
    "password": "newpassword123"
  }'
```

> 💡 Le mot de passe est optionnel lors de la mise à jour. Omettez-le pour le conserver inchangé.

#### DELETE /admin/users/:id
Supprime un utilisateur

```bash
curl -X DELETE http://localhost:3000/admin/users/2 \
  -b cookies.txt
```

> ⚠️ Vous ne pouvez pas supprimer votre propre compte.

## 🎨 Utilisation de l'interface admin.html

### Onglet Vidéos

1. **Créer une vidéo :**
   - Remplir le formulaire "Ajouter une vidéo"
   - Titre et URL vidéo sont obligatoires
   - Sélectionner les tags souhaités
   - Cocher "Vidéo payante" si nécessaire
   - Cliquer sur "Créer la vidéo"

2. **Modifier une vidéo :**
   - Cliquer sur "Modifier" dans la liste
   - Le formulaire se remplit automatiquement
   - Modifier les champs
   - Cliquer sur "Mettre à jour"

3. **Supprimer une vidéo :**
   - Cliquer sur "Supprimer"
   - Confirmer la suppression

### Onglet Tags

1. **Créer un tag :**
   - Entrer le nom du tag
   - Cliquer sur "Créer le tag"

2. **Supprimer un tag :**
   - Cliquer sur "Supprimer" à côté du tag
   - Confirmer la suppression

### Page Gestion des Utilisateurs (`admin-users.html`)

Accessible via le bouton "👥 Gestion des Utilisateurs" dans le header du panel admin.

1. **Créer un utilisateur :**
   - Remplir le formulaire de création :
     * Email (requis, unique)
     * Mot de passe (requis, min 6 caractères)
     * Pseudo (optionnel)
     * Rôle: Utilisateur ou Admin
     * Cocher "Compte Premium" si nécessaire
   - Cliquer sur "✨ Créer l'utilisateur"

2. **Rechercher un utilisateur :**
   - Utiliser la barre de recherche en temps réel
   - Recherche par email, pseudo, ID ou rôle

3. **Modifier un utilisateur :**
   - Cliquer sur "✏️ Modifier" dans la liste
   - Le modal s'ouvre avec les données actuelles
   - Modifier les champs souhaités
   - Le mot de passe est optionnel (laisser vide pour ne pas changer)
   - Cliquer sur "💾 Enregistrer"

4. **Supprimer un utilisateur :**
   - Cliquer sur "🗑️ Supprimer"
   - Confirmer la suppression
   - ⚠️ Vous ne pouvez pas supprimer votre propre compte

**Fonctionnalités:**
- ✅ Liste complète des utilisateurs avec badges (Admin/Premium/Gratuit)
- ✅ Recherche en temps réel
- ✅ Formatage intelligent des dates
- ✅ Validation côté client et serveur
- ✅ Notifications de succès/erreur
- ✅ Interface en thème sombre

## 📝 Workflow complet

### Scénario : Ajouter une nouvelle vidéo

```bash
# 1. Créer des tags
curl -X POST http://localhost:3000/admin/tags \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Comédie"}'

curl -X POST http://localhost:3000/admin/tags \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Drame"}'

# 2. Lister les tags pour récupérer leurs IDs
curl http://localhost:3000/admin/tags -b cookies.txt

# Réponse: {"tags": [{"id": 1, "name": "Comédie"}, {"id": 2, "name": "Drame"}]}

# 3. Créer la vidéo avec les tags
curl -X POST http://localhost:3000/admin/videos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Amélie Poulain",
    "description": "Film français iconique",
    "video_url": "videos/amelie.mp4",
    "subtitle_url": "videos/amelie.vtt",
    "is_paid": false,
    "tagIds": [1]
  }'

# 4. Vérifier la création
curl http://localhost:3000/admin/videos -b cookies.txt
```

## 🔒 Sécurité

### Protections en place

✅ Routes protégées par middleware `requireAuth` et `requireAdmin`
✅ Seuls les admins peuvent accéder aux endpoints
✅ Validation des données en entrée
✅ Contraintes de base de données (unique, foreign keys)
✅ Suppression en cascade (tags ↔ vidéos)

### Si vous n'êtes pas admin

```bash
# Tentative d'accès sans être admin
curl http://localhost:3000/admin/videos -b user-cookies.txt
```

**Réponse :**
```json
{
  "error": "Accès réservé aux administrateurs"
}
```

**Code HTTP :** 403 Forbidden

## 🐛 Dépannage

### Erreur : "Accès réservé aux administrateurs"

**Cause :** Vous n'êtes pas connecté en tant qu'admin

**Solution :**
1. Vérifiez votre rôle : `curl http://localhost:3000/auth/me -b cookies.txt`
2. Si vous n'êtes pas admin, supprimez la BDD et recréez un compte :
   ```bash
   rm backend/franscript.db
   # Redémarrez le backend
   # Inscrivez-vous (1er utilisateur = admin)
   ```

### Erreur : "Ce tag existe déjà"

**Cause :** Un tag avec ce nom existe déjà (contrainte UNIQUE)

**Solution :** Utilisez un autre nom ou supprimez l'ancien tag

### Erreur : "Le titre et l'URL de la vidéo sont requis"

**Cause :** Champs obligatoires manquants

**Solution :** Renseignez au minimum `title` et `video_url`

### La vidéo ne s'affiche pas

**Cause :** Chemin du fichier vidéo incorrect

**Solution :** Vérifiez que le fichier existe :
```bash
ls videos/ma_video.mp4
```

## 📊 Exemples de données

### Créer des tags de base

```bash
# Tags de catégories
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Comédie"}'
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Drame"}'
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Documentaire"}'
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Education"}'

# Tags spéciaux
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Culte"}'
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Niveau B2"}'
curl -X POST http://localhost:3000/admin/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name": "Niveau C1"}'
```

### Créer des vidéos d'exemple

```bash
# Vidéo gratuite
curl -X POST http://localhost:3000/admin/videos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Apprendre les expressions françaises",
    "description": "Vidéo éducative sur les expressions courantes",
    "video_url": "videos/expressions.mp4",
    "subtitle_url": "videos/expressions.vtt",
    "is_paid": false,
    "tagIds": [4, 6]
  }'

# Vidéo payante
curl -X POST http://localhost:3000/admin/videos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Les Intouchables - Analyse complète",
    "description": "Étude approfondie du film avec vocabulaire avancé",
    "video_url": "videos/intouchables_analyse.mp4",
    "subtitle_url": "videos/intouchables_analyse.vtt",
    "is_paid": true,
    "tagIds": [1, 5, 7]
  }'
```

## 🎯 Prochaines étapes possibles

Ce système admin est volontairement minimal. Pour aller plus loin :

- Ajouter pagination pour les listes
- Ajouter recherche/filtres
- Upload de fichiers directement dans l'interface
- Prévisualisation des vidéos
- Statistiques d'utilisation (vues, durée moyenne, etc.)
- Gestion des niveaux CECRL (A1, A2, B1, B2, C1, C2)
- Catégories multiples

---

**Le panel admin fonctionne ?** 🎉

Pour toute question, consultez `AUTH_GUIDE.md` pour l'authentification et `database.js` pour la structure complète de la BDD.
