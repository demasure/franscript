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
        // Utilisateur connecté
        const userInfo = document.createElement('span');
        userInfo.className = 'nav-user-info';
        userInfo.textContent = `Connecté en tant que ${user.email}`;
        navAccountPlaceholder.appendChild(userInfo);

        // Bouton déconnexion
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'nav-btn nav-btn-secondary';
        logoutBtn.textContent = 'Déconnexion';
        logoutBtn.onclick = handleLogout;
        navAccountPlaceholder.appendChild(logoutBtn);

        // Si admin : bouton espace admin
        if (user.role === 'admin') {
            const adminBtn = document.createElement('a');
            adminBtn.href = '/admin.html';
            adminBtn.className = 'nav-btn nav-btn-admin';
            adminBtn.textContent = '👑 Espace Admin';
            navAccountPlaceholder.appendChild(adminBtn);
        }
    } else {
        // Utilisateur non connecté
        const loginBtn = document.createElement('a');
        loginBtn.href = '/auth-demo.html';
        loginBtn.className = 'nav-btn nav-btn-primary';
        loginBtn.textContent = 'Connexion';
        navAccountPlaceholder.appendChild(loginBtn);

        const registerBtn = document.createElement('a');
        registerBtn.href = '/auth-demo.html';
        registerBtn.className = 'nav-btn nav-btn-secondary';
        registerBtn.textContent = 'Inscription';
        navAccountPlaceholder.appendChild(registerBtn);
    }
}

// Initialiser la navbar au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavbar);
} else {
    updateNavbar();
}
