#!/bin/bash

echo "🚀 Démarrage de FranScript avec IA locale"
echo ""
echo "Vérifications préalables :"
echo "1. Ollama est installé : https://ollama.ai"
echo "2. Modèle téléchargé : ollama pull llama3.1:8b"
echo "3. Ollama lancé : ollama serve (dans un autre terminal)"
echo ""

# Installer les dépendances si nécessaire
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installation des dépendances..."
    cd backend
    npm install
    cd ..
fi

# Démarrer le backend en arrière-plan
echo "🤖 Démarrage du backend IA..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
sleep 2

# Démarrer le serveur web frontend
echo "🌐 Démarrage du serveur web frontend..."
echo ""
echo "✅ Tout est prêt !"
echo "📍 Ouvrez http://localhost:8000 dans votre navigateur"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"
echo ""

python3 -m http.server 8000

# Arrêter le backend quand le frontend s'arrête
kill $BACKEND_PID
