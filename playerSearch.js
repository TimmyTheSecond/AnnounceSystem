// playerSearch.js
let allPlayers = [];

function initPlayerSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const panel = document.getElementById('searchPanel');
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    const closeBtn = document.getElementById('closeSearch');

    searchBtn.addEventListener('click', () => {
        panel.classList.remove('hidden');
        input.focus();
        input.select();
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
    });

    // Close on escape
    document.addEventListener('keydown', e => {
        if (e.key === "Escape" && !panel.classList.contains('hidden')) {
            panel.classList.add('hidden');
        }
    });

    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        renderResults(term);
    });

    // Listen for player data from index.js
    window.addEventListener('playersUpdated', (e) => {
        allPlayers = e.detail || [];
    });
}

function renderResults(term) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (!term) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-8">Start typing a username...</p>`;
        return;
    }

    const filtered = allPlayers.filter(p => 
        p.username.toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-8">No players found</p>`;
        return;
    }

    filtered.forEach(player => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl mb-2 group";
        div.innerHTML = `
            <div>
                <div class="font-medium">${player.username}</div>
                <div class="text-sm text-zinc-400">${player.server || 'Unknown Server'}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="findPlayerOnMap('${player.username}')" 
                    class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm transition">
                    Find on Map
                </button>
                <button onclick="openRobloxProfile('${player.userId}')" 
                    class="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl text-sm transition">
                    Profile
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Global functions for inline onclick
window.findPlayerOnMap = function(username) {
    // This will be connected to your map logic in index.js
    console.log(`Finding ${username} on map...`);
    window.dispatchEvent(new CustomEvent('findPlayer', { detail: username }));
    document.getElementById('searchPanel').classList.add('hidden');
};

window.openRobloxProfile = function(userId) {
    if (userId) {
        window.open(`https://www.roblox.com/users/${userId}/profile`, '_blank');
    }
};

// Auto initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerSearch);
} else {
    initPlayerSearch();
}
