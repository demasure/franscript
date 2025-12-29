/**
 * Admin Content Management - JavaScript
 * Gestion hiérarchique Saga → Saison → Épisode
 */

const API_BASE = 'http://localhost:3000';

// État global
let selectedSagaId = null;
let selectedSaisonId = null;
let allSagas = [];
let allSaisons = [];
let allEpisodes = [];

// ========================================
// INITIALISATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎬 Admin Content Management initialisé');

    // Charger les sagas
    await loadSagas();

    // Initialiser les formulaires
    initForms();
});

// ========================================
// CHARGEMENT DES DONNÉES
// ========================================

async function loadSagas() {
    try {
        const response = await fetch(`${API_BASE}/admin/sagas`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement sagas');
        }

        const data = await response.json();
        allSagas = data.sagas;

        renderSagas();
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des sagas', 'error');
    }
}

async function loadSaisons(sagaId) {
    try {
        const response = await fetch(`${API_BASE}/admin/saisons/saga/${sagaId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement saisons');
        }

        const data = await response.json();
        allSaisons = data.saisons;

        renderSaisons();
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des saisons', 'error');
    }
}

async function loadEpisodes(saisonId) {
    try {
        const response = await fetch(`${API_BASE}/admin/episodes/saison/${saisonId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement épisodes');
        }

        const data = await response.json();
        allEpisodes = data.episodes;

        renderEpisodes();
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des épisodes', 'error');
    }
}

// ========================================
// RENDU DES LISTES
// ========================================

function renderSagas() {
    const list = document.getElementById('sagas-list');

    if (allSagas.length === 0) {
        list.innerHTML = '<div class="empty-state">Aucune saga</div>';
        return;
    }

    list.innerHTML = allSagas.map(saga => `
        <li class="${selectedSagaId === saga.id ? 'selected' : ''}" onclick="selectSaga(${saga.id})">
            <div>
                <strong>${saga.title}</strong>
                ${saga.is_premium ? '<span class="premium-badge">👑</span>' : ''}
                <br>
                <small>${saga.type === 'serie' ? '📺 Série' : '🎬 Film'}</small>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); editSaga(${saga.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSaga(${saga.id})">🗑️</button>
            </div>
        </li>
    `).join('');
}

function renderSaisons() {
    const container = document.getElementById('saisons-container');

    if (allSaisons.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune saison</div>';
        return;
    }

    container.innerHTML = `
        <ul class="item-list">
            ${allSaisons.map(saison => `
                <li class="${selectedSaisonId === saison.id ? 'selected' : ''}" onclick="selectSaison(${saison.id})">
                    <div>
                        <strong>${saison.title}</strong>
                        ${saison.is_premium ? '<span class="premium-badge">👑</span>' : ''}
                        <br>
                        <small>Ordre: ${saison.order_index}</small>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); editSaison(${saison.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSaison(${saison.id})">🗑️</button>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderEpisodes() {
    const container = document.getElementById('episodes-container');

    if (allEpisodes.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun épisode</div>';
        return;
    }

    container.innerHTML = `
        <ul class="item-list">
            ${allEpisodes.map(episode => `
                <li>
                    <div>
                        <strong>Ep. ${episode.episode_number}: ${episode.title}</strong>
                        ${episode.is_premium ? '<span class="premium-badge">👑</span>' : ''}
                        <br>
                        <small>${episode.duration ? formatDuration(episode.duration) : 'N/A'}</small>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-primary" onclick="editEpisode(${episode.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteEpisode(${episode.id})">🗑️</button>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
}

// ========================================
// SÉLECTION
// ========================================

async function selectSaga(sagaId) {
    selectedSagaId = sagaId;
    selectedSaisonId = null;

    // Activer le bouton "Nouvelle Saison"
    document.getElementById('btn-new-saison').disabled = false;
    document.getElementById('btn-new-episode').disabled = true;

    // Rerender les sagas
    renderSagas();

    // Charger les saisons
    await loadSaisons(sagaId);

    // Vider les épisodes
    document.getElementById('episodes-container').innerHTML = '<div class="empty-state">Sélectionnez une saison</div>';
}

async function selectSaison(saisonId) {
    selectedSaisonId = saisonId;

    // Activer le bouton "Nouvel Épisode"
    document.getElementById('btn-new-episode').disabled = false;

    // Rerender les saisons
    renderSaisons();

    // Charger les épisodes
    await loadEpisodes(saisonId);
}

// ========================================
// MODALS - SAGA
// ========================================

function openSagaModal(sagaId = null) {
    const modal = document.getElementById('saga-modal');
    const form = document.getElementById('saga-form');
    const title = document.getElementById('saga-modal-title');

    form.reset();

    if (sagaId) {
        const saga = allSagas.find(s => s.id === sagaId);
        if (saga) {
            title.textContent = 'Modifier la Saga';
            document.getElementById('saga-id').value = saga.id;
            document.getElementById('saga-title').value = saga.title;
            document.getElementById('saga-description').value = saga.description || '';
            document.getElementById('saga-type').value = saga.type || 'serie';
            document.getElementById('saga-premium').checked = saga.is_premium === 1;
        }
    } else {
        title.textContent = 'Nouvelle Saga';
        document.getElementById('saga-id').value = '';
    }

    modal.classList.add('active');
}

function closeSagaModal() {
    document.getElementById('saga-modal').classList.remove('active');
}

function editSaga(sagaId) {
    openSagaModal(sagaId);
}

async function deleteSaga(sagaId) {
    if (!confirm('Supprimer cette saga et toutes ses saisons/épisodes ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/sagas/${sagaId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur suppression');
        }

        showNotification('Saga supprimée', 'success');
        await loadSagas();

        // Réinitialiser la sélection
        selectedSagaId = null;
        selectedSaisonId = null;
        document.getElementById('saisons-container').innerHTML = '<div class="empty-state">Sélectionnez une saga</div>';
        document.getElementById('episodes-container').innerHTML = '<div class="empty-state">Sélectionnez une saison</div>';

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ========================================
// MODALS - SAISON
// ========================================

function openSaisonModal(saisonId = null) {
    if (!selectedSagaId && !saisonId) {
        showNotification('Sélectionnez d\'abord une saga', 'warning');
        return;
    }

    const modal = document.getElementById('saison-modal');
    const form = document.getElementById('saison-form');
    const title = document.getElementById('saison-modal-title');

    form.reset();

    if (saisonId) {
        const saison = allSaisons.find(s => s.id === saisonId);
        if (saison) {
            title.textContent = 'Modifier la Saison';
            document.getElementById('saison-id').value = saison.id;
            document.getElementById('saison-title').value = saison.title;
            document.getElementById('saison-order').value = saison.order_index;
            document.getElementById('saison-description').value = saison.description || '';
            document.getElementById('saison-premium').checked = saison.is_premium === 1;
        }
    } else {
        title.textContent = 'Nouvelle Saison';
        document.getElementById('saison-id').value = '';
        document.getElementById('saison-order').value = allSaisons.length + 1;
    }

    modal.classList.add('active');
}

function closeSaisonModal() {
    document.getElementById('saison-modal').classList.remove('active');
}

function editSaison(saisonId) {
    openSaisonModal(saisonId);
}

async function deleteSaison(saisonId) {
    if (!confirm('Supprimer cette saison et tous ses épisodes ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/saisons/${saisonId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur suppression');
        }

        showNotification('Saison supprimée', 'success');
        await loadSaisons(selectedSagaId);

        // Réinitialiser la sélection de saison
        selectedSaisonId = null;
        document.getElementById('episodes-container').innerHTML = '<div class="empty-state">Sélectionnez une saison</div>';

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ========================================
// MODALS - ÉPISODE
// ========================================

function openEpisodeModal(episodeId = null) {
    if (!selectedSaisonId && !episodeId) {
        showNotification('Sélectionnez d\'abord une saison', 'warning');
        return;
    }

    const modal = document.getElementById('episode-modal');
    const form = document.getElementById('episode-form');
    const title = document.getElementById('episode-modal-title');

    form.reset();

    if (episodeId) {
        const episode = allEpisodes.find(e => e.id === episodeId);
        if (episode) {
            title.textContent = 'Modifier l\'Épisode';
            document.getElementById('episode-id').value = episode.id;
            document.getElementById('episode-title').value = episode.title;
            document.getElementById('episode-number').value = episode.episode_number;
            document.getElementById('episode-video-url').value = episode.video_url;
            document.getElementById('episode-subtitle-url').value = episode.subtitle_url || '';
            document.getElementById('episode-premium').checked = episode.is_premium === 1;
        }
    } else {
        title.textContent = 'Nouvel Épisode';
        document.getElementById('episode-id').value = '';
        document.getElementById('episode-number').value = allEpisodes.length + 1;
    }

    modal.classList.add('active');
}

function closeEpisodeModal() {
    document.getElementById('episode-modal').classList.remove('active');
}

function editEpisode(episodeId) {
    openEpisodeModal(episodeId);
}

async function deleteEpisode(episodeId) {
    if (!confirm('Supprimer cet épisode ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/episodes/${episodeId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erreur suppression');
        }

        showNotification('Épisode supprimé', 'success');
        await loadEpisodes(selectedSaisonId);

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ========================================
// FORMULAIRES
// ========================================

function initForms() {
    // Form Saga
    document.getElementById('saga-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const sagaId = document.getElementById('saga-id').value;
        const data = {
            title: document.getElementById('saga-title').value,
            description: document.getElementById('saga-description').value,
            type: document.getElementById('saga-type').value,
            is_premium: document.getElementById('saga-premium').checked,
            tagIds: []
        };

        try {
            const url = sagaId
                ? `${API_BASE}/admin/sagas/${sagaId}`
                : `${API_BASE}/admin/sagas`;

            const response = await fetch(url, {
                method: sagaId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Erreur sauvegarde');
            }

            showNotification('Saga enregistrée', 'success');
            closeSagaModal();
            await loadSagas();

        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    });

    // Form Saison
    document.getElementById('saison-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const saisonId = document.getElementById('saison-id').value;
        const data = {
            saga_id: selectedSagaId,
            title: document.getElementById('saison-title').value,
            order_index: parseInt(document.getElementById('saison-order').value),
            description: document.getElementById('saison-description').value,
            is_premium: document.getElementById('saison-premium').checked
        };

        try {
            const url = saisonId
                ? `${API_BASE}/admin/saisons/${saisonId}`
                : `${API_BASE}/admin/saisons`;

            const response = await fetch(url, {
                method: saisonId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Erreur sauvegarde');
            }

            showNotification('Saison enregistrée', 'success');
            closeSaisonModal();
            await loadSaisons(selectedSagaId);

        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    });

    // Form Épisode
    document.getElementById('episode-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const episodeId = document.getElementById('episode-id').value;
        const data = {
            saison_id: selectedSaisonId,
            title: document.getElementById('episode-title').value,
            episode_number: parseInt(document.getElementById('episode-number').value),
            video_url: document.getElementById('episode-video-url').value,
            subtitle_url: document.getElementById('episode-subtitle-url').value,
            is_premium: document.getElementById('episode-premium').checked
        };

        try {
            const url = episodeId
                ? `${API_BASE}/admin/episodes/${episodeId}`
                : `${API_BASE}/admin/episodes`;

            const response = await fetch(url, {
                method: episodeId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Erreur sauvegarde');
            }

            showNotification('Épisode enregistré', 'success');
            closeEpisodeModal();
            await loadEpisodes(selectedSaisonId);

        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    });
}

// ========================================
// UTILITAIRES
// ========================================

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info') {
    // Utiliser la fonction globale si elle existe
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}
