const Reader = {
    state: { currentPath: null, currentPage: 0, parentPath: null },

    open(path, page = 0, isCol = false, parent = null) {
        this.state = { currentPath: path, currentPage: parseInt(page), parentPath: parent };
        document.getElementById('ReaderOverlay').classList.add('active');
        this.render();
    },

    render() {
        const img = document.getElementById('ReaderImg');
        img.src = `/render-manga?file=${encodeURIComponent(this.state.currentPath)}&page=${this.state.currentPage}`;
        localStorage.setItem(`progress_${this.state.currentPath}`, this.state.currentPage);
        document.getElementById('PageInfo').innerText = `Page ${this.state.currentPage + 1}`;
    },

    next() { this.state.currentPage++; this.render(); },
    prev() { if(this.state.currentPage > 0) { this.state.currentPage--; this.render(); } },

    async setAsCover() {
        if (!this.state.parentPath) return alert("Open a volume from inside a collection to set the cover.");
        await fetch('/api/collections/cover', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                collectionPath: this.state.parentPath, 
                coverFile: this.state.currentPath, 
                coverPage: this.state.currentPage 
            })
        });
        alert("Collection cover updated!");
    },

    close() {
        document.getElementById('ReaderOverlay').classList.remove('active');
        UI.init(); 
    }
};

window.addEventListener('keydown', (e) => {
    if (!document.getElementById('ReaderOverlay').classList.contains('active')) return;
    if (e.key === 'ArrowRight' || e.key === ' ') Reader.next();
    if (e.key === 'ArrowLeft') Reader.prev();
    if (e.key === 'Escape') Reader.close();
});