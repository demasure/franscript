# 🎬 Architecture Saga → Saison → Épisode

## 📋 Vue d'ensemble

Ce document décrit la nouvelle architecture hiérarchique de FranScript qui remplace le système simple de vidéos par un modèle structuré :

```
SAGA (Série / Film)
 └── SAISON(S)
      └── ÉPISODE(S)
```

## 🗄️ Modèle de données

### Table `sagas`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Clé primaire |
| `title` | TEXT | Titre de la saga |
| `description` | TEXT | Description |
| `cover_image` | TEXT | Image de couverture |
| `is_premium` | INTEGER | 1 si premium, 0 sinon |
| `type` | TEXT | 'serie' ou 'film' |
| `created_at` | DATETIME | Date de création |

### Table `saisons`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Clé primaire |
| `saga_id` | INTEGER | FK vers sagas |
| `title` | TEXT | Titre de la saison |
| `order_index` | INTEGER | Ordre d'affichage |
| `description` | TEXT | Description |
| `is_premium` | INTEGER | 1 si premium, 0 sinon |
| `created_at` | DATETIME | Date de création |

### Table `episodes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Clé primaire |
| `saison_id` | INTEGER | FK vers saisons |
| `title` | TEXT | Titre de l'épisode |
| `episode_number` | INTEGER | Numéro de l'épisode |
| `video_url` | TEXT | URL de la vidéo |
| `subtitle_url` | TEXT | URL des sous-titres |
| `thumbnail_url` | TEXT | URL de la miniature |
| `duration` | INTEGER | Durée en secondes |
| `is_premium` | INTEGER | 1 si premium, 0 sinon |
| `free_preview_seconds` | INTEGER | Durée preview gratuite (nullable) |
| `created_at` | DATETIME | Date de création |

### Table `saga_tags`

Relation many-to-many entre sagas et tags.

| Champ | Type | Description |
|-------|------|-------------|
| `saga_id` | INTEGER | FK vers sagas |
| `tag_id` | INTEGER | FK vers tags |

## 🔐 Logique Premium

### Règle hiérarchique

Un épisode est considéré comme **premium** si :
- `episode.is_premium === 1` **OU**
- `saison.is_premium === 1` **OU**
- `saga.is_premium === 1`

### Vérification d'accès

Le service `backend/services/premiumService.js` gère la logique d'accès :

```javascript
const { canUserAccessEpisode } = require('./services/premiumService');

// Vérifier si un utilisateur peut accéder à un épisode
const accessCheck = await canUserAccessEpisode(userId, episodeId);

if (!accessCheck.allowed) {
    return res.status(403).json({ error: accessCheck.reason });
}
```

**Règles d'accès** :
- ✅ **Admin** : accès à tout
- ✅ **Premium** : accès aux contenus premium
- ✅ **Gratuit** : accès uniquement aux contenus non-premium
- ❌ **Non connecté** : aucun accès aux contenus premium

## 🚀 Migration des données

### Script de migration

Le script `backend/migrate-videos-to-sagas.js` permet de migrer les vidéos existantes vers le nouveau modèle.

#### Mode AUTO (recommandé)

Chaque vidéo devient une saga individuelle :

```bash
cd backend
node migrate-videos-to-sagas.js auto
```

**Résultat** :
- 1 vidéo = 1 saga (type 'film') + 1 saison + 1 épisode

#### Mode GROUPE

Toutes les vidéos sont regroupées dans une seule saga :

```bash
node migrate-videos-to-sagas.js groupe
```

**Résultat** :
- Toutes les vidéos → 1 saga "Vidéos importées" + 1 saison + N épisodes

## 🛠️ Routes API

### Routes publiques

#### Sagas

- `GET /api/sagas` - Liste toutes les sagas
- `GET /api/sagas/:id` - Détails d'une saga + ses saisons

#### Saisons

- `GET /api/saisons/:id` - Détails d'une saison + ses épisodes

#### Épisodes

- `GET /api/episodes/:id` - Détails d'un épisode avec vérification d'accès

### Routes admin (protégées)

#### Sagas

- `GET /admin/sagas` - Liste
- `GET /admin/sagas/:id` - Détails
- `POST /admin/sagas` - Créer
- `PUT /admin/sagas/:id` - Modifier
- `DELETE /admin/sagas/:id` - Supprimer

#### Saisons

- `GET /admin/saisons/saga/:sagaId` - Saisons d'une saga
- `GET /admin/saisons/:id` - Détails
- `POST /admin/saisons` - Créer
- `PUT /admin/saisons/:id` - Modifier
- `DELETE /admin/saisons/:id` - Supprimer

#### Épisodes

- `GET /admin/episodes/saison/:saisonId` - Épisodes d'une saison
- `GET /admin/episodes/:id` - Détails
- `POST /admin/episodes` - Créer
- `PUT /admin/episodes/:id` - Modifier
- `DELETE /admin/episodes/:id` - Supprimer

## 🖥️ Interface Admin

### Page admin-content.html

Interface de gestion hiérarchique en 3 colonnes :

1. **Colonne Sagas** : Gérer les sagas
2. **Colonne Saisons** : Gérer les saisons de la saga sélectionnée
3. **Colonne Épisodes** : Gérer les épisodes de la saison sélectionnée

**Fonctionnalités** :
- ✅ CRUD complet pour chaque niveau
- ✅ Navigation progressive (saga → saison → épisode)
- ✅ Gestion des statuts premium à chaque niveau
- ✅ Détection automatique de durée et génération de thumbnails

## 🎨 Frontend

### Pages

1. **index.html** (mode sagas)
   - Affiche toutes les sagas
   - Filtres par tags
   - Badges premium

2. **saga.html**
   - Affiche les saisons d'une saga
   - Informations de la saga
   - Vérification premium

3. **saison.html**
   - Affiche les épisodes d'une saison
   - Fil d'Ariane (breadcrumb)
   - Vignettes d'épisodes

4. **player.html**
   - Lecture d'un épisode
   - Inchangé (compatible avec le nouveau système)

### Basculer entre modes

#### Mode Vidéos (ancien système)
```
http://localhost:8000/index.html
```

#### Mode Sagas (nouveau système)
```
http://localhost:8000/index.html?mode=sagas
```

## 📂 Structure des fichiers

### Backend

```
backend/
├── database.js                  # Modèles + fonctions CRUD
├── services/
│   └── premiumService.js        # Logique premium hiérarchique
├── admin.js                     # Routes admin (sagas/saisons/épisodes)
├── server.js                    # Routes publiques API
└── migrate-videos-to-sagas.js   # Script de migration
```

### Frontend

```
├── index.html                   # Page d'accueil (vidéos OU sagas)
├── saga.html                    # Affichage d'une saga
├── saison.html                  # Affichage d'une saison
├── admin-content.html           # Interface admin
├── admin-content.js             # Logique admin
└── script.js                    # Logique frontend (vidéos + sagas)
```

## ✅ Checklist de déploiement

1. ☑️ Lancer la migration des vidéos
   ```bash
   cd backend
   node migrate-videos-to-sagas.js auto
   ```

2. ☑️ Vérifier les données migrées dans admin-content.html

3. ☑️ Tester l'affichage frontend (saga.html, saison.html)

4. ☑️ Vérifier la logique premium (utilisateur free vs premium)

5. ☑️ Tester le player avec les épisodes

6. ☑️ (Optionnel) Désactiver l'ancien système vidéos

## 🔄 Compatibilité

### Ancien système (vidéos)

L'ancien système reste **100% fonctionnel** :
- Tables `videos` et `video_tags` conservées
- Routes `/videos` et `/api/videos/:id` actives
- Player compatible avec les deux systèmes

### Transition progressive

Vous pouvez :
- ✅ Garder les deux systèmes en parallèle
- ✅ Migrer progressivement
- ✅ Basculer facilement entre les deux

## 🚨 Points d'attention

### Sécurité Premium

⚠️ **CRITIQUE** : La vérification premium se fait **TOUJOURS côté backend**.

Le frontend ne décide **jamais** de l'accès. Il affiche seulement :
- Cadenas si bloqué
- Message explicite
- Désactivation du clic

### Cascade de suppression

⚠️ Attention aux suppressions :
- Supprimer une **saga** → supprime ses saisons ET épisodes
- Supprimer une **saison** → supprime ses épisodes
- Supprimer un **épisode** → supprime seulement l'épisode

### Recommandations

1. **Toujours tester** la migration sur une copie de la base
2. **Vérifier** les permissions premium après migration
3. **Sauvegarder** la base avant toute suppression massive
4. **Utiliser** des noms de fichiers cohérents (videos/saga1_s1_ep1.mp4)

## 📝 Exemples d'utilisation

### Créer une nouvelle série

1. Admin → Créer une saga (type: série, titre: "Ma Série")
2. Sélectionner la saga → Créer une saison (titre: "Saison 1")
3. Sélectionner la saison → Créer des épisodes

### Rendre une saison premium

1. Sélectionner la saison
2. Modifier → Cocher "Premium"
3. Enregistrer

→ Tous les épisodes de cette saison deviennent premium automatiquement

### Faire un film premium avec preview gratuite

1. Créer une saga (type: film, premium: true)
2. Créer une saison (Saison 1)
3. Créer un épisode avec `free_preview_seconds: 180` (3 minutes gratuites)

## 🎯 Prochaines étapes (extensibilité)

Le système est conçu pour être facilement étendu :

- 📊 **Statistiques** : Ajouter tracking de visionnage par épisode
- 💳 **Paiements** : Intégrer Stripe/PayPal pour abonnements premium
- 🎁 **Previews** : Implémenter `free_preview_seconds`
- 📱 **API mobile** : Les routes sont prêtes pour une app mobile
- 🌍 **Multi-langues** : Ajouter table `episode_subtitles` pour plusieurs langues
- ⭐ **Notations** : Système de notes par saga/épisode

---

**Architecture conçue pour être propre, scalable et sécurisée. ✨**
