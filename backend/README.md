# Backend IA Local - FranScript

Backend Node.js pour assistance IA via Ollama (Llama 3.1 8B)

## Installation

```bash
cd backend
npm install
```

## Démarrage

### 1. Lancer Ollama

```bash
# Terminal 1 - Démarrer Ollama
ollama serve

# Terminal 2 - Télécharger le modèle (une seule fois)
ollama pull llama3.1:8b
```

### 2. Lancer le backend

```bash
# Terminal 3 - Démarrer le serveur
cd backend
npm start
```

Le serveur démarre sur `http://localhost:3000`

### 3. Lancer le frontend

```bash
# Terminal 4 - Serveur web pour le frontend
cd ..
python -m http.server 8000
```

Ouvrir `http://localhost:8000` dans le navigateur

## Endpoints

- `POST /explain` - Explication en français
  - Body: `{ "text": "...", "context": "..." }`
  - Response: `{ "explanation": "...", "isMock": false }`

- `POST /translate` - Traduction anglaise
  - Body: `{ "text": "..." }`
  - Response: `{ "translation": "...", "isMock": false }`

- `GET /health` - Health check
  - Response: `{ "status": "ok", "port": 3000 }`

## Mode Mock

Si Ollama n'est pas disponible, le backend retourne des réponses mock avec `isMock: true`

## Dépannage

**Erreur "fetch failed"**
- Vérifier qu'Ollama est lancé (`ollama serve`)
- Vérifier que le port 11434 est accessible

**Réponses lentes**
- Première requête peut être lente (chargement du modèle)
- Réduire `num_predict` dans `server.js` pour des réponses plus courtes
