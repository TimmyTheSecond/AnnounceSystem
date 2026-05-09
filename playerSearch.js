// playerSearch.js
let allPlayers = [];

function initPlayerSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const panel = document.getElementById('searchPanel');
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    const closeBtn = document.getElementById('closeSearch');

    // Open panel
    searchBtn.addEventListener('click', () => {
        panel.classList.remove('hidden');
        // Trigger fade in
        setTimeout(() => {
            panel.style.opacity = '1';
        }, 10);
        input.focus();
    });

    // Close panel
    closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('click', (e) => {
        if (e.target === panel) closePanel();
    });

    function closePanel() {
        panel.style.opacity = '0';
        setTimeout(() => {
            panel.classList.add('hidden');
        }, 300);
    }

    // Keyboard support
    document.addEventListener('keydown', e => {
        if (e.key === "Escape" && !panel.classList.contains('hidden')) {
            closePanel();
        }
    });

    // Search input
    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        renderResults(term);
    });

    // Listen for live player updates from your main script
    window.addEventListener('playersUpdated', (e) => {
        allPlayers = e.detail || [];
    });

    console.log("✅ Player Search initialized");
}

function renderResults(term) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (!term) {
        container.innerHTML = `<p class="text-zinc-500 text-center py-10">Start typing a username...</p>`;
        return;
    }

    const filtered = allPlayers.filter(p => 
        p.username && p.username.toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <p class="text-zinc-500 text-center py-10">
                No players found for "<span class="text-white">${term}</span>"
            </p>`;
        return;
    }

    filtered.forEach(player => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl mb-2 transition";
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-lg">${player.username}</div>
                <div class="text-sm text-zinc-400">${player.server || 'Unknown Server'}</div>
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
    document.getElementById('searchPanel').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('searchPanel').classList.add('hidden');
    }, 300);
    
    window.dispatchEvent(new CustomEvent('findPlayer', { 
        detail: username 
    }));
};

window.openRobloxProfile = function(userId) {
    if (userId) {
        window.open(`https://www.roblox.com/users/${userId}/profile`, '_blank');
    }
};

// Auto start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerSearch);
} else {
    initPlayerSearch();
}
