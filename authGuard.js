/**
 * Protection d'authentification
 * À inclure dans TOUTES les pages qui nécessitent une connexion
 * Redirige automatiquement vers /auth.html si non connecté
 */

(async function() {
    const API_URL = 'http://localhost:3000';

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'
        });

        if (!response.ok) {
            // Non connecté - rediriger vers la page d'authentification
            console.log('❌ Non authentifié - redirection vers /auth.html');
            window.location.href = '/auth.html';
        } else {
            // Connecté - continuer
            const data = await response.json();
            console.log('✅ Authentifié en tant que:', data.user.email);
        }
    } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error);
        // En cas d'erreur, rediriger vers auth par sécurité
        window.location.href = '/auth.html';
    }
})();
