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
let isEditMode = false;  // Mode édition activé ou non
let editedSubtitles = {};  // Sous-titres modifiés {index: newText}
let currentVideoId = null;  // ID de la vidéo courante
let isAdmin = false;  // Utilisateur admin ou non

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Player initialisé');

    // Vérifier si l'utilisateur est admin
    checkAdminStatus();

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

    // Initialiser le mode édition
    initializeEditMode();
});

// ========================================
// CHARGEMENT DE LA VIDÉO
// ========================================

async function loadVideoFromURL() {
    const params = new URLSearchParams(window.location.search);
    const videoSrc = params.get('video') || 'videos/ma_video.mp4';
    const subtitleSrc = params.get('subtitle') || 'videos/ma_video.vtt';
    const title = params.get('title') || 'Ma Première Vidéo';
    const level = params.get('level') || 'B2';
    currentVideoId = params.get('id') || null;  // Récupérer l'ID de la vidéo

    // Charger la vidéo
    const videoElement = document.getElementById('video-player');
    const sourceElement = document.getElementById('video-source');
    const trackElement = document.getElementById('subtitle-track');

    sourceElement.src = videoSrc;
    trackElement.src = subtitleSrc;
    videoElement.load();

    // Mettre à jour les informations de base
    document.getElementById('video-title').textContent = title;
    document.querySelector('.video-level-badge').textContent = level;
    document.querySelector('.video-level-badge').className = `video-level-badge level-${level.toLowerCase()}`;

    // Si on a un ID, charger les infos complètes depuis la base de données
    if (currentVideoId) {
        await loadVideoMetadata(currentVideoId);
    }

    console.log(`📹 Vidéo chargée : ${title} (${level})`);
}

/**
 * Charge les métadonnées complètes de la vidéo depuis la base de données
 */
async function loadVideoMetadata(videoId) {
    try {
        const response = await fetch(`http://localhost:3000/api/videos/${videoId}`);
        if (response.ok) {
            const data = await response.json();
            const video = data.video;

            // Afficher la description
            if (video.description) {
                document.getElementById('video-description').textContent = video.description;
            }

            // Afficher les tags
            if (video.tags && video.tags.length > 0) {
                const tagsHTML = video.tags.map(tag => {
                    const rgb = hexToRgb(tag.color);
                    return `<span class="video-tag" style="background-color: rgba(${rgb}, 0.2); color: ${tag.color}; border: 2px solid ${tag.color}; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; margin-right: 8px;">${tag.name.toUpperCase()}</span>`;
                }).join('');

                // Ajouter les tags après le niveau
                const metaTags = document.querySelector('.video-meta-tags');
                metaTags.innerHTML += tagsHTML;
            }

            // Afficher la durée
            if (video.duration) {
                const durationFormatted = formatDuration(video.duration);
                const durationHTML = `<span class="video-duration-badge" style="padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; background-color: rgba(255, 255, 255, 0.1); color: var(--color-text-secondary); border: 1px solid rgba(255, 255, 255, 0.2); margin-right: 8px;">⏱️ ${durationFormatted}</span>`;

                const metaTags = document.querySelector('.video-meta-tags');
                metaTags.innerHTML += durationHTML;
            }
        }
    } catch (error) {
        console.error('Erreur chargement métadonnées:', error);
    }
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r}, ${g}, ${b}`;
    }
    return '52, 152, 219'; // Bleu par défaut
}

/**
 * Formate la durée en secondes vers MM:SS
 */
function formatDuration(seconds) {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
            // Effacer si plus de sous-titre actif (SANS effacer le toolbar admin)
            if (lastDisplayedCueText !== '') {
                lastDisplayedCueText = '';
                const subtitlesDisplay = document.getElementById('subtitles-display');
                const oldSubtitles = subtitlesDisplay.querySelectorAll('.subtitle-item, .subtitle-hint');
                oldSubtitles.forEach(el => el.remove());
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

    // Trouver l'index du sous-titre dans allSubtitles
    const index = allSubtitles.findIndex(sub => sub.start === startTime && sub.end === endTime);

    // Créer un élément cliquable pour chaque sous-titre
    const subtitleElement = document.createElement('p');
    subtitleElement.className = 'subtitle-item clickable';
    subtitleElement.textContent = text;
    subtitleElement.dataset.start = startTime;
    subtitleElement.dataset.end = endTime;
    subtitleElement.dataset.index = index;  // Stocker l'index pour l'édition

    // Supprimer uniquement les anciens sous-titres et hints (SANS effacer le toolbar admin)
    const oldSubtitles = subtitlesDisplay.querySelectorAll('.subtitle-item, .subtitle-hint');
    oldSubtitles.forEach(el => el.remove());

    // Ajouter le nouveau sous-titre
    subtitlesDisplay.appendChild(subtitleElement);

    // Gérer le mode édition si admin
    if (isAdmin) {
        updateSubtitleEditability(subtitleElement);
    }

    // Ajouter l'écouteur de clic UNIQUEMENT si pas en mode édition
    if (!isEditMode || !isAdmin) {
        subtitleElement.addEventListener('click', function(e) {
            // Ne pas déclencher en mode édition
            if (isEditMode && isAdmin) return;

            console.log('🖱️ Clic sur sous-titre:', text);
            e.preventDefault();
            requestAIHelp(text, startTime, endTime);
        });
    }

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
                <button class="ai-action-btn" id="translate-btn">
                    🌍 Traduire en anglais
                </button>
            </div>

            <div id="translation-result"></div>
        </div>
    `;

    // Ajouter l'event listener après avoir créé le bouton
    setTimeout(() => {
        const translateBtn = document.getElementById('translate-btn');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => {
                translateExplanation(explanation);
            });
        }
    }, 0);
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
    // Récupérer plus de contexte: ±20 secondes pour mieux comprendre
    const contextWindow = 20;

    const contextSubs = allSubtitles.filter(sub => {
        return sub.start >= (currentStart - contextWindow) && sub.end <= (currentEnd + contextWindow);
    });

    // Formater le contexte avec des marqueurs pour montrer où est la phrase ciblée
    const contextText = contextSubs.map(sub => {
        if (sub.start === currentStart && sub.end === currentEnd) {
            return `>>> ${sub.text} <<<`; // Marquer la phrase ciblée
        }
        return sub.text;
    }).join(' ');

    return contextText || 'Pas de contexte disponible';
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
        showNotification('Veuillez saisir un commentaire.', 'warning');
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
            showNotification('Veuillez décrire le problème.', 'warning');
            return;
        }

        // TODO: Envoyer à un backend
        console.log('⚠️ Signalement :', { type, description });

        showNotification('Merci ! Votre signalement a été envoyé.', 'success');
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
            showNotification('Lien copié dans le presse-papier !', 'success');
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

// ========================================
// ADMIN - ÉDITION DES SOUS-TITRES
// ========================================

/**
 * Vérifier si l'utilisateur est admin
 */
async function checkAdminStatus() {
    try {
        const response = await fetch(`${AI_BACKEND_URL}/auth/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            isAdmin = data.user && data.user.role === 'admin';

            if (isAdmin) {
                console.log('👑 Admin détecté - Mode édition disponible');
                // Afficher la toolbar admin
                document.getElementById('subtitle-admin-toolbar').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Erreur vérification admin:', error);
    }
}

/**
 * Initialiser le mode édition
 */
function initializeEditMode() {
    const toggle = document.getElementById('edit-mode-toggle');
    const saveBtn = document.getElementById('save-subtitles-btn');

    if (!toggle || !saveBtn) return;

    // Écouteur sur le toggle
    toggle.addEventListener('change', function() {
        isEditMode = this.checked;

        if (isEditMode) {
            console.log('✏️ Mode édition activé');
            saveBtn.style.display = 'inline-block';
        } else {
            console.log('👁️ Mode normal activé');
            saveBtn.style.display = 'none';
        }

        // Mettre à jour le sous-titre actuel si présent
        const currentSubtitle = document.querySelector('.subtitle-item');
        if (currentSubtitle) {
            updateSubtitleEditability(currentSubtitle);
        }
    });

    // Écouteur sur le bouton sauvegarder
    saveBtn.addEventListener('click', saveSubtitles);
}

/**
 * Met à jour l'éditabilité d'un sous-titre
 */
function updateSubtitleEditability(subtitleElement) {
    if (isEditMode && isAdmin) {
        subtitleElement.contentEditable = 'true';
        subtitleElement.classList.add('editable');
        subtitleElement.classList.remove('clickable');

        // Retirer l'event listener de clic pour l'IA
        subtitleElement.style.cursor = 'text';

        // Sauvegarder les modifications quand on édite
        subtitleElement.addEventListener('input', function() {
            const index = parseInt(this.dataset.index);
            editedSubtitles[index] = this.textContent.trim();
            console.log(`✏️ Sous-titre ${index} modifié`);
        });
    } else {
        subtitleElement.contentEditable = 'false';
        subtitleElement.classList.remove('editable');
        subtitleElement.classList.add('clickable');
        subtitleElement.style.cursor = 'pointer';
    }
}

/**
 * Sauvegarder les sous-titres modifiés
 */
async function saveSubtitles() {
    if (!currentVideoId) {
        showNotification('Impossible de sauvegarder : ID de vidéo manquant', 'error');
        return;
    }

    if (Object.keys(editedSubtitles).length === 0) {
        showNotification('Aucune modification à sauvegarder', 'info');
        return;
    }

    const saveBtn = document.getElementById('save-subtitles-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Sauvegarde en cours...';

    try {
        // Récupérer les sous-titres complets depuis le backend
        const getResponse = await fetch(`${AI_BACKEND_URL}/admin/subtitles/${currentVideoId}`, {
            credentials: 'include'
        });

        if (!getResponse.ok) {
            throw new Error('Impossible de récupérer les sous-titres');
        }

        const { cues } = await getResponse.json();

        // Appliquer les modifications
        Object.keys(editedSubtitles).forEach(index => {
            if (cues[index]) {
                cues[index].text = editedSubtitles[index];
            }
        });

        // Sauvegarder
        const saveResponse = await fetch(`${AI_BACKEND_URL}/admin/subtitles/${currentVideoId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cues })
        });

        if (!saveResponse.ok) {
            throw new Error('Échec de la sauvegarde');
        }

        const result = await saveResponse.json();

        showNotification('✅ Sous-titres sauvegardés avec succès ! (backup créé)', 'success', 3000);

        // Réinitialiser
        editedSubtitles = {};

        // Recharger la page après 3 secondes pour laisser voir le message
        setTimeout(() => {
            window.location.reload(true);
        }, 3000);

    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification('❌ Erreur lors de la sauvegarde : ' + error.message, 'error', 5000);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Sauvegarder les modifications';
    }
}

console.log('🎥 Player ready!');
