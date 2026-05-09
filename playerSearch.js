// playerSearch.js - Priority Search (Exact → Starts With → Contains)
let allPlayers = [];

function initPlayerSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const panel = document.getElementById('searchPanel');
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    const closeBtn = document.getElementById('closeSearch');

    searchBtn.addEventListener('click', () => {
        panel.classList.remove('hidden');
        setTimeout(() => panel.style.opacity = '1', 10);
        input.focus();
    });

    function closePanel() {
        panel.style.opacity = '0';
        setTimeout(() => panel.classList.add('hidden'), 300);
    }

    closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('click', e => {
        if (e.target === panel) closePanel();
    });

    document.addEventListener('keydown', e => {
        if (e.key === "Escape") closePanel();
    });

    input.addEventListener('input', () => {
        renderResults(input.value.toLowerCase().trim());
    });

    window.addEventListener('playersUpdated', (e) => {
        allPlayers = e.detail || [];
    });
}

function getServerNameForPlayer(player) {
    if (!player) return "Unknown Server";
    
    for (const [jobId, serverInfo] of Object.entries(window.state?.serverData || {})) {
        if (serverInfo.players?.some(p => p.userId === player.userId)) {
            return jobId.length > 8 ? `Server ${jobId.slice(-6)}` : `Server ${jobId}`;
        }
    }
    return "Unknown Server";
}

function renderResults(term) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (!term) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-10">Start typing a username...</p>`;
        return;
    }

    const lowerTerm = term.toLowerCase();

    const filtered = allPlayers
        .filter(p => p.username && p.username.toLowerCase().includes(lowerTerm))
        .sort((a, b) => {
            const nameA = a.username.toLowerCase();
            const nameB = b.username.toLowerCase();

            // 1. Exact match gets highest priority
            if (nameA === lowerTerm) return -1;
            if (nameB === lowerTerm) return 1;

            // 2. Starts with the search term
            const startsA = nameA.startsWith(lowerTerm);
            const startsB = nameB.startsWith(lowerTerm);
            if (startsA && !startsB) return -1;
            if (!startsA && startsB) return 1;

            // 3. Contains (but doesn't start with) - alphabetical
            return nameA.localeCompare(nameB);
        });

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-10">No players found for "<span class="text-white">${term}</span>"</p>`;
        return;
    }

    filtered.forEach(player => {
        const serverName = getServerNameForPlayer(player);

        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl mb-2 transition";
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-lg">${player.username}</div>
                <div class="text-sm text-zinc-400">${serverName}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="findPlayerOnMap('${player.username}')" 
                    class="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl text-sm transition">
                    Find on Map
                </button>
                <button onclick="openRobloxProfile('${player.userId}')" 
                    class="bg-zinc-700 hover:bg-zinc-600 px-5 py-2.5 rounded-xl text-sm transition">
                    Profile
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Global functions
window.findPlayerOnMap = function(username) {
    const panel = document.getElementById('searchPanel');
    panel.style.opacity = '0';
    setTimeout(() => panel.classList.add('hidden'), 300);
    
    window.dispatchEvent(new CustomEvent('findPlayer', { detail: username }));
};

window.openRobloxProfile = function(userId) {
    if (userId) window.open(`https://www.roblox.com/users/${userId}/profile`, '_blank');
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerSearch);
} else {
    initPlayerSearch();
}
