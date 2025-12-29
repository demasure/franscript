/**
 * ============================================
 * GESTION DES UTILISATEURS - Admin Panel
 * ============================================
 *
 * Architecture:
 * - Séparation stricte: données (AdminAPI) / logique / UI
 * - États explicites: loading, success, error, empty
 * - Aucune donnée hardcodée
 * - Source unique de vérité: la BDD
 */

// ============================================
// ÉTAT GLOBAL
// ============================================

let currentPage = 1;
let itemsPerPage = 50;
let currentSearch = '';
let currentFilters = {};
let paginationData = null;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation de la gestion des utilisateurs');
    initializeEventListeners();
    loadUsers();
});

/**
 * Initialise tous les event listeners
 */
function initializeEventListeners() {
    // Formulaire de création
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateUser);
    }

    // Formulaire d'édition
    const editForm = document.getElementById('edit-user-form');
    if (editForm) {
        editForm.addEventListener('submit', handleUpdateUser);
    }

    // Recherche avec debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = e.target.value;
                currentPage = 1; // Reset à la page 1 lors d'une recherche
                loadUsers();
            }, 300); // Attendre 300ms après la dernière frappe
        });
    }

    // Fermeture du modal
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }
}

// ============================================
// GESTION DES ÉTATS UI
// ============================================

/**
 * Affiche l'état de chargement
 */
function showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('pagination-controls').style.display = 'none';
    document.querySelector('.users-table').style.display = 'none';
}

/**
 * Affiche l'état vide (0 utilisateurs)
 */
function showEmptyState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('pagination-controls').style.display = 'none';
    document.querySelector('.users-table').style.display = 'none';
}

/**
 * Affiche l'état d'erreur
 * @param {string} message - Message d'erreur
 */
function showErrorState(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('error-message').textContent = message;
    document.getElementById('pagination-controls').style.display = 'none';
    document.querySelector('.users-table').style.display = 'none';
}

/**
 * Affiche l'état de succès (données chargées)
 */
function showSuccessState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.querySelector('.users-table').style.display = 'table';
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

/**
 * Charge les utilisateurs depuis l'API
 * Source unique de vérité: la base de données
 */
async function loadUsers() {
    console.log(`🔄 Chargement des utilisateurs (page ${currentPage}, recherche: "${currentSearch}")`);

    // Afficher l'état de chargement
    showLoadingState();

    try {
        // Appel API avec pagination
        const response = await AdminAPI.users.getAll({
            page: currentPage,
            limit: itemsPerPage,
            search: currentSearch,
            ...currentFilters
        });

        console.log('✅ Données reçues:', response);

        // Stocker les données de pagination
        paginationData = response.pagination;

        // Afficher les résultats
        if (response.users.length === 0) {
            showEmptyState();
        } else {
            renderUsersTable(response.users);
            renderPagination(response.pagination);
            showSuccessState();
        }

        updateUserCount(response.pagination.total);

    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);

        // Gestion spécifique des erreurs d'authentification
        if (error.message === 'AUTH_REQUIRED') {
            showNotification('Vous devez être connecté en tant qu\'admin', 'error');
            setTimeout(() => window.location.href = 'auth.html', 2000);
            return;
        }

        showErrorState(error.message || 'Erreur lors du chargement des utilisateurs');
    }
}

/**
 * Change la page courante
 * @param {number} delta - +1 pour suivant, -1 pour précédent
 */
function changePage(delta) {
    const newPage = currentPage + delta;

    if (newPage < 1 || (paginationData && newPage > paginationData.totalPages)) {
        return; // Page invalide
    }

    currentPage = newPage;
    loadUsers();
}

// ============================================
// RENDU UI
// ============================================

/**
 * Affiche les utilisateurs dans le tableau
 * @param {Array} users - Liste des utilisateurs
 */
function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.username ? escapeHtml(user.username) : '<em style="color: var(--color-text-secondary);">Aucun</em>'}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${user.id})">
                        ✏️ Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser(${user.id})">
                        🗑️ Supprimer
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Affiche les contrôles de pagination
 * @param {Object} pagination - Données de pagination de l'API
 */
function renderPagination(pagination) {
    const paginationDiv = document.getElementById('pagination-controls');
    if (!paginationDiv) return;

    // Afficher seulement si plusieurs pages
    if (pagination.totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }

    paginationDiv.style.display = 'flex';

    // Mettre à jour les infos
    document.getElementById('current-page').textContent = pagination.page;
    document.getElementById('total-pages').textContent = pagination.totalPages;
    document.getElementById('users-count-info').textContent = pagination.total;

    // Mettre à jour les boutons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    prevBtn.disabled = !pagination.hasPrevPage;
    nextBtn.disabled = !pagination.hasNextPage;
}

/**
 * Met à jour le compteur d'utilisateurs
 * @param {number} count - Nombre total d'utilisateurs
 */
function updateUserCount(count) {
    const countEl = document.getElementById('user-count');
    if (countEl) {
        countEl.textContent = count;
    }
}

// ============================================
// CRÉATION D'UTILISATEUR
// ============================================

/**
 * Gère la création d'un nouvel utilisateur
 * @param {Event} e - Événement de soumission
 */
async function handleCreateUser(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Récupération et validation des données
    const userData = {
        email: document.getElementById('new-email').value.trim(),
        password: document.getElementById('new-password').value,
        username: document.getElementById('new-username').value.trim() || null,
        role: document.getElementById('new-role').value,
        is_premium: document.getElementById('new-premium').checked
    };

    // Validation côté client
    if (!userData.email || !userData.password) {
        showNotification('L\'email et le mot de passe sont requis', 'error');
        return;
    }

    if (userData.password.length < 6) {
        showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }

    // État de chargement
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Création...';

    try {
        await AdminAPI.users.create(userData);

        showNotification('✅ Utilisateur créé avec succès', 'success');
        form.reset();
        loadUsers(); // Recharger la liste

    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✨ Créer l\'utilisateur';
    }
}

// ============================================
// ÉDITION D'UTILISATEUR
// ============================================

/**
 * Ouvre le modal d'édition pour un utilisateur
 * @param {number} userId - ID de l'utilisateur
 */
async function openEditModal(userId) {
    // Trouver l'utilisateur dans les données locales (déjà chargées)
    const tbody = document.getElementById('users-table-body');
    const allRows = Array.from(tbody.querySelectorAll('tr'));

    // On pourrait aussi faire un appel API, mais ici on optimise en utilisant les données déjà chargées
    const user = findUserInCurrentPage(userId);

    if (!user) {
        showNotification('Utilisateur introuvable', 'error');
        return;
    }

    // Remplir le formulaire
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-username').value = user.username || '';
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-premium').checked = user.is_premium === 1;
    document.getElementById('edit-password').value = '';

    // Afficher le modal
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Trouve un utilisateur dans la page courante
 * Cette fonction évite un appel API supplémentaire
 * @param {number} userId - ID de l'utilisateur
 * @returns {Object|null} Utilisateur ou null
 */
function findUserInCurrentPage(userId) {
    // Parse le tableau HTML pour retrouver les données
    // Alternative: on pourrait stocker users dans une variable globale
    const row = document.querySelector(`#users-table-body tr td:first-child`);
    // Pour l'instant, simplifions en retournant les données du DOM
    const rows = document.querySelectorAll('#users-table-body tr');

    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (parseInt(cells[0].textContent) === userId) {
            return {
                id: parseInt(cells[0].textContent),
                email: cells[1].textContent,
                username: cells[2].querySelector('em') ? null : cells[2].textContent,
                role: cells[3].textContent.includes('Admin') ? 'admin' : 'user',
                is_premium: cells[4].textContent.includes('Premium') || cells[4].textContent.includes('Admin') ? 1 : 0
            };
        }
    }
    return null;
}

/**
 * Ferme le modal d'édition
 */
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('show');
    }

    const form = document.getElementById('edit-user-form');
    if (form) {
        form.reset();
    }
}

/**
 * Gère la mise à jour d'un utilisateur
 * @param {Event} e - Événement de soumission
 */
async function handleUpdateUser(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const userId = parseInt(document.getElementById('edit-user-id').value);

    // Récupération des données
    const userData = {
        email: document.getElementById('edit-email').value.trim(),
        username: document.getElementById('edit-username').value.trim() || null,
        role: document.getElementById('edit-role').value,
        is_premium: document.getElementById('edit-premium').checked
    };

    // Ajouter le mot de passe seulement s'il est renseigné
    const password = document.getElementById('edit-password').value;
    if (password) {
        if (password.length < 6) {
            showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }
        userData.password = password;
    }

    // Validation
    if (!userData.email) {
        showNotification('L\'email est requis', 'error');
        return;
    }

    // État de chargement
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enregistrement...';

    try {
        await AdminAPI.users.update(userId, userData);

        showNotification('✅ Utilisateur mis à jour avec succès', 'success');
        closeEditModal();
        loadUsers(); // Recharger la liste

    } catch (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Enregistrer';
    }
}

// ============================================
// SUPPRESSION D'UTILISATEUR
// ============================================

/**
 * Demande confirmation avant de supprimer
 * @param {number} userId - ID de l'utilisateur
 */
function confirmDeleteUser(userId) {
    const user = findUserInCurrentPage(userId);
    if (!user) {
        showNotification('Utilisateur introuvable', 'error');
        return;
    }

    const userName = user.username || user.email;
    const confirmed = confirm(
        `⚠️ Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?\n\n` +
        `Cette action est irréversible.`
    );

    if (confirmed) {
        deleteUser(userId);
    }
}

/**
 * Supprime un utilisateur
 * @param {number} userId - ID de l'utilisateur
 */
async function deleteUser(userId) {
    try {
        await AdminAPI.users.delete(userId);

        showNotification('✅ Utilisateur supprimé avec succès', 'success');
        loadUsers(); // Recharger la liste

    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        showNotification(error.message, 'error');
    }
}

// ============================================
// UTILITAIRES UI
// ============================================

/**
 * Affiche une notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type (success, error)
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `message ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

/**
 * Retourne le badge HTML pour le rôle
 * @param {string} role - Rôle de l'utilisateur
 * @returns {string} HTML du badge
 */
function getRoleBadge(role) {
    if (role === 'admin') {
        return '<span class="user-badge badge-admin">👑 Admin</span>';
    }
    return '<span class="user-badge badge-free">Utilisateur</span>';
}

/**
 * Retourne le badge HTML pour le statut
 * @param {Object} user - Utilisateur
 * @returns {string} HTML du badge
 */
function getStatusBadge(user) {
    if (user.role === 'admin') {
        return '<span class="user-badge badge-admin">👑 Admin</span>';
    }
    if (user.is_premium === 1) {
        return '<span class="user-badge badge-premium">💎 Premium</span>';
    }
    return '<span class="user-badge badge-free">🆓 Gratuit</span>';
}

/**
 * Formate une date de manière relative
 * @param {string} dateString - Date ISO
 * @returns {string} Date formatée
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
        return 'Hier';
    }
    if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    }

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Échappe les caractères HTML (protection XSS)
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
