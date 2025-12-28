/**
 * Navbar dynamique FranScript
 * Affiche les boutons en fonction du statut de connexion
 */

const API_URL = 'http://localhost:3000';

/**
 * Vérifie si l'utilisateur est connecté et récupère ses infos
 * @returns {Promise<Object|null>} Les infos de l'utilisateur ou null
 */
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            return data.user; // { id, email, role }
        }
        return null;
    } catch (error) {
        console.error('Erreur vérification auth:', error);
        return null;
    }
}

/**
 * Déconnecte l'utilisateur
 */
async function handleLogout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
}

/**
 * Met à jour la navbar en fonction du statut de connexion
 */
async function updateNavbar() {
    const user = await checkAuthStatus();
    const navAccountPlaceholder = document.querySelector('.nav-account-placeholder');

    if (!navAccountPlaceholder) {
        console.warn('Navbar placeholder non trouvé');
        return;
    }

    // Réinitialiser le contenu
    navAccountPlaceholder.style.display = 'block';
    navAccountPlaceholder.innerHTML = '';

    if (user) {
        // Utilisateur connecté - Afficher photo de profil avec menu déroulant
        const profileWrapper = document.createElement('div');
        profileWrapper.className = 'nav-profile-wrapper';

        const profileContainer = document.createElement('div');
        profileContainer.className = 'nav-profile-container';
        profileContainer.title = `${user.username || user.email}`;
        profileContainer.onclick = () => toggleProfileMenu();

        const profilePic = document.createElement('img');
        profilePic.className = 'nav-profile-pic';
        profilePic.src = user.profile_picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
        profilePic.alt = user.username || 'Profil';
        profilePic.onerror = function() {
            this.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
        };

        profileContainer.appendChild(profilePic);

        // Menu déroulant
        const dropdown = document.createElement('div');
        dropdown.className = 'profile-dropdown';
        dropdown.id = 'profile-dropdown';

        // Header du menu avec info utilisateur
        const dropdownHeader = document.createElement('div');
        dropdownHeader.className = 'dropdown-header';
        dropdownHeader.innerHTML = `
            <strong>${user.username || 'Utilisateur'}</strong>
            <small>${user.email}</small>
        `;
        dropdown.appendChild(dropdownHeader);

        // Divider
        const divider = document.createElement('div');
        divider.className = 'dropdown-divider';
        dropdown.appendChild(divider);

        // Option: Modifier profil
        const editProfileBtn = document.createElement('a');
        editProfileBtn.href = '/profile.html';
        editProfileBtn.className = 'dropdown-item';
        editProfileBtn.innerHTML = '👤 Mon profil';
        dropdown.appendChild(editProfileBtn);

        // Si admin : bouton espace admin
        if (user.role === 'admin') {
            const adminBtn = document.createElement('a');
            adminBtn.href = '/admin.html';
            adminBtn.className = 'dropdown-item';
            adminBtn.innerHTML = '👑 Espace Admin';
            dropdown.appendChild(adminBtn);
        }

        // Option: Déconnexion
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'dropdown-item dropdown-item-danger';
        logoutBtn.innerHTML = '🚪 Se déconnecter';
        logoutBtn.onclick = () => {
            handleLogout();
        };
        dropdown.appendChild(logoutBtn);

        profileWrapper.appendChild(profileContainer);
        profileWrapper.appendChild(dropdown);
        navAccountPlaceholder.appendChild(profileWrapper);
    } else {
        // Utilisateur non connecté
        const loginBtn = document.createElement('a');
        loginBtn.href = '/auth.html';
        loginBtn.className = 'nav-btn nav-btn-primary';
        loginBtn.textContent = 'Connexion';
        navAccountPlaceholder.appendChild(loginBtn);

        const registerBtn = document.createElement('a');
        registerBtn.href = '/auth.html';
        registerBtn.className = 'nav-btn nav-btn-secondary';
        registerBtn.textContent = 'Inscription';
        navAccountPlaceholder.appendChild(registerBtn);
    }
}

/**
 * Toggle le menu déroulant du profil
 */
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

/**
 * Ferme le menu si on clique en dehors
 */
document.addEventListener('click', (event) => {
    const profileWrapper = document.querySelector('.nav-profile-wrapper');
    const dropdown = document.getElementById('profile-dropdown');

    if (dropdown && profileWrapper) {
        // Si le clic n'est pas dans le wrapper du profil
        if (!profileWrapper.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    }
});

// Initialiser la navbar au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavbar);
} else {
    updateNavbar();
}
