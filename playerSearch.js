// playerSearch.js - Clean & Reliable
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
    panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });

    document.addEventListener('keydown', e => {
        if (e.key === "Escape") closePanel();
    });

    input.addEventListener('input', () => renderResults(input.value.toLowerCase().trim()));

    window.addEventListener('playersUpdated', (e) => {
        allPlayers = e.detail || [];
    });
}

function getServerNameForPlayer(player) {
    if (!player?.userId) return "Unknown Server";

    const serverData = window.state?.serverData || state?.serverData;

    if (!serverData) return "Unknown Server";

    const targetId = String(player.userId);

    for (const [jobId, data] of Object.entries(serverData)) {
        const players = data.players;

        if (!Array.isArray(players)) continue;

        const found = players.some(p =>
            String(p.userId) === targetId
        );

        if (found) {
            return jobId.length > 10
                ? `${jobId.slice(-8)}`
                : `${jobId}`;
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
        .filter(p => p.username?.toLowerCase().includes(lowerTerm))
        .sort((a, b) => {
            const nameA = a.username.toLowerCase();
            const nameB = b.username.toLowerCase();
            if (nameA === lowerTerm) return -1;
            if (nameB === lowerTerm) return 1;
            if (nameA.startsWith(lowerTerm) && !nameB.startsWith(lowerTerm)) return -1;
            if (!nameA.startsWith(lowerTerm) && nameB.startsWith(lowerTerm)) return 1;
            return nameA.localeCompare(nameB);
        });

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-10">No players found</p>`;
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

window.findPlayerOnMap = function(username) {
    const panel = document.getElementById('searchPanel');
    panel.style.opacity = '0';
    setTimeout(() => panel.classList.add('hidden'), 300);

    window.dispatchEvent(new CustomEvent('findPlayer', { detail: username }));
};

window.openRobloxProfile = function(userId) {
    if (userId) window.open(`https://www.roblox.com/users/${userId}/profile`, '_blank');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerSearch);
} else {
    initPlayerSearch();
}
