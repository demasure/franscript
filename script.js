/**
 * FranScript - Script JavaScript pour interactions de base
 *
 * Fonctionnalités actuelles :
 * - Filtrage des vidéos par catégorie ET niveau CECRL (B2, C1, C2)
 * - Redirection vers page player dédiée (player.html)
 * - Navigation fluide
 * - Protection anti-téléchargement
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

    // Préparer les conteneurs pour futures fonctionnalités
    prepareFutureFeatures();

    // PROTECTION ANTI-TÉLÉCHARGEMENT
    enableContentProtection();
});

// ========================================
// SYSTÈME DE FILTRAGE PAR CATÉGORIE ET NIVEAU
// ========================================

// État global des filtres
let currentFilters = {
    category: 'all',
    level: 'all'
};

function initializeFilters() {
    const categoryButtons = document.querySelectorAll('.filter-btn:not(.level-filter)');
    const levelButtons = document.querySelectorAll('.filter-btn.level-filter');
    const videoCards = document.querySelectorAll('.video-card');

    // Gestionnaire pour les filtres de catégorie
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            currentFilters.category = category;

            // Mettre à jour les boutons actifs (seulement les catégories)
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Appliquer les filtres combinés
            applyFilters(videoCards);
        });
    });

    // Gestionnaire pour les filtres de niveau
    levelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const level = this.getAttribute('data-level');
            currentFilters.level = level;

            // Mettre à jour les boutons actifs (seulement les niveaux)
            levelButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Appliquer les filtres combinés
            applyFilters(videoCards);
        });
    });
}

/**
 * Applique les filtres combinés (catégorie ET niveau)
 * @param {NodeList} videoCards - Liste des cartes vidéo
 */
function applyFilters(videoCards) {
    videoCards.forEach(card => {
        const categories = card.getAttribute('data-categories');
        const level = card.getAttribute('data-level');

        // Vérifier le filtre de catégorie
        const matchesCategory = currentFilters.category === 'all' ||
                                categories.includes(currentFilters.category);

        // Vérifier le filtre de niveau
        const matchesLevel = currentFilters.level === 'all' ||
                            level === currentFilters.level;

        // Afficher seulement si les deux filtres correspondent
        if (matchesCategory && matchesLevel) {
            showCard(card);
        } else {
            hideCard(card);
        }
    });

    // Animation de scroll fluide vers la grille
    const videoGrid = document.querySelector('.video-grid');
    if (videoGrid) {
        videoGrid.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

/**
 * DEPRECATED: Ancienne fonction de filtrage - conservée pour compatibilité
 * Utiliser applyFilters() à la place
 */
function filterVideos(category, videoCards) {
    console.warn('⚠️ filterVideos() est dépréciée. Utiliser applyFilters() à la place.');
    currentFilters.category = category;
    applyFilters(videoCards);
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
            const videoLevel = this.getAttribute('data-level') || 'B2';

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`📹 Redirection vers player : ${videoTitle}`);
                // Rediriger vers la page player avec paramètres
                window.location.href = `player.html?video=${encodeURIComponent(videoSrc)}&subtitle=${encodeURIComponent(subtitleSrc)}&title=${encodeURIComponent(videoTitle)}&level=${encodeURIComponent(videoLevel)}`;
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
            const videoLevel = card.getAttribute('data-level') || 'B2';

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`▶️ Redirection vers player : ${videoTitle}`);
                // Rediriger vers la page player avec paramètres
                window.location.href = `player.html?video=${encodeURIComponent(videoSrc)}&subtitle=${encodeURIComponent(subtitleSrc)}&title=${encodeURIComponent(videoTitle)}&level=${encodeURIComponent(videoLevel)}`;
            } else {
                console.log(`⚠️ Pas de fichier vidéo pour : ${videoTitle}`);
                alert('Cette vidéo n\'est pas encore disponible. Seule "Ma Première Vidéo" contient un fichier réel.');
            }
        });
    });
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
// PROTECTION ANTI-TÉLÉCHARGEMENT
// ========================================

/**
 * Active les protections contre le téléchargement de contenu
 * AVERTISSEMENT : Ces protections NE sont PAS absolues !
 * Les utilisateurs techniques peuvent toujours contourner ces mesures.
 */
function enableContentProtection() {
    // 1. Bloquer le clic droit sur tout le site
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, false);

    // 2. Bloquer les raccourcis clavier de développement
    document.addEventListener('keydown', function(e) {
        // F12 - Outils de développement
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I - Inspecter
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J - Console
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
        }

        // Ctrl+U - Voir le code source
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }

        // Ctrl+S - Sauvegarder la page
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+C - Sélecteur d'élément
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
    });

    // 3. Empêcher la sélection de texte et d'images
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // 4. Bloquer le drag & drop
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // 5. Protection supplémentaire sur les vidéos
    const videos = document.querySelectorAll('video');
    videos.forEach(function(video) {
        // Bloquer le clic droit spécifiquement sur la vidéo
        video.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        // Empêcher le téléchargement via les attributs
        video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
        video.setAttribute('disablePictureInPicture', 'true');
        video.setAttribute('oncontextmenu', 'return false;');
    });

    // 6. Détection des DevTools (méthode basique - peut être contournée)
    let devToolsOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            devToolsOpen = true;
            console.clear();
            console.log('⚠️ Les outils de développement sont désactivés pour protéger le contenu.');
        }
    });

    setInterval(function() {
        devToolsOpen = false;
        console.log(element);
        if (devToolsOpen) {
            // Les DevTools sont ouverts - on peut afficher un avertissement
            // Mais on ne peut pas vraiment les fermer
        }
    }, 1000);

    console.log('🔒 Protections anti-téléchargement activées');
    console.log('⚠️ Note : Ces protections ne sont pas absolues. Les utilisateurs techniques peuvent les contourner.');
}

// ========================================
// EXPORT POUR UTILISATION EXTERNE (optionnel)
// ========================================
window.FranScript = {
    applyFilters,
    filterVideos,  // Deprecated - conservée pour compatibilité
    userSystem: window.userSystem,
    annotationSystem: window.annotationSystem,
    searchSystem: window.searchSystem,
    premiumSystem: window.premiumSystem
};

console.log('🎥 FranScript ready!');
