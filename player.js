/**
 * FranScript - Player Page JavaScript
 *
 * Fonctionnalités :
 * - Chargement de la vidéo depuis les paramètres URL
 * - Sous-titres interactifs cliquables
 * - Aide IA contextuelle
 * - Gestion des commentaires
 * - Signalement de problèmes
 */

// ========================================
// INITIALISATION
// ========================================

let currentSubtitles = [];
let allSubtitles = [];  // Contexte complet pour l'IA
let lastDisplayedCueText = '';  // Éviter de recréer le même sous-titre

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Player initialisé');

    // Charger la vidéo depuis les paramètres URL
    loadVideoFromURL();

    // Initialiser le lecteur vidéo
    initializePlayer();

    // Initialiser les sous-titres interactifs
    initializeSubtitles();

    // Initialiser les commentaires
    loadComments();

    // Initialiser le formulaire de signalement
    initializeReportForm();
});

// ========================================
// CHARGEMENT DE LA VIDÉO
// ========================================

function loadVideoFromURL() {
    const params = new URLSearchParams(window.location.search);
    const videoSrc = params.get('video') || 'videos/ma_video.mp4';
    const subtitleSrc = params.get('subtitle') || 'videos/ma_video.vtt';
    const title = params.get('title') || 'Ma Première Vidéo';
    const level = params.get('level') || 'B2';

    // Charger la vidéo
    const videoElement = document.getElementById('video-player');
    const sourceElement = document.getElementById('video-source');
    const trackElement = document.getElementById('subtitle-track');

    sourceElement.src = videoSrc;
    trackElement.src = subtitleSrc;
    videoElement.load();

    // Mettre à jour les informations
    document.getElementById('video-title').textContent = title;
    document.querySelector('.video-level-badge').textContent = level;
    document.querySelector('.video-level-badge').className = `video-level-badge level-${level.toLowerCase()}`;

    console.log(`📹 Vidéo chargée : ${title} (${level})`);
}

// ========================================
// GESTION DU LECTEUR VIDÉO
// ========================================

function initializePlayer() {
    const video = document.getElementById('video-player');
    const track = document.getElementById('subtitle-track');

    // Écouter les changements de sous-titres
    track.addEventListener('load', function() {
        const textTrack = video.textTracks[0];
        textTrack.mode = 'showing';  // Activer les sous-titres

        // Extraire tous les sous-titres pour le contexte IA
        allSubtitles = [];
        for (let i = 0; i < textTrack.cues.length; i++) {
            const cue = textTrack.cues[i];
            allSubtitles.push({
                start: cue.startTime,
                end: cue.endTime,
                text: cue.text
            });
        }

        console.log(`📝 ${allSubtitles.length} sous-titres chargés`);
    });

    // DEBUG: Détecter les tentatives de seek
    video.addEventListener('seeking', function() {
        console.log('🎯 SEEKING vers:', video.currentTime);
    });

    video.addEventListener('seeked', function() {
        console.log('✅ SEEKED terminé à:', video.currentTime);
    });

    video.addEventListener('click', function(e) {
        console.log('🖱️ CLICK sur vidéo à:', e.clientX, e.clientY);
    });

    // Afficher les sous-titres dans la zone interactive
    video.addEventListener('timeupdate', function() {
        const textTrack = video.textTracks[0];
        if (textTrack && textTrack.activeCues && textTrack.activeCues.length > 0) {
            const currentCue = textTrack.activeCues[0];
            // Ne mettre à jour que si le sous-titre a changé
            if (currentCue.text !== lastDisplayedCueText) {
                lastDisplayedCueText = currentCue.text;
                displayInteractiveSubtitle(currentCue.text, currentCue.startTime, currentCue.endTime);
            }
        } else {
            // Effacer si plus de sous-titre actif
            if (lastDisplayedCueText !== '') {
                lastDisplayedCueText = '';
                document.getElementById('subtitles-display').innerHTML = '';
            }
        }
    });
}

// ========================================
// SOUS-TITRES INTERACTIFS
// ========================================

function initializeSubtitles() {
    const subtitlesDisplay = document.getElementById('subtitles-display');

    // Gérer la sélection de texte dans les sous-titres
    subtitlesDisplay.addEventListener('mouseup', handleSubtitleSelection);
}

function displayInteractiveSubtitle(text, startTime, endTime) {
    const subtitlesDisplay = document.getElementById('subtitles-display');

    // Créer un élément cliquable pour chaque sous-titre
    const subtitleElement = document.createElement('p');
    subtitleElement.className = 'subtitle-item clickable';
    subtitleElement.textContent = text;
    subtitleElement.dataset.start = startTime;
    subtitleElement.dataset.end = endTime;

    // Remplacer le contenu (on garde seulement le sous-titre actuel)
    subtitlesDisplay.innerHTML = '';
    subtitlesDisplay.appendChild(subtitleElement);

    // Ajouter l'écouteur de clic
    subtitleElement.addEventListener('click', function(e) {
        console.log('🖱️ Clic sur sous-titre:', text);
        e.preventDefault();
        requestAIHelp(text, startTime, endTime);
    });

    console.log('✅ Sous-titre affiché:', text.substring(0, 30) + '...');
}

function handleSubtitleSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        console.log('📝 Texte sélectionné:', selectedText);
        // Trouver le contexte temporel du texte sélectionné
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer.parentElement;

        if (container && container.classList.contains('subtitle-item')) {
            const startTime = parseFloat(container.dataset.start);
            const endTime = parseFloat(container.dataset.end);
            requestAIHelp(selectedText, startTime, endTime);
        }
    }
}

// ========================================
// AIDE IA CONTEXTUELLE
// ========================================

const AI_BACKEND_URL = 'http://localhost:3000';

async function requestAIHelp(text, startTime, endTime) {
    console.log('🤖 Demande aide IA pour:', text);

    const aiPanel = document.getElementById('ai-help-panel');
    const selectedTextSpan = document.getElementById('selected-subtitle-text');
    const aiResponse = document.getElementById('ai-response');

    // Afficher le panneau d'aide
    aiPanel.style.display = 'block';
    selectedTextSpan.textContent = text;

    // Construire le contexte complet
    const context = buildContextForAI(startTime, endTime);

    // Afficher le chargement
    aiResponse.innerHTML = '<div class="loading">🤔 Analyse en cours...</div>';

    try {
        const response = await fetch(`${AI_BACKEND_URL}/explain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                context: context
            })
        });

        if (!response.ok) {
            throw new Error('Backend non disponible');
        }

        const data = await response.json();
        displayAIExplanation(text, data.explanation, data.isMock);

    } catch (error) {
        console.error('Erreur IA:', error);
        aiResponse.innerHTML = `
            <div class="ai-error">
                ⚠️ IA non disponible. Assurez-vous que :
                <ul>
                    <li>Le backend est lancé (<code>cd backend && npm start</code>)</li>
                    <li>Ollama est actif (<code>ollama serve</code>)</li>
                    <li>Le modèle est téléchargé (<code>ollama pull llama3.1:8b</code>)</li>
                </ul>
            </div>
        `;
    }

    console.log(`🤖 Aide IA demandée pour : "${text}"`);
}

function displayAIExplanation(originalText, explanation, isMock) {
    const aiResponse = document.getElementById('ai-response');

    aiResponse.innerHTML = `
        <div class="ai-explanation">
            <h4>📖 Explication</h4>
            <p><strong>"${escapeHTML(originalText)}"</strong></p>
            <p class="explanation-text">${escapeHTML(explanation)}</p>
            ${isMock ? '<p class="mock-warning">⚠️ Mode simulation (Ollama non connecté)</p>' : ''}

            <div class="ai-actions">
                <button class="ai-action-btn" onclick="translateExplanation('${escapeHTML(explanation).replace(/'/g, "\\'")}')">
                    🌍 Traduire en anglais
                </button>
            </div>

            <div id="translation-result"></div>
        </div>
    `;
}

async function translateExplanation(explanationText) {
    const translationResult = document.getElementById('translation-result');

    translationResult.innerHTML = '<div class="loading">🔄 Traduction en cours...</div>';

    try {
        const response = await fetch(`${AI_BACKEND_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: explanationText
            })
        });

        if (!response.ok) {
            throw new Error('Traduction échouée');
        }

        const data = await response.json();

        translationResult.innerHTML = `
            <div class="translation-box">
                <h4>🇬🇧 English Translation</h4>
                <p class="translation-text">${escapeHTML(data.translation)}</p>
                ${data.isMock ? '<p class="mock-warning">⚠️ Mode simulation</p>' : ''}
            </div>
        `;

    } catch (error) {
        console.error('Erreur traduction:', error);
        translationResult.innerHTML = '<p class="ai-error">⚠️ Traduction non disponible</p>';
    }
}

function buildContextForAI(currentStart, currentEnd) {
    // Récupérer les sous-titres avant et après (contexte de ±10 secondes)
    const contextWindow = 10; // secondes

    return allSubtitles.filter(sub => {
        return sub.start >= (currentStart - contextWindow) && sub.end <= (currentEnd + contextWindow);
    }).map(sub => sub.text).join(' ');
}

// ========================================
// GESTION DES COMMENTAIRES
// ========================================

function loadComments() {
    // Charger les commentaires depuis localStorage (simulation)
    const videoId = new URLSearchParams(window.location.search).get('video') || 'ma_video';
    const comments = JSON.parse(localStorage.getItem(`comments_${videoId}`) || '[]');

    displayComments(comments);
}

function addComment() {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();

    if (text.length === 0) {
        alert('Veuillez saisir un commentaire.');
        return;
    }

    const comment = {
        id: Date.now(),
        author: 'Utilisateur',  // TODO: Remplacer par vraie authentification
        text: text,
        timestamp: new Date().toISOString(),
        likes: 0
    };

    // Sauvegarder dans localStorage
    const videoId = new URLSearchParams(window.location.search).get('video') || 'ma_video';
    const comments = JSON.parse(localStorage.getItem(`comments_${videoId}`) || '[]');
    comments.unshift(comment);  // Ajouter en premier
    localStorage.setItem(`comments_${videoId}`, JSON.stringify(comments));

    // Réafficher
    displayComments(comments);

    // Réinitialiser le champ
    input.value = '';

    console.log('💬 Commentaire ajouté');
}

function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');

    commentsCount.textContent = comments.length;

    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">Aucun commentaire pour le moment. Soyez le premier à commenter !</p>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item" data-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-author">👤 ${comment.author}</span>
                <span class="comment-time">${formatTime(comment.timestamp)}</span>
            </div>
            <p class="comment-text">${escapeHTML(comment.text)}</p>
            <div class="comment-actions">
                <button class="comment-action-btn" onclick="likeComment(${comment.id})">
                    👍 ${comment.likes}
                </button>
                <button class="comment-action-btn" onclick="deleteComment(${comment.id})">
                    🗑️ Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

function likeComment(commentId) {
    const videoId = new URLSearchParams(window.location.search).get('video') || 'ma_video';
    const comments = JSON.parse(localStorage.getItem(`comments_${videoId}`) || '[]');

    const comment = comments.find(c => c.id === commentId);
    if (comment) {
        comment.likes++;
        localStorage.setItem(`comments_${videoId}`, JSON.stringify(comments));
        displayComments(comments);
    }
}

function deleteComment(commentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

    const videoId = new URLSearchParams(window.location.search).get('video') || 'ma_video';
    let comments = JSON.parse(localStorage.getItem(`comments_${videoId}`) || '[]');

    comments = comments.filter(c => c.id !== commentId);
    localStorage.setItem(`comments_${videoId}`, JSON.stringify(comments));
    displayComments(comments);
}

// ========================================
// SIGNALEMENT DE PROBLÈMES
// ========================================

function reportIssue() {
    document.getElementById('report-modal').style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
}

function initializeReportForm() {
    const form = document.getElementById('report-form');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const type = document.getElementById('report-type').value;
        const description = document.getElementById('report-description').value;

        if (!description.trim()) {
            alert('Veuillez décrire le problème.');
            return;
        }

        // TODO: Envoyer à un backend
        console.log('⚠️ Signalement :', { type, description });

        alert('Merci ! Votre signalement a été envoyé.');
        closeReportModal();
        form.reset();
    });
}

// ========================================
// AUTRES ACTIONS
// ========================================

function downloadSubtitles() {
    const subtitleSrc = new URLSearchParams(window.location.search).get('subtitle') || 'videos/ma_video.vtt';

    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = subtitleSrc;
    link.download = subtitleSrc.split('/').pop();
    link.click();

    console.log('📥 Téléchargement des sous-titres');
}

function shareVideo() {
    const url = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: document.getElementById('video-title').textContent,
            text: 'Regardez cette vidéo sur FranScript',
            url: url
        });
    } else {
        // Copier dans le presse-papier
        navigator.clipboard.writeText(url).then(() => {
            alert('Lien copié dans le presse-papier !');
        });
    }

    console.log('🔗 Partage de la vidéo');
}

// ========================================
// UTILITAIRES
// ========================================

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('🎥 Player ready!');
