# 📁 Dossier Videos - Instructions

## 🎥 Comment Ajouter Votre Vidéo

### Étape 1 : Placez votre fichier vidéo ici

Copiez votre fichier vidéo dans ce dossier :

```
videos/
└── ma_video.mp4    ← Votre fichier vidéo ici
```

**Formats vidéo recommandés :**
- MP4 (H.264) - **Recommandé** (compatible tous navigateurs)
- WebM (VP9)
- OGG (Theora)

**Conseils :**
- Nom de fichier sans espaces ni accents : `ma_video.mp4` ✅ pas `Ma Vidéo.mp4` ❌
- Taille recommandée : 720p ou 1080p
- Compression : utilisez HandBrake pour réduire la taille si nécessaire

### Étape 2 : Créez le fichier de sous-titres

Un fichier `.vtt` exemple est fourni : `ma_video.vtt`

**Format WebVTT :**
```vtt
WEBVTT

00:00:00.000 --> 00:00:03.000
Premier sous-titre ici.

00:00:03.500 --> 00:00:07.000
Deuxième sous-titre ici.
```

**Outils pour créer des sous-titres :**
- **Subtitle Edit** (Windows) - Gratuit et puissant
- **Aegisub** (Mac/Linux/Windows) - Open source
- **YouTube Studio** - Générer auto puis exporter en .vtt
- **Happy Scribe** - Transcription automatique (payant)

### Étape 3 : Nommage cohérent

Utilisez le **même nom** pour la vidéo et les sous-titres :

```
videos/
├── ma_video.mp4        ← Vidéo
└── ma_video.vtt        ← Sous-titres (même nom)
```

Pour d'autres vidéos :
```
videos/
├── ma_video.mp4
├── ma_video.vtt
├── lecon2.mp4
├── lecon2.vtt
├── conversation.mp4
└── conversation.vtt
```

## 🔧 Tester Votre Vidéo

1. Placez `ma_video.mp4` dans le dossier `videos/`
2. Vérifiez que `ma_video.vtt` existe aussi
3. Ouvrez `index.html` dans votre navigateur
4. Cliquez sur la première vidéo de la liste
5. Le lecteur devrait s'ouvrir avec les sous-titres

## ⚠️ Problèmes Courants

### La vidéo ne se charge pas
- ✅ Vérifiez que le fichier s'appelle exactement `ma_video.mp4`
- ✅ Vérifiez le format (MP4 recommandé)
- ✅ Utilisez un serveur local (pas juste double-clic)
  ```bash
  python -m http.server 8000
  ```

### Les sous-titres ne s'affichent pas
- ✅ Vérifiez que le fichier `.vtt` est au bon format
- ✅ Vérifiez l'encodage du fichier (UTF-8 sans BOM)
- ✅ Activez les sous-titres dans le lecteur (bouton CC)

### Erreur CORS
- ✅ Utilisez un serveur local (pas `file://`)
- ✅ Python : `python -m http.server 8000`
- ✅ Node : `npx http-server`

## 📝 Exemple de Fichier .vtt Complet

```vtt
WEBVTT - Titre optionnel

NOTE
Ceci est un commentaire, invisible pour l'utilisateur

00:00:00.000 --> 00:00:04.000
Bonjour et bienvenue !

00:00:04.500 --> 00:00:08.000
Ceci est le deuxième sous-titre.

00:00:08.500 --> 00:00:12.000
<v Narrateur>On peut aussi indiquer qui parle.</v>

00:00:12.500 --> 00:00:16.000
On peut utiliser <b>du gras</b> ou <i>de l'italique</i>.
```

## 🎯 Prochaines Étapes

Une fois que `ma_video.mp4` fonctionne :
1. Ajoutez d'autres vidéos dans ce dossier
2. Créez les fichiers .vtt correspondants
3. Ajoutez les nouvelles vidéos dans `index.html`
4. Le lecteur les reconnaîtra automatiquement

---

**Besoin d'aide ?** Consultez le README principal du projet.
