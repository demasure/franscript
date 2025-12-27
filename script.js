/**
 * FranScript - Script JavaScript pour interactions de base
 *
 * Fonctionnalités actuelles :
 * - Filtrage des vidéos par catégorie
 * - Gestion du modal lecteur vidéo (préparé pour futur)
 * - Navigation fluide
 *
 * Structure évolutive pour ajouter :
 * - Authentification utilisateur
 * - Sauvegarde de progression
 * - Annotations interactives
 * - Recherche avancée
 */

// ========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 FranScript initialisé');

    // Initialiser les filtres de catégories
    initializeFilters();

    // Initialiser les cartes vidéo (événements de clic)
    initializeVideoCards();

    // Initialiser le modal (caché pour l'instant)
    initializeModal();

    // Préparer les conteneurs pour futures fonctionnalités
    prepareFutureFeatures();
});

// ========================================
// SYSTÈME DE FILTRAGE PAR CATÉGORIE
// ========================================
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const videoCards = document.querySelectorAll('.video-card');

    // Ajouter événement de clic sur chaque bouton de filtre
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');

            // Mettre à jour les boutons actifs
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filtrer les vidéos
            filterVideos(category, videoCards);
        });
    });
}

/**
 * Filtre les vidéos en fonction de la catégorie sélectionnée
 * @param {string} category - Catégorie à filtrer ('all' pour tout afficher)
 * @param {NodeList} videoCards - Liste des cartes vidéo
 */
function filterVideos(category, videoCards) {
    videoCards.forEach(card => {
        const categories = card.getAttribute('data-categories');

        if (category === 'all') {
            // Afficher toutes les vidéos
            showCard(card);
        } else {
            // Vérifier si la vidéo contient la catégorie recherchée
            if (categories.includes(category)) {
                showCard(card);
            } else {
                hideCard(card);
            }
        }
    });

    // Animation de scroll fluide vers la grille
    document.querySelector('.video-grid').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
}

/**
 * Affiche une carte vidéo avec animation
 * @param {HTMLElement} card - Carte vidéo à afficher
 */
function showCard(card) {
    card.classList.remove('fade-out');
    card.classList.add('fade-in');
    card.style.display = 'block';

    // Retirer la classe d'animation après l'effet
    setTimeout(() => {
        card.classList.remove('fade-in');
    }, 300);
}

/**
 * Cache une carte vidéo avec animation
 * @param {HTMLElement} card - Carte vidéo à cacher
 */
function hideCard(card) {
    card.classList.remove('fade-in');
    card.classList.add('fade-out');

    // Cacher complètement après l'animation
    setTimeout(() => {
        card.style.display = 'none';
    }, 300);
}

// ========================================
// GESTION DES CARTES VIDÉO
// ========================================
function initializeVideoCards() {
    const videoCards = document.querySelectorAll('.video-card');
    const playButtons = document.querySelectorAll('.play-btn');

    // Événement de clic sur les cartes vidéo
    videoCards.forEach(card => {
        card.addEventListener('click', function(event) {
            // Empêcher le clic si on clique sur le bouton play directement
            if (event.target.classList.contains('play-btn')) {
                return;
            }

            const videoSrc = this.getAttribute('data-video-src');
            const subtitleSrc = this.getAttribute('data-subtitle-src');
            const videoTitle = this.querySelector('.video-title').textContent;

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`📹 Vidéo sélectionnée : ${videoTitle}`);
                openVideoPlayer(videoSrc, subtitleSrc, videoTitle);
            } else {
                console.log(`⚠️ Pas de fichier vidéo pour : ${videoTitle}`);
                alert('Cette vidéo n\'est pas encore disponible. Seule "Ma Première Vidéo" contient un fichier réel.');
            }
        });
    });

    // Événement de clic sur les boutons play
    playButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // Empêcher la propagation au parent

            const card = this.closest('.video-card');
            const videoSrc = card.getAttribute('data-video-src');
            const subtitleSrc = card.getAttribute('data-subtitle-src');
            const videoTitle = card.querySelector('.video-title').textContent;

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`▶️ Lecture de : ${videoTitle}`);
                openVideoPlayer(videoSrc, subtitleSrc, videoTitle);
            } else {
                console.log(`⚠️ Pas de fichier vidéo pour : ${videoTitle}`);
                alert('Cette vidéo n\'est pas encore disponible. Seule "Ma Première Vidéo" contient un fichier réel.');
            }
        });
    });
}

// ========================================
// MODAL LECTEUR VIDÉO (Préparé pour futur)
// ========================================
function initializeModal() {
    const modal = document.getElementById('video-player-modal');
    const closeBtn = document.querySelector('.modal-close');

    // Fermer le modal avec le bouton X
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeModal();
        });
    }

    // Fermer le modal en cliquant à l'extérieur
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Fermer le modal avec la touche Échap
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Ouvre le modal du lecteur vidéo avec la source vidéo et les sous-titres
 * @param {string} videoSrc - Chemin vers le fichier vidéo (ex: "videos/ma_video.mp4")
 * @param {string} subtitleSrc - Chemin vers le fichier de sous-titres (ex: "videos/ma_video.vtt")
 * @param {string} videoTitle - Titre de la vidéo pour affichage
 */
function openVideoPlayer(videoSrc, subtitleSrc, videoTitle) {
    const modal = document.getElementById('video-player-modal');
    const player = document.getElementById('main-player');

    if (!modal || !player) {
        console.error('❌ Modal ou lecteur vidéo introuvable');
        return;
    }

    // Charger la source vidéo
    const source = player.querySelector('source');
    if (source) {
        source.src = videoSrc;
    } else {
        // Si pas de source, en créer une
        const newSource = document.createElement('source');
        newSource.src = videoSrc;
        newSource.type = 'video/mp4';
        player.appendChild(newSource);
    }

    // Charger les sous-titres si disponibles
    if (subtitleSrc && subtitleSrc.trim() !== '') {
        // Chercher la track de sous-titres existante
        let subtitleTrack = player.querySelector('track[kind="subtitles"]');

        if (subtitleTrack) {
            subtitleTrack.src = subtitleSrc;
        } else {
            // Si pas de track, en créer une
            subtitleTrack = document.createElement('track');
            subtitleTrack.kind = 'subtitles';
            subtitleTrack.src = subtitleSrc;
            subtitleTrack.srclang = 'fr';
            subtitleTrack.label = 'Français';
            subtitleTrack.default = true;
            player.appendChild(subtitleTrack);
        }

        console.log(`📝 Sous-titres chargés : ${subtitleSrc}`);
    }

    // Recharger le lecteur pour prendre en compte les nouvelles sources
    player.load();

    // Afficher le modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Empêcher le scroll de la page

    console.log(`🎬 Lecteur ouvert pour : ${videoTitle}`);
    console.log(`📹 Source vidéo : ${videoSrc}`);
}

/**
 * Ferme le modal du lecteur vidéo
 */
function closeModal() {
    const modal = document.getElementById('video-player-modal');
    const player = document.getElementById('main-player');

    if (!modal || !player) return;

    // Pause et reset de la vidéo
    player.pause();
    player.currentTime = 0;

    // Cacher le modal
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Réactiver le scroll

    console.log('❌ Lecteur vidéo fermé');
}

// ========================================
// FONCTIONNALITÉS FUTURES (Préparation)
// ========================================
function prepareFutureFeatures() {
    // Conteneurs cachés prêts à être activés

    // 1. Système de compte utilisateur
    window.userSystem = {
        isLoggedIn: false,
        currentUser: null,

        login: function(username, password) {
            // TODO: Implémenter authentification
            console.log('🔐 Fonction login prête à implémenter');
        },

        logout: function() {
            // TODO: Implémenter déconnexion
            console.log('👋 Fonction logout prête à implémenter');
        },

        saveProgress: function(videoId, timestamp) {
            // TODO: Sauvegarder la progression de visionnage
            console.log('💾 Fonction saveProgress prête à implémenter');
        }
    };

    // 2. Système d'annotations interactives
    window.annotationSystem = {
        annotations: [],

        loadAnnotations: function(videoId) {
            // TODO: Charger les annotations pour une vidéo
            console.log('📝 Fonction loadAnnotations prête à implémenter');
        },

        addAnnotation: function(timestamp, text, type) {
            // TODO: Ajouter une annotation
            console.log('➕ Fonction addAnnotation prête à implémenter');
        },

        displayAnnotation: function(annotation) {
            // TODO: Afficher une annotation à l'écran
            console.log('👁️ Fonction displayAnnotation prête à implémenter');
        }
    };

    // 3. Système de recherche avancée
    window.searchSystem = {
        searchVideos: function(query) {
            // TODO: Rechercher dans les vidéos, titres, descriptions, sous-titres
            console.log('🔍 Fonction searchVideos prête à implémenter');
        },

        searchSubtitles: function(query) {
            // TODO: Rechercher dans les sous-titres
            console.log('📄 Fonction searchSubtitles prête à implémenter');
        }
    };

    // 4. Système premium
    window.premiumSystem = {
        isPremium: false,

        checkPremiumStatus: function() {
            // TODO: Vérifier le statut premium de l'utilisateur
            console.log('⭐ Fonction checkPremiumStatus prête à implémenter');
        },

        unlockPremiumFeatures: function() {
            // TODO: Activer les fonctionnalités premium
            console.log('🔓 Fonction unlockPremiumFeatures prête à implémenter');
        }
    };

    console.log('✅ Conteneurs pour fonctionnalités futures préparés');
}

// ========================================
// UTILITAIRES
// ========================================

/**
 * Obtenir la source vidéo (à implémenter avec vrai système de fichiers)
 * @param {string} videoTitle - Titre de la vidéo
 * @returns {string} URL de la vidéo
 */
function getVideoSource(videoTitle) {
    // TODO: Mapper les titres aux vrais fichiers vidéo
    const videoMap = {
        'Le Dîner de Cons': '/videos/diner-de-cons.mp4',
        'Intouchables': '/videos/intouchables.mp4',
        // etc.
    };
    return videoMap[videoTitle] || '';
}

/**
 * Charger les sous-titres pour une vidéo (à implémenter)
 * @param {string} videoTitle - Titre de la vidéo
 */
function loadSubtitles(videoTitle) {
    // TODO: Charger les fichiers .vtt ou .srt
    console.log(`📝 Chargement des sous-titres pour : ${videoTitle}`);
}

/**
 * Smooth scroll vers une section
 * @param {string} sectionId - ID de la section
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========================================
// EXPORT POUR UTILISATION EXTERNE (optionnel)
// ========================================
window.FranScript = {
    filterVideos,
    openVideoPlayer,
    closeModal,
    userSystem: window.userSystem,
    annotationSystem: window.annotationSystem,
    searchSystem: window.searchSystem,
    premiumSystem: window.premiumSystem
};

console.log('🎥 FranScript ready!');
