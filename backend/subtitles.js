const express = require('express');
const fs = require('fs');
const path = require('path');
const { getVideoById } = require('./database');

const router = express.Router();

/**
 * Parse un fichier WebVTT en structure utilisable
 * @param {string} vttContent - Contenu du fichier .vtt
 * @returns {Array} Liste des cues [{index, start, end, text}]
 */
function parseWebVTT(vttContent) {
    const lines = vttContent.split('\n');
    const cues = [];
    let currentCue = null;
    let inCue = false;
    let inNote = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Ignorer les lignes vides
        if (!line) {
            // Ligne vide = fin du cue ou fin de NOTE
            if (inCue && currentCue) {
                cues.push(currentCue);
                currentCue = null;
                inCue = false;
            }
            inNote = false;
            continue;
        }

        // Ignorer l'entête WEBVTT (peut contenir du texte après)
        if (line.startsWith('WEBVTT')) continue;

        // Ignorer les blocs NOTE
        if (line === 'NOTE' || line.startsWith('NOTE ')) {
            inNote = true;
            continue;
        }

        // Si on est dans un bloc NOTE, ignorer la ligne
        if (inNote) continue;

        // Détecter un timestamp (format: 00:00:00.000 --> 00:00:05.000)
        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map(t => t.trim());
            currentCue = {
                index: cues.length,
                start,
                end,
                text: ''
            };
            inCue = true;
        }
        // Si on est dans un cue, c'est du texte
        else if (inCue && line) {
            if (currentCue.text) {
                currentCue.text += '\n' + line;
            } else {
                currentCue.text = line;
            }
        }
    }

    // Ajouter le dernier cue si présent
    if (currentCue) {
        cues.push(currentCue);
    }

    return cues;
}

/**
 * Convertit des cues en format WebVTT
 * @param {Array} cues - Liste des cues [{index, start, end, text}]
 * @returns {string} Contenu WebVTT formaté
 */
function cuesToWebVTT(cues) {
    let vtt = 'WEBVTT\n\n';

    cues.forEach(cue => {
        vtt += `${cue.start} --> ${cue.end}\n`;
        vtt += `${cue.text}\n\n`;
    });

    return vtt;
}

/**
 * GET /admin/subtitles/:videoId
 * Récupère les sous-titres d'une vidéo parsés
 */
router.get('/:videoId', (req, res) => {
    try {
        const videoId = parseInt(req.params.videoId);
        const video = getVideoById(videoId);

        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }

        if (!video.subtitle_url) {
            return res.status(404).json({ error: 'Cette vidéo n\'a pas de sous-titres' });
        }

        // Construire le chemin absolu vers le fichier .vtt
        const subtitlePath = path.join(__dirname, '..', video.subtitle_url);

        if (!fs.existsSync(subtitlePath)) {
            return res.status(404).json({ error: 'Fichier de sous-titres introuvable' });
        }

        // Lire et parser le fichier
        const vttContent = fs.readFileSync(subtitlePath, 'utf-8');
        const cues = parseWebVTT(vttContent);

        res.json({
            videoId,
            subtitlePath: video.subtitle_url,
            cues
        });

    } catch (error) {
        console.error('Erreur lecture sous-titres:', error);
        res.status(500).json({ error: 'Erreur lors de la lecture des sous-titres' });
    }
});

/**
 * PUT /admin/subtitles/:videoId
 * Sauvegarde les modifications des sous-titres
 *
 * Body: { cues: [{index, start, end, text}] }
 */
router.put('/:videoId', (req, res) => {
    try {
        const videoId = parseInt(req.params.videoId);
        const { cues } = req.body;

        if (!cues || !Array.isArray(cues)) {
            return res.status(400).json({ error: 'Données invalides' });
        }

        const video = getVideoById(videoId);

        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }

        if (!video.subtitle_url) {
            return res.status(404).json({ error: 'Cette vidéo n\'a pas de sous-titres' });
        }

        const subtitlePath = path.join(__dirname, '..', video.subtitle_url);

        if (!fs.existsSync(subtitlePath)) {
            return res.status(404).json({ error: 'Fichier de sous-titres introuvable' });
        }

        // Créer un backup du fichier original
        const backupPath = subtitlePath + '.backup';
        fs.copyFileSync(subtitlePath, backupPath);

        // Convertir les cues en WebVTT et sauvegarder
        const newVttContent = cuesToWebVTT(cues);
        fs.writeFileSync(subtitlePath, newVttContent, 'utf-8');

        res.json({
            message: 'Sous-titres sauvegardés avec succès',
            backupPath: backupPath
        });

    } catch (error) {
        console.error('Erreur sauvegarde sous-titres:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des sous-titres' });
    }
});

module.exports = router;
