const CORE = {
    state: {
        activeTab: 'mangas',
        library: {},
        notes: [],
        currentManga: null,
        currentPage: 0
    },

    async init() {
        await this.loadLibrary();
        this.bindEvents();
        this.switchTab('mangas');
    },

    async loadLibrary() {
        const res = await fetch('/api/library');
        this.state.library = await res.json();
    },

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });

        // Keyboard Reader
        window.onkeydown = (e) => {
            if (document.getElementById('ReaderOverlay').style.display === 'flex') {
                if (e.key === "ArrowRight") this.nextPage();
                if (e.key === "ArrowLeft") this.prevPage();
                if (e.key === "Escape") this.closeReader();
            }
        };
    },

    switchTab(tabId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        
        document.getElementById(`${tabId}View`).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        if (tabId === 'mangas') this.renderMangas(this.state.library);
        if (tabId === 'notes') this.loadNotes();
    },

    // --- idk i stole all this lol ... so ya ---
    renderMangas(data, isSub = false) {
        const grid = document.getElementById('MangaGrid');
        grid.innerHTML = isSub ? `<div class="card" onclick="CORE.renderMangas(CORE.state.library)"><h3>← Back</h3></div>` : '';

        Object.entries(data).forEach(([cat, items]) => {
            const list = Array.isArray(items) ? items : [items];
            list.forEach(item => {
                const savedPage = localStorage.getItem(`progress_${item.path}`) || 0;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${item.name}</h3>
                    <p style="font-size:12px; color:var(--text-dim)">${item.isCollection ? 'Collection' : 'Page ' + (parseInt(savedPage)+1)}</p>
                    ${!item.isCollection ? `<div class="progress-bar" style="width: 100%"></div>` : ''}
                `;
                card.onclick = () => item.isCollection ? this.renderMangas(item.items, true) : this.openReader(item.path);
                grid.appendChild(card);
            });
        });
    },

    openReader(path) {
        this.state.currentManga = path;
        this.state.currentPage = parseInt(localStorage.getItem(`progress_${path}`)) || 0;
        document.getElementById('ReaderOverlay').style.display = 'flex';
        document.getElementById('TopBar').classList.add('collapsed');
        this.updateReader();
    },

    updateReader() {
        const img = document.getElementById('ReaderImg');
        img.src = `/render-manga?file=${encodeURIComponent(this.state.currentManga)}&page=${this.state.currentPage}`;
        document.getElementById('PageInfo').innerText = `Page ${this.state.currentPage + 1}`;
        localStorage.setItem(`progress_${this.state.currentManga}`, this.state.currentPage);
    },

    nextPage() { this.state.currentPage++; this.updateReader(); },
    prevPage() { if(this.state.currentPage > 0) { this.state.currentPage--; this.updateReader(); } },
    closeReader() { 
        document.getElementById('ReaderOverlay').style.display = 'none'; 
        document.getElementById('TopBar').classList.remove('collapsed');
        this.renderMangas(this.state.library); 
    },

    // --- for the notes thingy ---
    async loadNotes() {
        const res = await fetch('/api/notes');
        const notes = await res.json();
        const list = document.getElementById('NotesList');
        list.innerHTML = `<button onclick="CORE.newNote()" class="card" style="width:100%; margin-bottom:10px;">+ New Note</button>`;
        notes.forEach(n => {
            const div = document.createElement('div');
            div.className = 'note-item';
            div.innerText = n.title;
            div.onclick = () => this.openNote(n.id);
            list.appendChild(div);
        });
    },

    async openNote(id) {
        const res = await fetch(`/api/notes/${id}`);
        const data = await res.json();
        document.getElementById('NoteEditor').value = data.content;
        document.getElementById('NoteEditor').dataset.currentTitle = id.replace('.txt', '');
    },

    async saveNote() {
        const title = document.getElementById('NoteEditor').dataset.currentTitle || prompt("Note Title:");
        const content = document.getElementById('NoteEditor').value;
        if (!title) return;
        await fetch('/api/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, content })
        });
        this.loadNotes();
    },

    newNote() {
        document.getElementById('NoteEditor').value = '';
        document.getElementById('NoteEditor').dataset.currentTitle = '';
        document.getElementById('NoteEditor').focus();
    }
};

CORE.init();