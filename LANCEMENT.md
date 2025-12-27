# 🎬 FranScript - Guide de Lancement

## ⚠️ Important: Serveur Web

**NE PAS utiliser** `python -m http.server` car il ne supporte pas correctement les Range requests, ce qui empêche la navigation vidéo (seek).

## ✅ Démarrage Correct

### Terminal 1 - Ollama (IA)
```bash
ollama serve
```

### Terminal 2 - Backend Node.js
```bash
cd backend
npm start
```

### Terminal 3 - Frontend
```bash
# Utiliser http-server (npm)
npx http-server -p 8000 --cors

# OU si installé globalement
http-server -p 8000 --cors
```

## 🌐 Accès

Ouvrez votre navigateur: **http://localhost:8000**

## 🔧 Fonctionnalités

- ✅ Navigation vidéo (seek) fonctionnelle
- ✅ Sous-titres interactifs cliquables
- ✅ Aide IA contextuelle (Llama 3.1 8B via Ollama)
- ✅ Filtrage par niveau CECRL (B2, C1, C2)
- ✅ Commentaires persistants (localStorage)

## 📝 Notes

- Les sous-titres s'affichent à la fois sur la vidéo et dans le panneau interactif
- Cliquez sur un sous-titre pour obtenir une explication IA
- La barre de progression vidéo fonctionne normalement grâce à http-server
