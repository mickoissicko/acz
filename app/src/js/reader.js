const Reader = {
    state: { currentPath: null, currentPage: 0, isCollection: false, parentPath: null },

    open(path, page = 0, isCol = false, parent = null) {
        this.state = { currentPath: path, currentPage: parseInt(page), isCollection: isCol, parentPath: parent };
        document.getElementById('ReaderOverlay').classList.add('active');
        this.render();
    },

    async render() {
        const img = document.getElementById('ReaderImg');
        // Update the UI
        img.src = `/render-manga?file=${encodeURIComponent(this.state.currentPath)}&page=${this.state.currentPage}`;

        localStorage.setItem(`progress_${this.state.currentPath}`, this.state.currentPage);

        document.getElementById('PageInfo').innerText = `Page ${this.state.currentPage + 1}`;
    },

    next() { this.state.currentPage++; this.render(); },
    prev() { if(this.state.currentPage > 0) { this.state.currentPage--; this.render(); } },

    async setAsCover() {
        if (!this.state.parentPath) return alert("Open this from a collection to set cover.");
        
        await fetch('/api/collections/cover', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                collectionPath: this.state.parentPath, 
                coverFile: this.state.currentPath, 
                coverPage: this.state.currentPage 
            })
        });
        alert("Cover updated!");
    },

    close() {
        document.getElementById('ReaderOverlay').classList.remove('active');
        UI.init(); // Refresh main library to show new progress/covers
    }
};

window.addEventListener('keydown', (e) => {
    if (!document.getElementById('ReaderOverlay').classList.contains('active')) return;
    if (e.key === 'ArrowRight') Reader.next();
    if (e.key === 'ArrowLeft') Reader.prev();
    if (e.key === 'Escape') Reader.close();
});