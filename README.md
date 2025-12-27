# 🎬 FranScript - Vidéos avec Sous-titres Interactifs

Site web minimaliste pour apprendre le français à travers des vidéos avec sous-titres interactifs.

## 📁 Structure du Projet

```
franscript/
├── index.html          # Page d'accueil principale
├── style.css           # Styles CSS (design moderne type Netflix/Plex)
├── script.js           # Interactions JavaScript (lecteur vidéo activé)
├── README.md           # Documentation
└── videos/             # Dossier pour les vidéos et sous-titres
    ├── ma_video.mkv    # ⚠️ VOUS DEVEZ AJOUTER CE FICHIER (.mkv, .mp4, .webm, etc.)
    ├── ma_video.vtt    # Sous-titres exemple (fourni)
    └── INSTRUCTIONS.md # Guide pour ajouter des vidéos
```

**⚠️ IMPORTANT** : Le fichier vidéo n'est PAS inclus dans le repository. Vous devez placer votre propre vidéo dans le dossier `videos/`.

**Formats supportés** : MP4, MKV, WebM, OGG, AVI, MOV - Le type est détecté automatiquement !

## 🚀 Lancement du Site

### Option 1 : Ouverture directe
Ouvrez simplement le fichier `index.html` dans votre navigateur :
- Double-cliquez sur `index.html`
- Ou faites clic-droit → "Ouvrir avec" → Votre navigateur

### Option 2 : Serveur local (recommandé)
Pour éviter les problèmes de CORS si vous ajoutez des vidéos plus tard :

```bash
# Avec Python 3
python3 -m http.server 8000

# Avec Python 2
python -m SimpleHTTPServer 8000

# Avec Node.js (si npx est installé)
npx http-server
```

Puis ouvrez : `http://localhost:8000`

## 🎥 Ajouter Votre Première Vidéo

### Étape 1 : Placez votre fichier vidéo

1. Obtenez un fichier vidéo (recommandé : 720p ou 1080p)
2. Renommez-le **exactement** `ma_video.mkv` (ou `.mp4`, `.webm`, etc.)
3. Placez-le dans le dossier `videos/`

**Formats acceptés** : `.mkv`, `.mp4`, `.webm`, `.ogg`, `.avi`, `.mov`

```
videos/
├── ma_video.mkv    ← Votre fichier vidéo ici (n'importe quel format)
└── ma_video.vtt    ← Sous-titres (déjà fourni)
```

### Étape 2 : Testez le site

1. Lancez le site avec un serveur local (voir ci-dessus)
2. Cliquez sur la première vidéo "Ma Première Vidéo" (badge vert "Vidéo Réelle")
3. Le lecteur s'ouvre avec votre vidéo et les sous-titres synchronisés

### Étape 3 : Personnalisez les sous-titres (optionnel)

Le fichier `ma_video.vtt` contient des sous-titres exemple. Pour le personnaliser :

1. Ouvrez `videos/ma_video.vtt` dans un éditeur de texte
2. Modifiez les timestamps et le texte selon votre vidéo
3. Format WebVTT :

```vtt
WEBVTT

00:00:00.000 --> 00:00:03.500
Premier sous-titre ici.

00:00:03.500 --> 00:00:07.000
Deuxième sous-titre ici.
```

**Outils recommandés pour créer des sous-titres :**
- Subtitle Edit (Windows) - Gratuit
- Aegisub (Mac/Linux/Windows) - Open source
- YouTube Studio - Auto-génération puis export en .vtt

### 📌 Ajouter d'autres vidéos

Consultez le fichier `videos/INSTRUCTIONS.md` pour apprendre à ajouter plusieurs vidéos.

## ✨ Fonctionnalités Actuelles

### 1. Navigation
- **Menu principal** : Accueil, Vidéos, À propos
- **Logo cliquable** : Retour à l'accueil
- **Navigation sticky** : Menu reste visible en scrollant

### 2. Filtrage par Catégories
- Boutons de filtre : Toutes, Comédie, Drame, Documentaire, Éducation
- Animation fluide lors du filtrage
- Clic sur une catégorie affiche uniquement les vidéos correspondantes

### 3. Grille de Vidéos
- 1 vidéo réelle avec lecteur activé + 5 vidéos fictives
- Chaque carte contient :
  - Image de couverture (placeholder)
  - Titre et description
  - Durée et niveau de difficulté
  - Tags/catégories avec code couleur
  - Bouton "Lire" au survol

### 4. Lecteur Vidéo HTML5 avec Sous-titres ✨ NOUVEAU
- **Modal plein écran** pour une expérience immersive
- **Sous-titres WebVTT** synchronisés automatiquement
- **Contrôles natifs** : play/pause, volume, plein écran
- **Bouton CC** pour activer/désactiver les sous-titres
- **Fermeture** : bouton X, touche Échap, ou clic extérieur
- Structure prête pour annotations futures

### 5. Design Responsive
- S'adapte aux écrans mobile, tablette et desktop
- Grid layout flexible (CSS Grid)
- Hover effects élégants

## 🎨 Personnalisation

### Variables CSS (dans `style.css`)
Modifiez facilement les couleurs et espacements en changeant les variables CSS :

```css
:root {
    --color-primary: #e50914;        /* Couleur principale */
    --color-bg-dark: #141414;        /* Fond principal */
    --spacing-md: 1.5rem;            /* Espacement moyen */
    /* ... */
}
```

### Ajouter une Vidéo Réelle au Site

1. **Placez vos fichiers** dans `videos/` :
   ```
   videos/
   ├── ma_nouvelle_video.mp4
   └── ma_nouvelle_video.vtt
   ```

2. **Copiez-collez une carte vidéo** existante dans `index.html` et modifiez :

```html
<article class="video-card"
         data-categories="comedie"
         data-video-src="videos/ma_nouvelle_video.mp4"
         data-subtitle-src="videos/ma_nouvelle_video.vtt">
    <div class="video-thumbnail">
        <img src="URL_IMAGE" alt="Titre">
        <div class="video-overlay">
            <button class="play-btn">▶ Lire</button>
        </div>
    </div>
    <div class="video-info">
        <h3 class="video-title">Titre de la vidéo</h3>
        <p class="video-description">Description courte</p>
        <div class="video-meta">
            <span class="video-duration">1h 30min</span>
            <span class="video-level">Débutant</span>
        </div>
        <div class="video-tags">
            <span class="tag tag-comedie">Comédie</span>
        </div>
    </div>
</article>
```

**Attributs importants :**
- `data-video-src` : Chemin vers le fichier MP4
- `data-subtitle-src` : Chemin vers le fichier VTT
- Si ces attributs sont vides, un message d'erreur s'affiche au clic

### Ajouter une Catégorie
1. Ajoutez un bouton de filtre dans la section `.filters` :
```html
<button class="filter-btn" data-category="action">Action</button>
```

2. Créez le style du tag dans `style.css` :
```css
.tag-action {
    background-color: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.4);
}
```

3. Utilisez `data-categories="action"` sur les vidéos correspondantes

## 🔮 Fonctionnalités Futures Préparées

Le code est structuré pour faciliter l'ajout de :

### 1. Lecteur Vidéo avec Sous-titres
- Modal déjà créé (caché) dans `index.html`
- Utilise `<video>` HTML5 avec `<track>` pour sous-titres
- Fonctions `openVideoPlayer()` et `closeModal()` prêtes dans `script.js`

### 2. Système de Compte Utilisateur
- Conteneur `window.userSystem` préparé
- Fonctions `login()`, `logout()`, `saveProgress()` à implémenter
- Lien "Mon Compte" caché dans le menu (enlever `display: none`)

### 3. Annotations Interactives
- Conteneur `window.annotationSystem` préparé
- Div `.annotations-container` dans le modal vidéo
- Fonctions pour charger/ajouter/afficher annotations

### 4. Système Premium
- Badges premium sur les vidéos (cachés)
- Section "Fonctionnalités Premium" dans À propos (cachée)
- Conteneur `window.premiumSystem` préparé

### 5. Recherche Avancée
- Conteneur `window.searchSystem` préparé
- Recherche dans titres, descriptions, sous-titres

## 📝 Comment Ajouter des Vraies Vidéos

### 1. Créez un dossier `/videos`
```bash
mkdir videos
```

### 2. Ajoutez vos fichiers vidéo
- Format recommandé : MP4 (H.264)
- Nommez-les clairement : `diner-de-cons.mp4`

### 3. Créez les sous-titres
- Format : WebVTT (.vtt) ou SRT (.srt)
- Exemple : `diner-de-cons.fr.vtt`

### 4. Modifiez `script.js`
Mettez à jour la fonction `getVideoSource()` :
```javascript
function getVideoSource(videoTitle) {
    const videoMap = {
        'Le Dîner de Cons': './videos/diner-de-cons.mp4',
        'Intouchables': './videos/intouchables.mp4',
    };
    return videoMap[videoTitle] || '';
}
```

### 5. Activez le modal
Dans `script.js`, décommentez les appels à `openVideoPlayer()` dans les event listeners.

## 🎯 Prochaines Étapes Recommandées

1. **Ajouter vraies vidéos** : Remplacer les placeholders
2. **Créer fichiers de sous-titres** : Format WebVTT avec timestamps
3. **Implémenter lecteur** : Activer le modal et gérer la lecture
4. **Backend (optionnel)** : Node.js + Express pour API et base de données
5. **Authentification** : Système de comptes avec JWT
6. **Annotations IA** : Intégration d'API pour suggestions intelligentes

## 🛠️ Technologies Utilisées

- **HTML5** : Structure sémantique
- **CSS3** : Variables CSS, Grid, Flexbox, animations
- **JavaScript vanilla** : Pas de dépendances externes
- **Design inspiré de** : Netflix, Plex, YouTube

## 📚 Ressources

### Pour les Sous-titres WebVTT
- [Spécification WebVTT](https://developer.mozilla.org/fr/docs/Web/API/WebVTT_API)
- Exemple de fichier `.vtt` :
```vtt
WEBVTT

00:00:01.000 --> 00:00:04.000
Bonjour et bienvenue !

00:00:04.500 --> 00:00:08.000
Ceci est un sous-titre interactif.
```

### Pour les Annotations
Utilisez `<track kind="metadata">` pour des données personnalisées (annotations, notes, traductions).

## 🐛 Résolution de Problèmes

### Les images ne s'affichent pas
- Vérifiez que les URLs placeholder sont accessibles
- Remplacez par vos propres images si nécessaire

### Le filtrage ne fonctionne pas
- Ouvrez la console du navigateur (F12)
- Vérifiez qu'il n'y a pas d'erreurs JavaScript
- Assurez-vous que `data-categories` est bien défini sur chaque carte

### Le style est cassé
- Vérifiez que `style.css` est dans le même dossier que `index.html`
- Vérifiez le chemin dans `<link rel="stylesheet" href="style.css">`

## 📄 Licence

Projet libre pour usage personnel et éducatif.

## 👤 Auteur

Créé pour le projet FranScript - Apprentissage du français par vidéos interactives

---

**Bon développement ! 🚀**
