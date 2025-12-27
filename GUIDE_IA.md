# Guide d'utilisation - IA Locale FranScript

## Installation complète

### 1. Installer Ollama

```bash
# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# macOS
brew install ollama

# Windows
# Télécharger depuis https://ollama.ai/download
```

### 2. Télécharger le modèle

```bash
ollama pull llama3.1:8b
```

### 3. Installer les dépendances backend

```bash
cd backend
npm install
```

## Démarrage

### Option 1 : Script automatique (recommandé)

```bash
# Dans un terminal séparé, lancer Ollama
ollama serve

# Puis dans le dossier franscript
./start-ai.sh
```

### Option 2 : Manuel (3 terminaux)

**Terminal 1 - Ollama**
```bash
ollama serve
```

**Terminal 2 - Backend IA**
```bash
cd backend
npm start
```

**Terminal 3 - Frontend**
```bash
python -m http.server 8000
```

Ouvrir `http://localhost:8000` dans le navigateur

## Utilisation

### 1. Sélectionner du texte dans les sous-titres

- Lire une vidéo (ex: "Ma Première Vidéo")
- Sélectionner un mot ou une phrase dans les sous-titres interactifs
- Cliquer sur le texte sélectionné

### 2. Obtenir une explication

L'IA analyse et renvoie :
- Explication claire et concise en français
- Contexte de la vidéo (±10 secondes)

### 3. Traduire en anglais

- Cliquer sur "🌍 Traduire en anglais"
- L'IA traduit **l'explication** (pas le sous-titre brut)

## Architecture

```
Frontend (port 8000)
    ↓
    → Sélection de texte dans sous-titres
    ↓
Backend Node.js (port 3000)
    ↓
    → POST /explain → Explication FR
    → POST /translate → Traduction EN
    ↓
Ollama (port 11434)
    ↓
    → Modèle Llama 3.1 8B
    → Génération de réponse
```

## Endpoints API

### POST /explain

**Request:**
```json
{
  "text": "Bonjour et bienvenue",
  "context": "Bonjour et bienvenue sur FranScript ! Nous allons apprendre..."
}
```

**Response:**
```json
{
  "explanation": "Cette phrase est une formule de politesse...",
  "isMock": false
}
```

### POST /translate

**Request:**
```json
{
  "text": "Cette phrase est une formule de politesse..."
}
```

**Response:**
```json
{
  "translation": "This phrase is a polite greeting...",
  "isMock": false
}
```

## Personnalisation

### Modifier les prompts

**Fichier:** `backend/server.js`

**Prompt Explain (ligne ~40):**
```javascript
const prompt = `Tu es un assistant d'apprentissage du français.
Explique cette phrase de manière claire et concise en français (maximum 3 phrases).

Contexte: ${context}
Phrase à expliquer: "${text}"

Explication:`;
```

**Prompt Translate (ligne ~66):**
```javascript
const prompt = `Translate this French text to clear, natural English.
Only output the translation, no extra text.

French text: "${text}"

English translation:`;
```

### Ajuster la longueur des réponses

**Fichier:** `backend/server.js` ligne ~19

```javascript
options: {
    temperature: 0.7,
    num_predict: 200  // ← Réduire pour réponses plus courtes
}
```

### Changer de modèle

```bash
# Télécharger un autre modèle
ollama pull llama3.1:70b

# Modifier backend/server.js ligne ~10
async function callOllama(prompt, model = 'llama3.1:70b') {
```

## Dépannage

### "Backend non disponible"

**Vérifier :**
1. Backend lancé : `cd backend && npm start`
2. Port 3000 libre : `lsof -i :3000`

### "Ollama error: 404"

**Vérifier :**
1. Ollama lancé : `ollama serve`
2. Modèle téléchargé : `ollama list`

### Réponses lentes

**Causes :**
- Première requête charge le modèle (10-30s)
- CPU trop faible (recommandé : 8+ cores)
- RAM insuffisante (recommandé : 16GB+)

**Solutions :**
- Garder Ollama actif entre les requêtes
- Réduire `num_predict` à 100-150
- Utiliser un modèle plus petit : `llama3.1:7b`

### Mode Mock activé

Si Ollama n'est pas connecté, le backend retourne des réponses mock avec `isMock: true`

## Performance

**Temps de réponse typiques (CPU i7, 16GB RAM) :**
- Première requête : 15-20s (chargement modèle)
- Requêtes suivantes : 2-5s
- Traduction : 3-6s

**Optimisations :**
- Contexte limité à ±10s (au lieu de toute la vidéo)
- Réponses courtes (200 tokens max)
- Pas de streaming (simplicité)

## Sécurité

- ✅ 100% local, aucune donnée envoyée à internet
- ✅ Pas de clé API nécessaire
- ✅ CORS activé pour localhost uniquement
- ✅ Pas de stockage de données utilisateur

## Limitations

- Nécessite Ollama installé localement
- Consomme CPU/RAM pendant l'utilisation
- Qualité des réponses dépend du modèle choisi
- Pas de persistance des conversations
