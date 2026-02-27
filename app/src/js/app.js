const UI = {
    state: { library: null },

    async init() {
        try {
            const res = await fetch('/api/library');
            this.state.library = await res.json();
            this.setupTabs();
            this.renderManga();
            this.setupSearch();
        } catch (err) {
            console.error("Failed to load library:", err);
        }
    },

    setupTabs() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                const target = item.dataset.tab;
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(target + 'View').classList.add('active');
                
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (target === 'notes') Notes.load();
            };
        });
    },

    renderManga(filter = "") {
        const grid = document.getElementById('MangaGrid');
        grid.innerHTML = '';

        const all = [...this.state.library.collections, ...this.state.library.mangas];

        all.forEach(item => {
            if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

            const card = document.createElement('div');
            card.className = 'manga-card';
            
            const progress = localStorage.getItem(`progress_${item.path}`) || 0;
            const thumbUrl = item.meta?.coverFile ? item.meta.coverFile : item.path;
            const coverPage = item.meta?.coverPage !== undefined ? item.meta.coverPage : progress;
            
            card.style.backgroundImage = `url('/render-manga?file=${encodeURIComponent(thumbUrl)}&page=${coverPage}')`;

            card.innerHTML = `
                <div class="card-info">
                    <h3>${item.name}</h3>
                    <small>${item.items ? item.items.length + ' Volumes' : 'Single Issue'}</small>
                </div>
            `;

            // Drag and Drop support
            if (!item.items) {
                card.draggable = true;
                card.ondragstart = (e) => e.dataTransfer.setData('source', item.path);
            } else {
                card.ondragover = (e) => e.preventDefault();
                card.ondrop = async (e) => {
                    const source = e.dataTransfer.getData('source');
                    await fetch('/api/move', {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ source, targetDir: item.path })
                    });
                    this.init();
                };
            }

            card.onclick = () => {
                if (item.items) this.renderCollection(item);
                else Reader.open(item.path, progress);
            };
            
            grid.appendChild(card);
        });
    },

    renderCollection(col) {
        const grid = document.getElementById('MangaGrid');
        grid.innerHTML = `<div class="back-btn" onclick="UI.renderManga()">← Back to Library</div>`;
        col.items.forEach(m => {
            const mCard = document.createElement('div');
            mCard.className = 'manga-card';
            const prog = localStorage.getItem(`progress_${m.path}`) || 0;
            mCard.style.backgroundImage = `url('/render-manga?file=${encodeURIComponent(m.path)}&page=${prog}')`;
            mCard.onclick = (e) => {
                e.stopPropagation();
                Reader.open(m.path, prog, false, col.path);
            };
            grid.appendChild(mCard);
        });
    },

    setupSearch() {
        document.getElementById('SearchInput').oninput = (e) => this.renderManga(e.target.value);
    }
};

UI.init();