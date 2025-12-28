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
// UTILITAIRE - Conversion hex vers RGB
// ========================================
function hexToRgb(hex) {
    // Supprimer le # si présent
    hex = hex.replace('#', '');

    // Convertir en RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `${r}, ${g}, ${b}`;
}

// ========================================
// CHARGEMENT DYNAMIQUE DES TAGS ET VIDÉOS
// ========================================
async function loadTags() {
    try {
        const response = await fetch('http://localhost:3000/tags');
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des tags');
        }

        const { tags } = await response.json();
        const categoryFilters = document.querySelector('.category-filters');

        // Garder le bouton "Toutes"
        const allButton = categoryFilters.querySelector('[data-category="all"]');
        categoryFilters.innerHTML = '';
        if (allButton) {
            categoryFilters.appendChild(allButton);
        }

        // Créer les boutons de filtre pour chaque tag avec effet semi-transparent
        tags.forEach(tag => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.setAttribute('data-category', tag.name.toLowerCase());
            // Appliquer l'effet CECRL: fond semi-transparent, bordure et texte solides
            button.style.backgroundColor = `rgba(${hexToRgb(tag.color)}, 0.2)`;
            button.style.color = tag.color;
            button.style.border = `2px solid ${tag.color}`;
            button.textContent = tag.name;
            categoryFilters.appendChild(button);
        });

        console.log(`✅ ${tags.length} tag(s) chargé(s)`);
    } catch (error) {
        console.error('Erreur chargement tags:', error);
    }
}

async function loadVideos() {
    try {
        const response = await fetch('http://localhost:3000/videos');
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des vidéos');
        }

        const { videos } = await response.json();
        const videoGrid = document.querySelector('.video-grid');

        // Vider la grille actuelle
        videoGrid.innerHTML = '';

        // Créer une carte pour chaque vidéo
        videos.forEach(video => {
            const card = createVideoCard(video);
            videoGrid.appendChild(card);
        });

        // Réinitialiser les événements de clic sur les nouvelles cartes
        initializeVideoCards();

        console.log(`✅ ${videos.length} vidéo(s) chargée(s)`);
    } catch (error) {
        console.error('Erreur chargement vidéos:', error);
    }
}

function createVideoCard(video) {
    const article = document.createElement('article');
    article.className = 'video-card';

    // Utiliser les vrais tags de la vidéo
    const tagNames = video.tags ? video.tags.map(t => t.name.toLowerCase()).join(' ') : '';
    article.setAttribute('data-categories', tagNames);
    article.setAttribute('data-tag-ids', video.tags ? video.tags.map(t => t.id).join(',') : '');
    article.setAttribute('data-level', 'B2'); // TODO: ajouter niveau dans la base de données
    article.setAttribute('data-video-src', video.video_url);
    article.setAttribute('data-subtitle-src', video.subtitle_url || '');
    article.setAttribute('data-video-id', video.id);

    // Générer les tags HTML avec effet semi-transparent (comme CECRL)
    const tagsHTML = video.tags && video.tags.length > 0
        ? video.tags.map(tag => `<span class="tag" style="background-color: rgba(${hexToRgb(tag.color)}, 0.2); color: ${tag.color}; border: 2px solid ${tag.color};">${tag.name.toUpperCase()}</span>`).join('')
        : '';

    article.innerHTML = `
        <div class="video-thumbnail">
            <img src="https://via.placeholder.com/400x225/2ecc71/ffffff?text=${encodeURIComponent(video.title)}" alt="${video.title}">
            <div class="video-overlay">
                <button class="play-btn">▶ Lire</button>
            </div>
            <span class="badge badge-real" style="position: absolute; top: 8px; left: 8px; background: #2ecc71; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Vidéo Réelle</span>
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <p class="video-description">${video.description || ''}</p>
            <div class="video-meta">
                <span class="video-duration">40 sec</span>
                <span class="video-level level-badge level-b2">B2</span>
            </div>
            <div class="video-tags">
                ${tagsHTML}
                ${video.is_paid ? '<span class="tag tag-culte">⭐ CULTE</span>' : ''}
            </div>
        </div>
    `;

    return article;
}

// ========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎬 FranScript initialisé');

    // Charger les tags et vidéos depuis la base de données
    await loadTags();
    await loadVideos();

    // Initialiser les filtres de catégories
    initializeFilters();

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
    tags: [], // Tableau de tags sélectionnés (multi-sélection)
    level: 'all'
};

function initializeFilters() {
    const categoryButtons = document.querySelectorAll('.filter-btn:not(.level-filter)');
    const levelButtons = document.querySelectorAll('.filter-btn.level-filter');

    // Gestionnaire pour les filtres de tags (multi-sélection)
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');

            if (category === 'all') {
                // "Toutes" : réinitialiser tous les tags
                currentFilters.tags = [];
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            } else {
                // Toggle le tag (activer/désactiver)
                const index = currentFilters.tags.indexOf(category);
                if (index > -1) {
                    // Déjà sélectionné → désélectionner
                    currentFilters.tags.splice(index, 1);
                    this.classList.remove('active');
                } else {
                    // Pas sélectionné → sélectionner
                    currentFilters.tags.push(category);
                    this.classList.add('active');
                }

                // Désactiver "Toutes" si des tags sont sélectionnés
                const allButton = document.querySelector('.filter-btn[data-category="all"]');
                if (currentFilters.tags.length > 0) {
                    allButton.classList.remove('active');
                } else {
                    allButton.classList.add('active');
                }
            }

            // Appliquer les filtres combinés
            applyFilters();
        });
    });

    // Gestionnaire pour les filtres de niveau (exclusifs)
    levelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const level = this.getAttribute('data-level');
            currentFilters.level = level;

            // Mettre à jour les boutons actifs (seulement les niveaux)
            levelButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Appliquer les filtres combinés
            applyFilters();
        });
    });
}

/**
 * Applique les filtres combinés (tags multiples ET niveau exclusif)
 */
function applyFilters() {
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const categories = card.getAttribute('data-categories');
        const level = card.getAttribute('data-level');

        // Vérifier le filtre de tags (au moins un tag doit correspondre)
        let matchesTags = true;
        if (currentFilters.tags.length > 0) {
            matchesTags = currentFilters.tags.some(tag => categories.includes(tag));
        }

        // Vérifier le filtre de niveau
        const matchesLevel = currentFilters.level === 'all' ||
                            level === currentFilters.level;

        // Afficher seulement si les deux filtres correspondent
        if (matchesTags && matchesLevel) {
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

    console.log(`🎯 DEBUG: ${videoCards.length} cartes vidéo trouvées`);
    console.log(`🎯 DEBUG: ${playButtons.length} boutons play trouvés`);

    // Événement de clic sur les cartes vidéo
    videoCards.forEach(card => {
        card.addEventListener('click', function(event) {
            console.log('🖱️ DEBUG: Clic détecté sur une carte');

            // Empêcher le clic si on clique sur le bouton play directement
            if (event.target.classList.contains('play-btn')) {
                console.log('⚠️ DEBUG: Clic sur bouton play - event stoppé');
                return;
            }

            const videoSrc = this.getAttribute('data-video-src');
            const subtitleSrc = this.getAttribute('data-subtitle-src');
            const videoTitle = this.querySelector('.video-title').textContent.trim();
            const videoLevel = this.getAttribute('data-level') || 'B2';

            console.log(`🔍 DEBUG: videoSrc="${videoSrc}", titre="${videoTitle}"`);

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`📹 Redirection vers player : ${videoTitle}`);

                // Ajouter l'ID pour "Ma Première Vidéo" (ID 1 dans la base de données)
                let url = `player.html?video=${encodeURIComponent(videoSrc)}&subtitle=${encodeURIComponent(subtitleSrc)}&title=${encodeURIComponent(videoTitle)}&level=${encodeURIComponent(videoLevel)}`;
                if (videoTitle === 'Ma Première Vidéo') {
                    console.log('✅ Ajout de l\'ID=1 pour Ma Première Vidéo');
                    url += '&id=1';
                }

                // Rediriger vers la page player avec paramètres
                window.location.href = url;
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
            const videoTitle = card.querySelector('.video-title').textContent.trim();
            const videoLevel = card.getAttribute('data-level') || 'B2';

            // Vérifier si la vidéo a un fichier source
            if (videoSrc && videoSrc.trim() !== '') {
                console.log(`▶️ Redirection vers player : ${videoTitle}`);

                // Ajouter l'ID pour "Ma Première Vidéo" (ID 1 dans la base de données)
                let url = `player.html?video=${encodeURIComponent(videoSrc)}&subtitle=${encodeURIComponent(subtitleSrc)}&title=${encodeURIComponent(videoTitle)}&level=${encodeURIComponent(videoLevel)}`;
                if (videoTitle === 'Ma Première Vidéo') {
                    console.log('✅ Ajout de l\'ID=1 pour Ma Première Vidéo');
                    url += '&id=1';
                }

                // Rediriger vers la page player avec paramètres
                window.location.href = url;
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
        // console.log(element); // Commenté pour éviter le spam
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
