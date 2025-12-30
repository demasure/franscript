# PLAN DE REFONTE COMPLÈTE

## 1. Interface Admin - Nouvelle Architecture

### Changements:
- ✅ Sélection de ligne (click + highlight)
- ✅ Boutons en haut (Nouveau Dossier, Nouvelle Vidéo, Modifier, Supprimer)
- ✅ Boutons activés/désactivés selon sélection
- ✅ Suppression de TOUS les onclick inline
- ✅ Event listeners propres

### Avant:
```html
<button onclick="editNode(123)">Modifier</button>
```

### Après:
```javascript
// Sélection
let selectedNodeId = null;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-edit').addEventListener('click', editSelectedNode);
});

// Click sur ligne
row.addEventListener('click', () => {
    selectRow(node.id);
});
```

## 2. Nettoyage Code

### player.js - Supprimer hardcodés:
- ❌ `videos/ma_video.mp4` (ligne 118)
- ❌ `videos/ma_video.vtt` (ligne 119)
- ❌ `https://via.placeholder.com` (ligne 1160)

### script.js - Supprimer TODOs inutiles:
- ❌ TODO lignes 792, 797, 802, 812, 817, 822, 830, 835, 845, 850, 868, 882

### browse.html + script.js:
- ✅ Vérifier cover_image partout
- ✅ Pas de placeholders hardcodés
- ✅ Gestion cohérente des images vides

## 3. Cohérence Images

### SOURCE UNIQUE: cover_image
- Pour vidéos ET dossiers
- Même logique que video_url, subtitle_url
- Si vide: afficher image par défaut CSS (pas hardcodé)

### Gestion uniforme:
```javascript
// Si pas d'image: div vide avec background CSS
const imageHTML = node.cover_image
    ? `<img src="${node.cover_image}" alt="${node.title}">`
    : `<div class="no-image-placeholder"><span>${icon}</span></div>`;
```

## 4. Validation

- [ ] Tester sélection lignes
- [ ] Tester boutons contextuels
- [ ] Tester ajout/modification/suppression
- [ ] Tester affichage images
- [ ] Vérifier pas de console errors
- [ ] Vérifier pas de hardcodés restants

## 5. Commit

Message:
```
Refactor: Interface admin moderne + nettoyage complet

INTERFACE ADMIN:
- Sélection de lignes avec highlight
- Boutons en haut (contextuels)
- Suppression onclick inline
- Event listeners propres

NETTOYAGE:
- Suppression hardcodés (player.js, admin.html)
- Suppression TODOs inutiles (script.js)
- Suppression placeholders via.placeholder.com

COHÉRENCE:
- cover_image source unique pour TOUTES images
- Gestion uniforme vidéos/dossiers
- CSS pour images manquantes (pas hardcodé)
```

---

Étant donné la taille de cette refonte, je propose de procéder fichier par fichier.
Voulez-vous que je commence maintenant?
