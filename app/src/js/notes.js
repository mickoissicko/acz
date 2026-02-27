const Notes = {
    state: { currentNote: null, timeout: null },

    async load() {
        const res = await fetch('/api/notes');
        const list = await res.json();
        const container = document.getElementById('NotesList');
        container.innerHTML = '<h3>Notes</h3>';

        list.forEach(note => {
            const el = document.createElement('div');
            el.className = 'note-item';
            el.innerText = note.title;
            el.onclick = () => this.open(note.id);
            container.appendChild(el);
        });
    },

    async open(id) {
        const res = await fetch(`/api/notes/${id}`);
        const data = await res.json();
        this.state.currentNote = id;
        
        const editor = document.getElementById('NoteEditor');
        editor.value = data.content;
        
        editor.oninput = () => {
            clearTimeout(this.state.timeout);
            this.state.timeout = setTimeout(() => this.save(), 800);
        };
    },

    async save() {
        if (!this.state.currentNote) return;
        await fetch('/api/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                title: this.state.currentNote.replace('.txt', ''), 
                content: document.getElementById('NoteEditor').value 
            })
        });
    }
};