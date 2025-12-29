/**
 * FranScript - Profile Page JavaScript
 *
 * Fonctionnalités :
 * - Chargement des informations du profil
 * - Modification du pseudo
 * - Upload et changement d'avatar
 * - Gestion des réglages d'apprentissage
 * - Déconnexion
 */

const API_URL = 'http://localhost:3000';

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👤 Page profil initialisée');

    // Charger les données du profil
    await loadProfile();

    // Initialiser les événements
    initializeEvents();
});

// ========================================
// CHARGEMENT DU PROFIL
// ========================================

async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'auth.html';
                return;
            }
            throw new Error('Erreur lors du chargement du profil');
        }

        const profile = await response.json();
        console.log('Profil chargé:', profile);

        // Remplir les champs
        document.getElementById('email').value = profile.email || '';
        document.getElementById('username').value = profile.username || '';

        // Formater la date de création
        if (profile.created_at) {
            const date = new Date(profile.created_at);
            document.getElementById('member-since').value = date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Avatar
        if (profile.profile_picture) {
            document.getElementById('avatar-preview').src = `${API_URL}${profile.profile_picture}`;
        }

        // Badge premium
        if (profile.is_premium) {
            document.getElementById('premium-badge').style.display = 'block';
        }

        // Vérifier si le pseudo est déjà confirmé (définitif)
        if (profile.username_confirmed === 1) {
            const usernameInput = document.getElementById('username');
            usernameInput.disabled = true;
            usernameInput.title = 'Votre pseudo est définitif et ne peut plus être modifié';
            usernameInput.style.cursor = 'not-allowed';
            usernameInput.style.opacity = '0.6';

            // Désactiver aussi le bouton de sauvegarde si c'est la seule modification possible
            const saveBtn = document.getElementById('save-profile-btn');
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            saveBtn.title = 'Votre pseudo est définitif et ne peut plus être modifié';
        }

        // Réglages
        const noteWindow = profile.note_window_seconds || 10;
        document.getElementById('note-window').value = noteWindow;
        document.getElementById('note-window-value').textContent = `${noteWindow} seconde${noteWindow > 1 ? 's' : ''}`;

        document.getElementById('show-ai-help').checked = profile.show_ai_help_default === 1;
        document.getElementById('show-notes').checked = profile.show_notes_default === 1;

    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors du chargement du profil', 'error');
    }
}

// ========================================
// ÉVÉNEMENTS
// ========================================

function initializeEvents() {
    // Mise à jour de la valeur du range en temps réel
    const noteWindowRange = document.getElementById('note-window');
    const noteWindowValue = document.getElementById('note-window-value');

    noteWindowRange.addEventListener('input', function() {
        const value = this.value;
        noteWindowValue.textContent = `${value} seconde${value > 1 ? 's' : ''}`;
    });

    // Upload d'avatar
    document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);

    // Sauvegarder le profil (pseudo)
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

    // Sauvegarder les réglages
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

    // Déconnexion
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// ========================================
// UPLOAD D'AVATAR
// ========================================

async function handleAvatarUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    // Validation côté client
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showMessage('Format de fichier non supporté. Utilisez JPG, PNG ou GIF.', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showMessage('Fichier trop volumineux. Maximum 2 MB.', 'error');
        return;
    }

    // Prévisualisation immédiate
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('avatar-preview').src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload vers le serveur
    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${API_URL}/profile/avatar`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'upload');
        }

        const result = await response.json();
        console.log('Avatar mis à jour:', result);

        showMessage('✅ Avatar mis à jour avec succès !', 'success');

    } catch (error) {
        console.error('Erreur upload:', error);
        showMessage('Erreur lors de la mise à jour de l\'avatar', 'error');
        // Recharger l'ancien avatar
        await loadProfile();
    }
}

// ========================================
// SAUVEGARDE DU PROFIL
// ========================================

async function saveProfile() {
    const username = document.getElementById('username').value.trim();

    if (!username) {
        showMessage('Le pseudo ne peut pas être vide', 'error');
        return;
    }

    // Validation longueur
    if (username.length < 3 || username.length > 20) {
        showMessage('Le pseudo doit contenir entre 3 et 20 caractères', 'error');
        return;
    }

    // CONFIRMATION IRRÉVERSIBLE
    const confirmed = confirm(
        '⚠️ ATTENTION : Ce pseudo sera DÉFINITIF\n\n' +
        `Votre pseudo sera : "${username}"\n\n` +
        'Une fois validé, vous ne pourrez PLUS le modifier.\n\n' +
        'Êtes-vous absolument sûr(e) de vouloir continuer ?'
    );

    if (!confirmed) {
        return; // Utilisateur a annulé
    }

    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const result = await response.json();

        if (!response.ok) {
            // Gérer les erreurs spécifiques
            if (response.status === 403 && result.isConfirmed) {
                showMessage('❌ Votre pseudo est déjà définitif et ne peut plus être modifié', 'error');
            } else if (response.status === 409 && result.conflict) {
                showMessage('❌ Ce pseudo est déjà utilisé par un autre utilisateur', 'error');
            } else {
                showMessage(`❌ ${result.error || 'Erreur lors de la mise à jour'}`, 'error');
            }
            return;
        }

        console.log('Profil mis à jour:', result);
        showMessage('✅ Votre pseudo a été confirmé avec succès ! Il est maintenant définitif.', 'success');

        // Désactiver le champ et le bouton
        setTimeout(() => {
            const usernameInput = document.getElementById('username');
            usernameInput.disabled = true;
            usernameInput.style.cursor = 'not-allowed';
            usernameInput.style.opacity = '0.6';

            const saveBtn = document.getElementById('save-profile-btn');
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }, 1000);

    } catch (error) {
        console.error('Erreur:', error);
        showMessage('❌ Erreur lors de la mise à jour', 'error');
    }
}

// ========================================
// SAUVEGARDE DES RÉGLAGES
// ========================================

async function saveSettings() {
    const noteWindowSeconds = parseInt(document.getElementById('note-window').value);
    const showAiHelpDefault = document.getElementById('show-ai-help').checked;
    const showNotesDefault = document.getElementById('show-notes').checked;

    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                note_window_seconds: noteWindowSeconds,
                show_ai_help_default: showAiHelpDefault,
                show_notes_default: showNotesDefault
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la mise à jour');
        }

        const result = await response.json();
        console.log('Réglages mis à jour:', result);

        showMessage('✅ Réglages sauvegardés avec succès !', 'success');

    } catch (error) {
        console.error('Erreur:', error);
        showMessage(error.message, 'error');
    }
}

// ========================================
// DÉCONNEXION
// ========================================

async function logout() {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = 'auth.html';
        } else {
            throw new Error('Erreur lors de la déconnexion');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de la déconnexion', 'error');
    }
}

// ========================================
// UTILITAIRES
// ========================================

function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('profile-message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide après 5 secondes
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);

    // Scroll vers le haut pour voir le message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
