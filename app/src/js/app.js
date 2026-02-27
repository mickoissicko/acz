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
            console.error(err);
        }
    },

    setupTabs() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                const target = item.dataset.tab;
                if(!target) return;
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
            const displayName = item.alias || item.name;
            if (filter && !displayName.toLowerCase().includes(filter.toLowerCase())) return;

            const card = document.createElement('div');
            card.className = 'manga-card';
            
            const progress = localStorage.getItem(`progress_${item.path}`) || 0;
            const thumbUrl = item.meta?.coverFile ? item.meta.coverFile : item.path;
            const coverPage = item.meta?.coverPage !== undefined ? item.meta.coverPage : progress;
            
            card.style.backgroundImage = `url('/render-manga?file=${encodeURIComponent(thumbUrl)}&page=${coverPage}')`;

            card.innerHTML = `
                <div class="card-overlay">
                    <p>${item.items ? item.items.length + ' Volumes' : 'Standalone'}</p>
                    <h3>${displayName}</h3>
                </div>
                ${item.items ? '<div class="collection-tag">COLLECTION</div>' : ''}
            `;

            if (!item.items) {
                card.draggable = true;
                card.ondragstart = (e) => e.dataTransfer.setData('sourcePath', item.path);
            } else {
                card.ondragover = (e) => {
                    e.preventDefault();
                    card.style.borderColor = 'var(--accent)';
                };
                card.ondragleave = () => card.style.borderColor = 'var(--border)';
                card.ondrop = async (e) => {
                    e.preventDefault();
                    card.style.borderColor = 'var(--border)';
                    const source = e.dataTransfer.getData('sourcePath');
                    if (source) {
                        await fetch('/api/move', {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ source, targetDir: item.path })
                        });
                        this.init();
                    }
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
        grid.innerHTML = '';
        
        const backBtn = document.createElement('div');
        backBtn.className = 'btn-premium';
        backBtn.style.gridColumn = "1/-1";
        backBtn.style.width = "fit-content";
        backBtn.style.marginBottom = "20px";
        backBtn.innerText = "← Back to Library";
        backBtn.onclick = () => this.renderManga();
        grid.appendChild(backBtn);

        col.items.forEach(m => {
            const mCard = document.createElement('div');
            mCard.className = 'manga-card';
            const prog = localStorage.getItem(`progress_${m.path}`) || 0;
            mCard.style.backgroundImage = `url('/render-manga?file=${encodeURIComponent(m.path)}&page=${prog}')`;
            mCard.innerHTML = `<div class="card-overlay"><h3>${m.alias || m.name}</h3></div>`;
            mCard.onclick = (e) => {
                e.stopPropagation();
                Reader.open(m.path, prog, false, col.path);
            };
            grid.appendChild(mCard);
        });
    },

    setupSearch() {
        const input = document.getElementById('SearchInput');
        if(input) input.oninput = (e) => this.renderManga(e.target.value);
    }
};

UI.init();