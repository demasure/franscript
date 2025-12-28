/**
 * Affiche une notification banner auto-dismissible en haut de l'écran
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de notification: 'success', 'error', 'info', 'warning' (default: 'info')
 * @param {number} duration - Durée d'affichage en millisecondes (default: 4000)
 */
function showNotification(message, type = 'info', duration = 4000) {
    // Supprimer toute notification existante
    const existingNotification = document.querySelector('.notification-banner');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Créer l'élément notification
    const notification = document.createElement('div');
    notification.className = `notification-banner ${type}`;
    notification.textContent = message;

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Déclencher l'animation d'entrée (petit délai pour que le CSS s'applique)
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Auto-dismiss après la durée spécifiée
    setTimeout(() => {
        notification.classList.remove('show');

        // Supprimer l'élément après l'animation de sortie
        setTimeout(() => {
            notification.remove();
        }, 400); // Durée de l'animation de sortie
    }, duration);
}
