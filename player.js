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
let currentSubtitleIndex = -1;  // Index du sous-titre actuellement affiché
let isEditMode = false;  // Mode édition activé ou non
let editedSubtitles = {};  // Sous-titres modifiés {index: newText}
let currentVideoId = null;  // ID de la vidéo courante
let isAdmin = false;  // Utilisateur admin ou non
let isDeleteMode = false;  // Mode suppression commentaires (admin uniquement)
let userNotes = [];  // Notes personnelles de l'utilisateur pour cette vidéo
let isNotesCompactMode = true;  // Mode compact (défaut) : affiche notes dans fenêtre temporelle
let lastNotesRefreshTime = -1;  // Dernier temps où les notes ont été rafraîchies (pour throttle)
let isAiHelpCollapsed = false;  // État collapse du panneau Aide IA
let isNotesCollapsed = false;  // État collapse du panneau Notes
const NOTE_TIME_WINDOW = 10;  // Fenêtre temporelle pour affichage des notes (en secondes)

/**
 * Vérifie si une note doit être affichée selon le temps actuel de la vidéo
 * Une note est affichée si: currentTime >= note.timestamp AND currentTime <= note.timestamp + windowSize
 * @param {Object} note - Note avec propriété start_time
 * @param {number} currentTime - Temps actuel de la vidéo en secondes
 * @param {number} windowSize - Taille de la fenêtre temporelle en secondes (défaut: NOTE_TIME_WINDOW)
 * @returns {boolean} true si la note doit être affichée
 */
function isNoteInTimeWindow(note, currentTime, windowSize = NOTE_TIME_WINDOW) {
    return currentTime >= note.start_time && currentTime <= (note.start_time + windowSize);
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎬 Player initialisé');

    // Charger la vidéo depuis les paramètres URL (DOIT être fait en premier)
    await loadVideoFromURL();

    // Vérifier si l'utilisateur est admin
    checkAdminStatus();

    // IMPORTANT: Initialiser auth et charger données AVANT d'afficher les sous-titres
    await initComments();
    await initNotes();

    // Initialiser les boutons collapse des panneaux latéraux
    initializeCollapseButtons();

    // Initialiser le lecteur vidéo (lance l'affichage des sous-titres)
    initializePlayer();

    // Initialiser les sous-titres interactifs
    initializeSubtitles();

    // Initialiser le formulaire de signalement
    initializeReportForm();

    // Initialiser le mode édition
    initializeEditMode();

    // Initialiser le mode suppression commentaires (admin)
    initializeDeleteMode();

    // Vidéos suggérées désactivées (bandeau supprimé)
    // loadSuggestedVideos();
});

// ========================================
// CHARGEMENT DE LA VIDÉO
// ========================================

async function loadVideoFromURL() {
    const params = new URLSearchParams(window.location.search);
    currentVideoId = params.get('id') || null;

    console.log('🎬 Chargement vidéo - ID:', currentVideoId);

    let videoData = null;

    // Si un ID est fourni, charger les données depuis l'API
    if (currentVideoId) {
        try {
            const response = await fetch(`http://localhost:3000/api/content/${currentVideoId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('❌ Erreur chargement vidéo:', response.status);
                return;
            }

            const data = await response.json();

            // Vérifier l'accès
            if (data.access && !data.access.allowed) {
                console.log('🔒 Accès refusé à la vidéo');
                blockVideoAccess();
                return;
            }

            videoData = data.node;
            console.log('✅ Vidéo chargée:', videoData.title, '| video_url:', videoData.video_url);

        } catch (error) {
            console.error('❌ Erreur fetch vidéo:', error);
            return;
        }
    }

    // Déterminer les sources à utiliser
    const videoSrc = videoData?.video_url || params.get('video');
    const subtitleSrc = videoData?.subtitle_url || params.get('subtitle');
    const title = videoData?.title || params.get('title') || 'Vidéo sans titre';

    // Vérification critique: une vidéo DOIT avoir une URL
    if (!videoSrc) {
        console.error('❌ Aucune source vidéo disponible');
        alert('Erreur: Cette vidéo n\'a pas de source vidéo définie. Veuillez contacter un administrateur.');
        return;
    }

    console.log('📹 Sources - Video:', videoSrc, '| Subtitle:', subtitleSrc);

    // Mettre à jour le titre dans le header
    document.getElementById('video-title').textContent = title;

    // Charger la vidéo
    const videoElement = document.getElementById('video-player');
    const sourceElement = document.getElementById('video-source');
    const trackElement = document.getElementById('subtitle-track');

    sourceElement.src = videoSrc;
    trackElement.src = subtitleSrc;
    videoElement.load();

    console.log(`📹 Vidéo chargée : ${title}`);
}

/**
 * Vérifie si l'utilisateur connecté a un compte premium
 */
async function checkPremiumAccess() {
    try {
        const response = await fetch('http://localhost:3000/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        // Les admins ont accès à tout, ou les utilisateurs premium
        return data.user && (data.user.role === 'admin' || data.user.is_premium === 1);
    } catch (error) {
        console.error('Erreur vérification premium:', error);
        return false;
    }
}

/**
 * Bloque l'accès à la vidéo et affiche un message pour les vidéos premium
 */
function blockVideoAccess() {
    const videoContainer = document.querySelector('.video-player-container');

    // Masquer le lecteur vidéo
    const videoPlayer = document.getElementById('video-player');
    videoPlayer.style.display = 'none';

    // Créer et afficher le message de blocage
    const blockedMessage = document.createElement('div');
    blockedMessage.className = 'premium-video-blocked';
    blockedMessage.innerHTML = `
        <div class="blocked-content">
            <div class="blocked-icon">👑</div>
            <h2 class="blocked-title">Vidéo Premium</h2>
            <p class="blocked-text">
                Cette vidéo est réservée aux membres premium.<br>
                Passez à un compte premium pour accéder à l'intégralité du contenu.
            </p>
            <div class="blocked-actions">
                <a href="index.html" class="btn-secondary">← Retour aux vidéos</a>
            </div>
        </div>
    `;

    videoContainer.appendChild(blockedMessage);

    console.log('🔒 Accès à la vidéo premium bloqué');
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

    // Fonction pour charger les sous-titres depuis le textTrack
    function loadSubtitlesFromTrack() {
        const textTrack = video.textTracks[0];
        if (!textTrack) {
            console.log('⚠️ Aucun textTrack trouvé');
            return false;
        }

        textTrack.mode = 'showing';  // Activer les sous-titres

        // Vérifier si les cues sont disponibles
        if (!textTrack.cues || textTrack.cues.length === 0) {
            console.log('⚠️ Cues pas encore disponibles');
            return false;
        }

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
        return true;
    }

    // Tentative 1: Event 'load' sur le track (peut ne pas se déclencher)
    track.addEventListener('load', function() {
        console.log('✅ Event load du track détecté');
        loadSubtitlesFromTrack();
    });

    // Tentative 2: Event 'loadedmetadata' sur la vidéo
    video.addEventListener('loadedmetadata', function() {
        console.log('✅ Event loadedmetadata de la vidéo détecté');

        // Attendre un peu que le track soit prêt
        setTimeout(() => {
            if (allSubtitles.length === 0) {
                console.log('🔄 Tentative de chargement des sous-titres après loadedmetadata');
                loadSubtitlesFromTrack();
            }
        }, 100);
    });

    // Tentative 3: Event 'loadeddata' sur la vidéo (backup)
    video.addEventListener('loadeddata', function() {
        console.log('✅ Event loadeddata de la vidéo détecté');

        if (allSubtitles.length === 0) {
            setTimeout(() => {
                console.log('🔄 Tentative de chargement des sous-titres après loadeddata');
                loadSubtitlesFromTrack();
            }, 200);
        }
    });

    // Tentative 4: Vérifier périodiquement si les cues sont disponibles (fallback)
    let checkAttempts = 0;
    const checkInterval = setInterval(() => {
        checkAttempts++;

        if (allSubtitles.length > 0) {
            console.log('✅ Sous-titres déjà chargés, arrêt du polling');
            clearInterval(checkInterval);
            return;
        }

        if (checkAttempts > 20) { // Arrêter après 10 secondes (20 * 500ms)
            console.log('⚠️ Abandon du chargement des sous-titres après 10 secondes');
            clearInterval(checkInterval);
            return;
        }

        console.log(`🔄 Tentative ${checkAttempts}/20 de chargement des sous-titres...`);
        if (loadSubtitlesFromTrack()) {
            clearInterval(checkInterval);
        }
    }, 500);

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

    // Initialiser la navigation entre sous-titres
    initializeSubtitleNavigation();
}

function displayInteractiveSubtitle(text, startTime, endTime) {
    const subtitlesDisplay = document.getElementById('subtitles-display');

    // Trouver l'index du sous-titre dans allSubtitles
    const index = allSubtitles.findIndex(sub => sub.start === startTime && sub.end === endTime);

    // Mettre à jour l'index du sous-titre actuel
    currentSubtitleIndex = index;

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

    // Mettre à jour les boutons de navigation
    updateNavigationButtons();

    console.log('✅ Sous-titre affiché:', text.substring(0, 30) + '...');
}

// ========================================
// NAVIGATION ENTRE SOUS-TITRES
// ========================================

/**
 * Met à jour l'état des boutons de navigation (activé/désactivé)
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-subtitle-btn');
    const nextBtn = document.getElementById('next-subtitle-btn');

    if (!prevBtn || !nextBtn) return;

    // Si pas de sous-titres chargés, ne rien faire (laisser les boutons actifs)
    if (allSubtitles.length === 0) {
        console.log('⚠️ allSubtitles vide - boutons laissés en état actuel');
        return;
    }

    // Désactiver bouton précédent si on est au premier sous-titre OU avant
    prevBtn.disabled = currentSubtitleIndex <= 0;

    // Désactiver bouton suivant si on est au dernier sous-titre OU après
    nextBtn.disabled = currentSubtitleIndex >= allSubtitles.length - 1 || currentSubtitleIndex < 0;

    console.log(`🔘 Boutons mis à jour: PREV=${!prevBtn.disabled ? 'ACTIF' : 'DÉSACTIVÉ'}, NEXT=${!nextBtn.disabled ? 'ACTIF' : 'DÉSACTIVÉ'} (index: ${currentSubtitleIndex}/${allSubtitles.length - 1})`);
}

/**
 * Navigue au sous-titre précédent
 */
function goToPreviousSubtitle() {
    const video = document.getElementById('video-player');

    console.log('🖱️ CLIC BOUTON PRÉCÉDENT - currentIndex:', currentSubtitleIndex, 'total:', allSubtitles.length);

    if (!video) {
        console.log('❌ Élément vidéo non trouvé');
        return;
    }

    if (allSubtitles.length === 0) {
        console.log('❌ Sous-titres pas encore chargés');
        return;
    }

    if (currentSubtitleIndex <= 0) {
        console.log('❌ Impossible d\'aller au précédent (déjà au début)');
        return;
    }

    const prevSubtitle = allSubtitles[currentSubtitleIndex - 1];
    if (prevSubtitle) {
        console.log('⏮️ Navigation vers sous-titre', currentSubtitleIndex - 1, ':', prevSubtitle.text.substring(0, 30) + '...');
        console.log('⏮️ Déplacement vidéo vers', prevSubtitle.start, 's');
        video.currentTime = prevSubtitle.start;
    }
}

/**
 * Navigue au sous-titre suivant
 */
function goToNextSubtitle() {
    const video = document.getElementById('video-player');

    console.log('🖱️ CLIC BOUTON SUIVANT - currentIndex:', currentSubtitleIndex, 'total:', allSubtitles.length);

    if (!video) {
        console.log('❌ Élément vidéo non trouvé');
        return;
    }

    if (allSubtitles.length === 0) {
        console.log('❌ Sous-titres pas encore chargés');
        return;
    }

    if (currentSubtitleIndex >= allSubtitles.length - 1) {
        console.log('❌ Impossible d\'aller au suivant (déjà à la fin)');
        return;
    }

    const nextSubtitle = allSubtitles[currentSubtitleIndex + 1];
    if (nextSubtitle) {
        console.log('⏭️ Navigation vers sous-titre', currentSubtitleIndex + 1, ':', nextSubtitle.text.substring(0, 30) + '...');
        console.log('⏭️ Déplacement vidéo vers', nextSubtitle.start, 's');
        video.currentTime = nextSubtitle.start;
    }
}

/**
 * Initialise les event listeners pour la navigation
 */
function initializeSubtitleNavigation() {
    const prevBtn = document.getElementById('prev-subtitle-btn');
    const nextBtn = document.getElementById('next-subtitle-btn');

    console.log('🔧 Initialisation navigation - Boutons trouvés:', {
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn
    });

    if (prevBtn && nextBtn) {
        // NE PAS appeler updateNavigationButtons() ici car allSubtitles est encore vide
        // Les boutons seront mis à jour automatiquement par displayInteractiveSubtitle()

        prevBtn.addEventListener('click', (e) => {
            console.log('🎯 CLICK bouton PRÉCÉDENT détecté!');
            if (!prevBtn.disabled) {
                goToPreviousSubtitle();
            } else {
                console.log('❌ Bouton précédent désactivé');
            }
        });

        nextBtn.addEventListener('click', (e) => {
            console.log('🎯 CLICK bouton SUIVANT détecté!');
            if (!nextBtn.disabled) {
                goToNextSubtitle();
            } else {
                console.log('❌ Bouton suivant désactivé');
            }
        });

        // Raccourcis clavier: flèches gauche/droite
        document.addEventListener('keydown', (e) => {
            // Ignorer si on est dans un input ou textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPreviousSubtitle();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextSubtitle();
            }
        });

        console.log('✅ Event listeners attachés - Les boutons seront activés au 1er sous-titre');
    } else {
        console.error('❌ Boutons de navigation non trouvés!');
    }
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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const type = document.getElementById('report-type').value;
        const description = document.getElementById('report-description').value.trim();

        // Validation
        if (!description) {
            showNotification('Veuillez décrire le problème.', 'warning');
            return;
        }

        // Limite de 300 caractères
        if (description.length > 300) {
            showNotification('Le message ne peut pas dépasser 300 caractères.', 'warning');
            return;
        }

        if (!currentVideoId) {
            showNotification('Erreur : ID vidéo manquant.', 'error');
            return;
        }

        // Construire le message avec le type
        const fullMessage = `[${type}] ${description}`;

        try {
            const response = await fetch('http://localhost:3000/reports', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    video_id: currentVideoId,
                    message: fullMessage
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'envoi');
            }

            showNotification('✅ Merci ! Votre signalement a été envoyé.', 'success');
            closeReportModal();
            form.reset();

        } catch (error) {
            console.error('Erreur envoi signalement:', error);
            showNotification('Erreur lors de l\'envoi du signalement.', 'error');
        }
    });
}

// ========================================
// AUTRES ACTIONS
// ========================================

function downloadSubtitles() {
    const subtitleSrc = new URLSearchParams(window.location.search).get('subtitle');

    if (!subtitleSrc) {
        showNotification('Aucun sous-titre disponible pour cette vidéo.', 'warning');
        return;
    }

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
                console.log('👑 Admin détecté - Bandeau admin activé');
                // Afficher le bandeau admin
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) {
                    adminPanel.style.display = 'block';
                }
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
    const saveContainer = document.getElementById('save-subtitles-container');
    const saveBtn = document.getElementById('save-subtitles-btn');

    if (!toggle || !saveContainer || !saveBtn) return;

    // Écouteur sur le toggle
    toggle.addEventListener('change', function() {
        isEditMode = this.checked;

        if (isEditMode) {
            console.log('✏️ Mode édition activé');
            saveContainer.style.display = 'block';
        } else {
            console.log('👁️ Mode normal activé');
            saveContainer.style.display = 'none';
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
 * Initialiser le mode suppression des commentaires (admin uniquement)
 */
function initializeDeleteMode() {
    const toggle = document.getElementById('delete-comments-toggle');

    if (!toggle) return;

    // Écouteur sur le toggle
    toggle.addEventListener('change', function() {
        isDeleteMode = this.checked;

        if (isDeleteMode) {
            console.log('🗑️ Mode suppression commentaires activé');
        } else {
            console.log('👁️ Mode suppression commentaires désactivé');
        }

        // Rafraîchir l'affichage des commentaires pour afficher/masquer les boutons de suppression
        loadComments();
    });
}

/**
 * Handler pour l'édition de sous-titre (stocké pour pouvoir remove l'event listener)
 */
function handleSubtitleInput(event) {
    const index = parseInt(event.target.dataset.index);
    const newText = event.target.textContent.trim();
    editedSubtitles[index] = newText;
    console.log(`✏️ Sous-titre ${index} modifié:`, newText);
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

        // Retirer l'ancien event listener s'il existe et ajouter le nouveau
        subtitleElement.removeEventListener('input', handleSubtitleInput);
        subtitleElement.addEventListener('input', handleSubtitleInput);
    } else {
        subtitleElement.contentEditable = 'false';
        subtitleElement.classList.remove('editable');
        subtitleElement.classList.add('clickable');
        subtitleElement.style.cursor = 'pointer';

        // Retirer l'event listener d'édition
        subtitleElement.removeEventListener('input', handleSubtitleInput);
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

    console.log('💾 Tentative de sauvegarde des sous-titres');
    console.log('   currentVideoId:', currentVideoId);
    console.log('   editedSubtitles:', editedSubtitles);
    console.log('   Nombre de modifications:', Object.keys(editedSubtitles).length);

    if (Object.keys(editedSubtitles).length === 0) {
        showNotification('Aucune modification à sauvegarder', 'info');
        return;
    }

    const saveBtn = document.getElementById('save-subtitles-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Sauvegarde en cours...';

    try {
        // Récupérer les sous-titres complets depuis le backend
        console.log('📥 Récupération des sous-titres depuis le backend...');
        const getResponse = await fetch(`${AI_BACKEND_URL}/admin/subtitles/${currentVideoId}`, {
            credentials: 'include'
        });

        if (!getResponse.ok) {
            throw new Error('Impossible de récupérer les sous-titres');
        }

        const { cues } = await getResponse.json();
        console.log('✅ Sous-titres récupérés:', cues.length, 'cues');

        // Appliquer les modifications
        console.log('🔧 Application des modifications...');
        Object.keys(editedSubtitles).forEach(index => {
            const idx = parseInt(index);
            if (cues[idx]) {
                const oldText = cues[idx].text;
                const newText = editedSubtitles[index];
                cues[idx].text = newText;
                console.log(`   [${idx}] "${oldText}" → "${newText}"`);
            } else {
                console.warn(`   ⚠️ Index ${idx} introuvable dans les cues`);
            }
        });

        // Sauvegarder
        console.log('📤 Envoi des sous-titres modifiés au backend...');
        const saveResponse = await fetch(`${AI_BACKEND_URL}/admin/subtitles/${currentVideoId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cues })
        });

        if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error('❌ Échec sauvegarde:', errorText);
            throw new Error('Échec de la sauvegarde');
        }

        const result = await saveResponse.json();
        console.log('✅ Sauvegarde réussie:', result);

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

// ========================================
// VIDÉOS SUGGÉRÉES
// ========================================

/**
 * Charge les vidéos suggérées (même niveau ou tags similaires)
 */
async function loadSuggestedVideos() {
    try {
        const response = await fetch('http://localhost:3000/videos');
        const videos = await response.json();

        // Obtenir le niveau de la vidéo courante
        const params = new URLSearchParams(window.location.search);
        const currentLevel = params.get('level') || 'B2';
        const currentId = parseInt(params.get('id')) || null;

        // Filtrer : même niveau, exclure vidéo courante
        let suggestedVideos = videos.filter(v =>
            v.level === currentLevel && v.id !== currentId
        );

        // Si pas assez de suggestions, prendre toutes les vidéos sauf la courante
        if (suggestedVideos.length < 3) {
            suggestedVideos = videos.filter(v => v.id !== currentId);
        }

        // Limiter à 5 suggestions
        suggestedVideos = suggestedVideos.slice(0, 5);

        // Afficher les suggestions
        const suggestionsList = document.getElementById('suggestions-list');
        suggestionsList.innerHTML = '';

        if (suggestedVideos.length === 0) {
            suggestionsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Aucune vidéo suggérée</p>';
            return;
        }

        suggestedVideos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.style.cursor = 'pointer';
            card.onclick = () => {
                window.location.href = `player.html?id=${video.id}&video=${encodeURIComponent(video.video_url)}&subtitle=${encodeURIComponent(video.subtitle_url || '')}&title=${encodeURIComponent(video.title)}&level=${video.level}`;
            };

            // SOURCE UNIQUE: cover_url pour TOUTES les images
            const thumbnailSrc = video.cover_url || '';

            card.innerHTML = `
                <img src="${thumbnailSrc}" alt="${video.title}">
                <div class="suggestion-info">
                    <h4>${video.title}</h4>
                    <span class="level-badge level-${video.level.toLowerCase()}">${video.level}</span>
                </div>
            `;

            suggestionsList.appendChild(card);
        });

    } catch (error) {
        console.error('Erreur chargement suggestions:', error);
    }
}

/**
 * Obtient une couleur en fonction du niveau CECRL
 */
function getLevelColor(level) {
    const colors = {
        'B2': '2ecc71',
        'C1': 'f39c12',
        'C2': 'e74c3c'
    };
    return colors[level] || '3498db';
}

// ========================================
// COMMENTAIRES
// ========================================

let currentUser = null; // Stocke les infos de l'utilisateur connecté

/**
 * Vérifie si l'utilisateur est connecté et stocke ses infos
 */
async function checkUserAuth() {
    try {
        const response = await fetch('http://localhost:3000/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur vérification auth:', error);
        return false;
    }
}

/**
 * Charge et affiche les commentaires
 */
async function loadComments() {
    if (!currentVideoId) return;

    try {
        const response = await fetch(`http://localhost:3000/comments/${currentVideoId}`, {
            credentials: 'include'
        });

        const comments = await response.json();
        displayComments(comments);
    } catch (error) {
        console.error('Erreur chargement commentaires:', error);
    }
}

/**
 * Affiche la liste des commentaires
 */
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');

    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">Aucun commentaire pour le moment. Soyez le premier à commenter!</p>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => {
        const date = new Date(comment.created_at);
        const formattedDate = formatCommentDate(date);
        const isOwner = currentUser && currentUser.id === comment.user_id;
        const canDelete = isOwner || (isAdmin && isDeleteMode);

        return `
            <div class="comment-card">
                <div class="comment-header">
                    <img src="${comment.profile_picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" alt="${comment.username}" class="comment-avatar">
                    <div class="comment-user-info">
                        <div class="comment-username">${comment.username || comment.email}</div>
                        <div class="comment-date">${formattedDate}</div>
                    </div>
                </div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
                <div class="comment-actions">
                    ${currentUser ? `
                        <button
                            class="comment-like-btn ${comment.liked_by_user ? 'liked' : ''}"
                            onclick="toggleLike(${comment.id})"
                            data-comment-id="${comment.id}">
                            👍 <span class="like-count">${comment.like_count || 0}</span>
                        </button>
                    ` : `
                        <span class="comment-likes">👍 ${comment.like_count || 0}</span>
                    `}
                    ${canDelete ? `
                        <button class="comment-delete-btn" onclick="deleteComment(${comment.id})">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Formate la date du commentaire de manière lisible
 */
function formatCommentDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (days > 0) {
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return 'À l\'instant';
    }
}

/**
 * Échappe le HTML pour éviter les injections XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Poste un nouveau commentaire
 */
async function postComment() {
    const textarea = document.getElementById('comment-text');
    const text = textarea.value.trim();

    if (!text) {
        showNotification('Le commentaire ne peut pas être vide', 'warning');
        return;
    }

    if (!currentVideoId) {
        showNotification('Erreur: ID de vidéo manquant', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                video_id: currentVideoId,
                text: text
            })
        });

        if (response.ok) {
            textarea.value = '';
            updateCharCounter();
            showNotification('Commentaire publié!', 'success');
            loadComments(); // Recharger les commentaires
        } else {
            const data = await response.json();
            showNotification(data.error || 'Erreur lors de la publication', 'error');
        }
    } catch (error) {
        console.error('Erreur post commentaire:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Toggle like/unlike sur un commentaire
 */
async function toggleLike(commentId) {
    try {
        const response = await fetch(`http://localhost:3000/comments/${commentId}/like`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            loadComments(); // Recharger pour mettre à jour les compteurs
        } else {
            showNotification('Erreur lors du like', 'error');
        }
    } catch (error) {
        console.error('Erreur toggle like:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Supprime un commentaire
 */
async function deleteComment(commentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/comments/${commentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Commentaire supprimé', 'success');
            loadComments();
        } else {
            showNotification('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression commentaire:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Met à jour le compteur de caractères
 */
function updateCharCounter() {
    const textarea = document.getElementById('comment-text');
    const counter = document.getElementById('char-counter');
    if (textarea && counter) {
        counter.textContent = `${textarea.value.length}/1000`;
    }
}

/**
 * Initialise la section commentaires
 */
async function initComments() {
    const isAuth = await checkUserAuth();

    const commentForm = document.getElementById('comment-form-container');
    const loginPrompt = document.getElementById('login-prompt');

    if (isAuth && currentUser) {
        // Utilisateur connecté: afficher le formulaire
        commentForm.style.display = 'block';
        loginPrompt.style.display = 'none';

        // Événement submit
        const postBtn = document.getElementById('post-comment-btn');
        postBtn.addEventListener('click', postComment);

        // Événement compteur de caractères
        const textarea = document.getElementById('comment-text');
        textarea.addEventListener('input', updateCharCounter);

        // Entrée pour poster avec Ctrl+Enter
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                postComment();
            }
        });
    } else {
        // Utilisateur non connecté: afficher le message
        commentForm.style.display = 'none';
        loginPrompt.style.display = 'block';
    }

    // Charger les commentaires dans tous les cas
    await loadComments();
}

// ========================================
// NOTES PERSONNELLES SUR SOUS-TITRES
// ========================================

/**
 * Charge les notes de l'utilisateur pour cette vidéo
 */
async function loadUserNotes() {
    if (!currentVideoId || !currentUser) return;

    try {
        const response = await fetch(`http://localhost:3000/notes/${currentVideoId}`, {
            credentials: 'include'
        });

        if (response.ok) {
            userNotes = await response.json();
            console.log(`📝 ${userNotes.length} notes chargées`);

            // Rafraîchir la liste des notes dans le bandeau principal
            refreshNotesList();

            // Rafraîchir le panel s'il est ouvert (pour compatibilité)
            const existingPanel = document.getElementById('notes-panel');
            if (existingPanel) {
                displayNotesPanel();
            }
        }
    } catch (error) {
        console.error('Erreur chargement notes:', error);
    }
}

/**
 * Ajoute une note à un sous-titre
 */
async function addNoteToSubtitle(startTime) {
    const text = prompt('Entrez votre note personnelle (max 500 caractères):');

    if (!text || text.trim().length === 0) return;

    if (text.length > 500) {
        showNotification('Note trop longue (max 500 caractères)', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                video_id: currentVideoId,
                start_time: startTime,
                text: text.trim()
            })
        });

        if (response.ok) {
            showNotification('Note ajoutée!', 'success');
            await loadUserNotes();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Erreur lors de l\'ajout', 'error');
        }
    } catch (error) {
        console.error('Erreur ajout note:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Modifie une note existante
 */
async function editNoteText(noteId, currentText) {
    const text = prompt('Modifier votre note:', currentText);

    if (!text || text.trim().length === 0) return;

    if (text === currentText) return; // Pas de changement

    if (text.length > 500) {
        showNotification('Note trop longue (max 500 caractères)', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ text: text.trim() })
        });

        if (response.ok) {
            showNotification('Note modifiée!', 'success');
            await loadUserNotes();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Erreur lors de la modification', 'error');
        }
    } catch (error) {
        console.error('Erreur modification note:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Supprime une note
 */
async function deleteNoteById(noteId) {
    if (!confirm('Voulez-vous vraiment supprimer cette note?')) return;

    try {
        const response = await fetch(`http://localhost:3000/notes/${noteId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Note supprimée', 'success');
            await loadUserNotes();
        } else {
            showNotification('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression note:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Affiche le panneau avec toutes les notes
 */
function displayNotesPanel() {
    const subtitlesDisplay = document.getElementById('subtitles-display');

    // Retirer le panneau existant si présent
    const existingPanel = document.getElementById('notes-panel');
    if (existingPanel) existingPanel.remove();

    // Créer le panneau
    const panel = document.createElement('div');
    panel.id = 'notes-panel';
    panel.className = 'notes-panel';

    if (userNotes.length === 0) {
        panel.innerHTML = `
            <h3>📝 Mes notes personnelles</h3>
            <p class="no-notes">Vous n'avez pas encore de notes pour cette vidéo.</p>
            <p class="notes-hint">Cliquez sur "Mode Notes Inline" pour ajouter des notes sur les sous-titres.</p>
        `;
    } else {
        const notesHTML = userNotes.map(note => {
            const formattedTime = formatTimecode(note.start_time);
            return `
                <div class="note-item" data-note-id="${note.id}">
                    <div class="note-timecode" onclick="jumpToTime(${note.start_time})">
                        🕒 ${formattedTime}
                    </div>
                    <div class="note-text">${escapeHtml(note.text)}</div>
                    <div class="note-actions">
                        <button class="note-edit-btn" onclick="editNoteText(${note.id}, '${escapeHtml(note.text).replace(/'/g, "\\'")}')">
                            ✏️ Modifier
                        </button>
                        <button class="note-delete-btn" onclick="deleteNoteById(${note.id})">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <h3>📝 Mes notes personnelles (${userNotes.length})</h3>
            <div class="notes-list">${notesHTML}</div>
        `;
    }

    subtitlesDisplay.appendChild(panel);
}

/**
 * Saute à un moment précis de la vidéo
 */
function jumpToTime(seconds) {
    const video = document.getElementById('video-player');
    video.currentTime = seconds;
    video.play();
    showNotification(`⏩ Saut à ${formatTimecode(seconds)}`, 'info', 1500);
}

/**
 * Formate un timecode en secondes vers MM:SS
 */
function formatTimecode(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Ouvre/ferme le panel de toutes les notes
 */
function toggleAllNotesPanel() {
    const existingPanel = document.getElementById('notes-panel');

    if (existingPanel) {
        // Fermer le panel
        existingPanel.remove();
        document.getElementById('all-notes-btn').textContent = '📋 Voir toutes mes notes';
    } else {
        // Ouvrir le panel
        displayNotesPanel();
        document.getElementById('all-notes-btn').textContent = '✖️ Fermer';
    }
}

/**
 * Initialise le système de notes
 */
async function initNotes() {
    console.log('🔄 Initialisation du système de notes...');
    const isAuth = await checkUserAuth();

    if (!isAuth || !currentUser) {
        console.log('📝 Notes désactivées: utilisateur non connecté');
        return;
    }

    console.log(`✅ Utilisateur connecté: ${currentUser.username || currentUser.email}`);

    // Afficher le bandeau de notes
    const notesBanner = document.getElementById('notes-banner');
    if (notesBanner) {
        notesBanner.style.display = 'block';
    }

    // Initialiser le bouton toggle en mode compact par défaut
    const toggleBtn = document.getElementById('notes-toggle-btn');
    if (toggleBtn) {
        toggleBtn.classList.add('compact-mode');
    }

    // Initialiser le formulaire de notes
    initializeNotesForm();

    // Charger les notes existantes
    await loadUserNotes();

    console.log('✅ Système de notes initialisé');
}

/**
 * Initialise les boutons collapse pour les panneaux latéraux
 */
function initializeCollapseButtons() {
    // Bouton collapse Aide IA
    const aiCollapseBtn = document.getElementById('ai-help-collapse-btn');
    if (aiCollapseBtn) {
        aiCollapseBtn.addEventListener('click', toggleAiHelpCollapse);
    }

    // Bouton collapse Notes
    const notesCollapseBtn = document.getElementById('notes-collapse-btn');
    if (notesCollapseBtn) {
        notesCollapseBtn.addEventListener('click', toggleNotesCollapse);
    }
}

/**
 * Bascule l'affichage du panneau Aide IA (collapse/expand)
 */
function toggleAiHelpCollapse() {
    isAiHelpCollapsed = !isAiHelpCollapsed;

    const content = document.getElementById('ai-help-content');
    const btn = document.getElementById('ai-help-collapse-btn');

    if (!content || !btn) return;

    if (isAiHelpCollapsed) {
        content.style.display = 'none';
        btn.classList.add('collapsed');
        btn.textContent = '▶';
    } else {
        content.style.display = 'block';
        btn.classList.remove('collapsed');
        btn.textContent = '▼';
    }
}

/**
 * Bascule l'affichage du panneau Notes (collapse/expand)
 */
function toggleNotesCollapse() {
    isNotesCollapsed = !isNotesCollapsed;

    const content = document.getElementById('notes-content');
    const btn = document.getElementById('notes-collapse-btn');

    if (!content || !btn) return;

    if (isNotesCollapsed) {
        content.style.display = 'none';
        btn.classList.add('collapsed');
        btn.textContent = '▶';
    } else {
        content.style.display = 'block';
        btn.classList.remove('collapsed');
        btn.textContent = '▼';
    }
}

/**
 * Initialise le formulaire de prise de notes
 */
function initializeNotesForm() {
    const textarea = document.getElementById('note-text-input');
    const saveBtn = document.getElementById('save-note-btn');
    const charCounter = document.getElementById('note-char-counter');
    const toggleBtn = document.getElementById('notes-toggle-btn');

    if (!textarea || !saveBtn || !charCounter || !toggleBtn) {
        console.error('❌ Éléments du formulaire de notes introuvables');
        return;
    }

    // Compteur de caractères
    textarea.addEventListener('input', () => {
        charCounter.textContent = `${textarea.value.length}/500`;
    });

    // Sauvegarder la note
    saveBtn.addEventListener('click', saveCurrentNote);

    // Raccourci Ctrl+Enter pour sauvegarder
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            saveCurrentNote();
        }
    });

    // Toggle compact/développé
    toggleBtn.addEventListener('click', toggleNotesMode);

    // Rafraîchir automatiquement en mode compact quand la vidéo avance
    // Throttle: rafraîchir seulement si on a bougé de plus de 2 secondes
    const video = document.getElementById('video-player');
    if (video) {
        video.addEventListener('timeupdate', () => {
            if (isNotesCompactMode && userNotes.length > 0) {
                const currentTime = Math.floor(video.currentTime);
                if (Math.abs(currentTime - lastNotesRefreshTime) >= 2) {
                    lastNotesRefreshTime = currentTime;
                    refreshNotesList();
                }
            }
        });
    }

    console.log('📝 Formulaire de notes initialisé');
}

/**
 * Sauvegarde une note au timecode actuel de la vidéo
 */
async function saveCurrentNote() {
    const textarea = document.getElementById('note-text-input');
    const text = textarea.value.trim();

    if (!text) {
        showNotification('La note ne peut pas être vide', 'warning');
        return;
    }

    if (text.length > 500) {
        showNotification('Note trop longue (max 500 caractères)', 'error');
        return;
    }

    // Récupérer le temps actuel de la vidéo
    const video = document.getElementById('video-player');
    const currentTime = video.currentTime;

    try {
        const response = await fetch('http://localhost:3000/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                video_id: currentVideoId,
                start_time: currentTime,
                text: text
            })
        });

        if (response.ok) {
            showNotification(`Note ajoutée au timecode ${formatTimecode(currentTime)}!`, 'success');
            textarea.value = '';
            document.getElementById('note-char-counter').textContent = '0/500';
            await loadUserNotes();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Erreur lors de l\'ajout', 'error');
        }
    } catch (error) {
        console.error('Erreur sauvegarde note:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

/**
 * Bascule entre mode compact (fenêtre temporelle) et mode développé (toutes les notes)
 */
function toggleNotesMode() {
    isNotesCompactMode = !isNotesCompactMode;

    const toggleBtn = document.getElementById('notes-toggle-btn');
    if (toggleBtn) {
        if (isNotesCompactMode) {
            toggleBtn.textContent = '📋 Toutes';
            toggleBtn.classList.add('compact-mode');
            toggleBtn.title = 'Afficher toutes les notes (mode développé)';
        } else {
            toggleBtn.textContent = '⏱️ Fenêtre';
            toggleBtn.classList.remove('compact-mode');
            toggleBtn.title = 'Afficher uniquement les notes actives (mode compact)';
        }
    }

    // Rafraîchir immédiatement l'affichage
    refreshNotesList();

    console.log(`📝 Mode notes: ${isNotesCompactMode ? 'Compact (fenêtre temporelle)' : 'Développé (toutes)'}`);
}

/**
 * Rafraîchit l'affichage des notes selon le mode actif
 * Mode compact: notes dans la fenêtre temporelle (currentTime >= note.start_time AND currentTime <= note.start_time + NOTE_TIME_WINDOW)
 * Mode développé: toutes les notes triées par timecode
 */
function refreshNotesList() {
    const notesListContainer = document.getElementById('notes-list-container');
    if (!notesListContainer) {
        console.error('❌ Conteneur de la liste des notes introuvable');
        return;
    }

    // Si aucune note
    if (userNotes.length === 0) {
        notesListContainer.innerHTML = `
            <div class="no-notes-message">
                📝 Aucune note pour cette vidéo. Écrivez votre première note ci-dessus!
            </div>
        `;
        return;
    }

    // Filtrer selon le mode
    let notesToDisplay;

    if (isNotesCompactMode) {
        // Mode compact: afficher les notes dans la fenêtre temporelle valide
        // Une note est affichée si: currentTime >= note.start_time AND currentTime <= note.start_time + NOTE_TIME_WINDOW
        const video = document.getElementById('video-player');
        const currentTime = video ? video.currentTime : 0;

        notesToDisplay = userNotes.filter(note =>
            isNoteInTimeWindow(note, currentTime, NOTE_TIME_WINDOW)
        );

        // Si aucune note dans la fenêtre temporelle, afficher vide
        if (notesToDisplay.length === 0) {
            notesListContainer.innerHTML = '';
            return;
        }
    } else {
        // Mode développé: afficher toutes les notes
        notesToDisplay = [...userNotes];
    }

    // Trier par timecode croissant
    notesToDisplay.sort((a, b) => a.start_time - b.start_time);

    // Générer le HTML pour chaque note
    const notesHTML = notesToDisplay.map(note => {
        const formattedTime = formatTimecode(note.start_time);
        return `
            <div class="note-banner-item">
                <div class="note-banner-timecode" onclick="jumpToTime(${note.start_time})">
                    🕒 ${formattedTime}
                </div>
                <div class="note-banner-text">${escapeHtml(note.text)}</div>
                <div class="note-banner-actions">
                    <button class="note-banner-edit" onclick="editNoteText(${note.id}, '${escapeHtml(note.text).replace(/'/g, "\\'")}')">
                        ✏️ Modifier
                    </button>
                    <button class="note-banner-delete" onclick="deleteNoteById(${note.id})">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');

    notesListContainer.innerHTML = notesHTML;

    const modeLabel = isNotesCompactMode ? '(fenêtre temporelle)' : '(toutes)';
    console.log(`📝 Affichage de ${notesToDisplay.length}/${userNotes.length} notes ${modeLabel}`);
}

console.log('🎥 Player ready!');
