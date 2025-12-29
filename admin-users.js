// ============================================
// GESTION DES UTILISATEURS - Admin Panel
// ============================================

const API_URL = 'http://localhost:3000';
let allUsers = []; // Cache des utilisateurs pour la recherche

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadUsers();
});

/**
 * Attache tous les event listeners
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

    // Recherche
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Fermeture du modal en cliquant à l'extérieur
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
// CHARGEMENT DES UTILISATEURS
// ============================================

/**
 * Charge tous les utilisateurs depuis l'API
 */
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showNotification('Accès non autorisé', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error('Erreur lors du chargement des utilisateurs');
        }

        const data = await response.json();
        allUsers = data.users || [];
        renderUsersTable(allUsers);
        updateUserCount(allUsers.length);
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
    }
}

/**
 * Affiche les utilisateurs dans le tableau
 * @param {Array} users - Liste des utilisateurs à afficher
 */
function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    const emptyState = document.getElementById('empty-state');

    if (!tbody) return;

    // Si aucun utilisateur
    if (users.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

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
 * Met à jour le compteur d'utilisateurs
 * @param {number} count - Nombre d'utilisateurs
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
 * Gère la soumission du formulaire de création
 * @param {Event} e - Événement de soumission
 */
async function handleCreateUser(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Récupérer les données du formulaire
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

    // Désactiver le bouton pendant la requête
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Création...';

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la création');
        }

        showNotification('✅ Utilisateur créé avec succès', 'success');
        form.reset();
        loadUsers(); // Recharger la liste
    } catch (error) {
        console.error('Erreur création utilisateur:', error);
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
 * Ouvre le modal d'édition avec les données de l'utilisateur
 * @param {number} userId - ID de l'utilisateur à éditer
 */
function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
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
    document.getElementById('edit-password').value = ''; // Toujours vide

    // Afficher le modal
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Ferme le modal d'édition
 */
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('show');
    }

    // Réinitialiser le formulaire
    const form = document.getElementById('edit-user-form');
    if (form) {
        form.reset();
    }
}

/**
 * Gère la soumission du formulaire d'édition
 * @param {Event} e - Événement de soumission
 */
async function handleUpdateUser(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const userId = document.getElementById('edit-user-id').value;

    // Récupérer les données du formulaire
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

    // Validation côté client
    if (!userData.email) {
        showNotification('L\'email est requis', 'error');
        return;
    }

    // Désactiver le bouton pendant la requête
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enregistrement...';

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la mise à jour');
        }

        showNotification('✅ Utilisateur mis à jour avec succès', 'success');
        closeEditModal();
        loadUsers(); // Recharger la liste
    } catch (error) {
        console.error('Erreur mise à jour utilisateur:', error);
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
 * Demande confirmation avant de supprimer un utilisateur
 * @param {number} userId - ID de l'utilisateur à supprimer
 */
function confirmDeleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
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
 * @param {number} userId - ID de l'utilisateur à supprimer
 */
async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la suppression');
        }

        showNotification('✅ Utilisateur supprimé avec succès', 'success');
        loadUsers(); // Recharger la liste
    } catch (error) {
        console.error('Erreur suppression utilisateur:', error);
        showNotification(error.message, 'error');
    }
}

// ============================================
// RECHERCHE
// ============================================

/**
 * Gère la recherche d'utilisateurs
 * @param {Event} e - Événement input
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
        // Aucun terme de recherche : afficher tous les utilisateurs
        renderUsersTable(allUsers);
        updateUserCount(allUsers.length);
        return;
    }

    // Filtrer les utilisateurs
    const filteredUsers = allUsers.filter(user => {
        return (
            user.email.toLowerCase().includes(searchTerm) ||
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            user.id.toString().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
    });

    renderUsersTable(filteredUsers);
    updateUserCount(filteredUsers.length);
}

// ============================================
// UTILITAIRES UI
// ============================================

/**
 * Affiche une notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification (success, error)
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `message ${type} show`;

    // Masquer après 5 secondes
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
 * Retourne le badge HTML pour le statut premium
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
 * Formate une date pour l'affichage
 * @param {string} dateString - Date au format ISO
 * @returns {string} Date formatée
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Si c'est aujourd'hui
    if (diffDays === 0) {
        return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Si c'est hier
    if (diffDays === 1) {
        return 'Hier';
    }

    // Si c'est cette semaine (moins de 7 jours)
    if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    }

    // Sinon afficher la date complète
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Échappe les caractères HTML pour éviter les XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
