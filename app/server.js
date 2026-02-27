const express = require('express');
const path = require('path');
const fs = require('fs');
const admZip = require('adm-zip');

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, 'config.acz.mix');

app.use(express.json());
// Serve static files from the /src directory
app.use(express.static(path.join(__dirname, 'src')));

/**
 * CONFIG PARSER
 * Extracts paths from the .mix file
 */
function getPathFromConfig(section) {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const lines = content.split(/\r?\n/);
    let currentSection = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1);
        } else if (currentSection === section && line.startsWith('Path:')) {
            return line.split('Path:')[1].trim().replace(/^["']|["']$/g, "");
        }
    }
    return null;
}

/**
 * LIBRARY API
 * Scans the Manga directory and filters out the Notes directory
 */
app.get('/api/library', (req, res) => {
    const mangaPath = getPathFromConfig('MANGA');
    const notesPath = getPathFromConfig('NOTES');

    if (!mangaPath || !fs.existsSync(mangaPath)) {
        return res.status(500).json({ error: "Manga path not found in config" });
    }

    // Identify the name of the notes folder to ignore it
    const notesFolderName = notesPath ? path.basename(notesPath) : null;

    const library = { collections: [], mangas: [] };
    const items = fs.readdirSync(mangaPath);

    items.forEach(item => {
        // Ignore hidden files and the specific Notes folder
        if (item.startsWith('.') || item === notesFolderName) return;

        const fullPath = path.join(mangaPath, item);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            const metaPath = path.join(fullPath, 'meta.json');
            const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : { color: '#7c4dff' };
            
            const files = fs.readdirSync(fullPath)
                .filter(f => f.match(/\.(zip|cbz)$/i))
                .map(f => ({ name: f.replace(/\.(zip|cbz)$/i, ""), path: path.join(fullPath, f) }));
            
            library.collections.push({ name: item, path: fullPath, items: files, meta });
        } else if (item.match(/\.(zip|cbz)$/i)) {
            library.mangas.push({ name: item.replace(/\.(zip|cbz)$/i, ""), path: fullPath });
        }
    });

    res.json(library);
});

/**
 * MANGA RENDERING
 * Extracts specific pages from Zip/CBZ on the fly
 */
app.get('/render-manga', (req, res) => {
    const { file, page } = req.query;
    if (!file) return res.status(400).send("No file specified");

    try {
        const zip = new admZip(file);
        const entries = zip.getEntries()
            .filter(e => !e.isDirectory && e.entryName.match(/\.(jpg|jpeg|png|webp|avif)$/i))
            .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

        const index = parseInt(page) || 0;
        if (entries[index]) {
            res.contentType('image/jpeg');
            res.send(entries[index].getData());
        } else {
            res.status(404).send("Page not found");
        }
    } catch (err) {
        res.status(500).send("Error rendering page");
    }
});

/**
 * MOVE FILE (Drag & Drop)
 */
app.put('/api/move', (req, res) => {
    const { source, targetDir } = req.body;
    try {
        const dest = path.join(targetDir, path.basename(source));
        fs.renameSync(source, dest);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * COLLECTION COVER PERSISTENCE
 */
app.put('/api/collections/cover', (req, res) => {
    const { collectionPath, coverFile, coverPage } = req.body;
    const metaPath = path.join(collectionPath, 'meta.json');
    let meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath)) : {};
    
    meta.coverFile = coverFile;
    meta.coverPage = coverPage;
    
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    res.json({ success: true });
});

/**
 * NOTES API
 */
app.get('/api/notes', (req, res) => {
    const notesPath = getPathFromConfig('NOTES');
    if (!notesPath || !fs.existsSync(notesPath)) return res.json([]);
    
    const files = fs.readdirSync(notesPath)
        .filter(f => f.endsWith('.txt'))
        .map(f => ({ id: f, title: f.replace('.txt', '') }));
    res.json(files);
});

app.get('/api/notes/:id', (req, res) => {
    const notesPath = getPathFromConfig('NOTES');
    const fullPath = path.join(notesPath, req.params.id);
    if (fs.existsSync(fullPath)) {
        res.json({ content: fs.readFileSync(fullPath, 'utf-8') });
    } else {
        res.status(404).send("Note not found");
    }
});

app.post('/api/notes', (req, res) => {
    const notesPath = getPathFromConfig('NOTES');
    const { title, content } = req.body;
    fs.writeFileSync(path.join(notesPath, `${title}.txt`), content);
    res.json({ success: true });
});

/**
 * ROOT ROUTE
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// --- ADD THESE TO SERVER.JS ---

// CREATE COLLECTION
app.post('/api/collections', (req, res) => {
    const mangaPath = getPathFromConfig('MANGA');
    const newDir = path.join(mangaPath, req.body.name);
    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir);
        fs.writeFileSync(path.join(newDir, 'meta.json'), JSON.stringify({ color: '#00e5ff' }));
    }
    res.json({ success: true });
});

// RENAME COLLECTION
app.put('/api/collections/rename', (req, res) => {
    const { path: oldPath, newName } = req.body;
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);
    fs.renameSync(oldPath, newPath);
    res.json({ success: true });
});

app.put('/api/manga/rename', (req, res) => {
    const { path: mangaPath, newName } = req.body;
    const parentDir = path.dirname(mangaPath);
    const metaPath = path.join(parentDir, 'meta.json');
    
    let meta = {};
    if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    // alias w/ filename
    if (!meta.aliases) meta.aliases = {};
    const fileName = path.basename(mangaPath);
    meta.aliases[fileName] = newName;

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`skibid`);
});