const EXPRESS = require('express');
const PATH = require('path');
const FS = require('fs');
const ADM_ZIP = require('adm-zip');

const APP = EXPRESS();
const PORT = 3000;
const NOTES_DIR = PATH.join(__dirname, 'notes');

if (!FS.existsSync(NOTES_DIR)) FS.mkdirSync(NOTES_DIR);

APP.use(EXPRESS.static(PATH.join(__dirname, 'src')));
APP.use(EXPRESS.json());

// --- MANGA API ---
APP.get('/api/library', (Req, Res) => {
    const CONFIG_PATH = PATH.join(__dirname, 'config.acz.mix');
    if (!FS.existsSync(CONFIG_PATH)) return Res.json({});
    const Raw = FS.readFileSync(CONFIG_PATH, 'utf-8');
    let Library = {};
    let CurrentSection = "GLOBAL";

    Raw.split('\n').forEach(Line => {
        let Clean = Line.trim();
        if (!Clean || Clean.startsWith('#')) return;
        if (Clean.startsWith('[') && Clean.endsWith(']')) {
            CurrentSection = Clean.substring(1, Clean.length - 1);
            Library[CurrentSection] = [];
        } else if (Clean.includes(':')) {
            let [Name, TargetPath] = Clean.split(':').map(s => s.trim().replace(/^["']|["']$/g, ""));
            if (FS.existsSync(TargetPath) && FS.lstatSync(TargetPath).isDirectory()) {
                let Files = FS.readdirSync(TargetPath).filter(f => f.match(/\.(zip|cbz)$/i))
                    .map(f => ({ name: f.replace(/\.(zip|cbz)$/i, ""), path: PATH.join(TargetPath, f) }));
                Library[CurrentSection].push({ name: Name, isCollection: true, items: Files });
            } else {
                Library[CurrentSection].push({ name: Name, isCollection: false, path: TargetPath });
            }
        }
    });
    Res.json(Library);
});

APP.get('/render-manga', (Req, Res) => {
    try {
        let Zip = new ADM_ZIP(Req.query.file);
        let Entries = Zip.getEntries().filter(e => !e.isDirectory && e.entryName.match(/\.(jpg|jpeg|png|webp|avif)$/i))
            .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, {numeric: true}));
        if (Entries[Req.query.page]) {
            Res.contentType('image/jpeg');
            Res.send(Entries[Req.query.page].getData());
        } else { Res.status(404).send("End"); }
    } catch (e) { Res.status(500).send("Err"); }
});

// --- NOTES API ---
APP.get('/api/notes', (Req, Res) => {
    let Files = FS.readdirSync(NOTES_DIR).map(f => ({ id: f, title: f.replace('.txt', '') }));
    Res.json(Files);
});

APP.get('/api/notes/:id', (Req, Res) => {
    let Content = FS.readFileSync(PATH.join(NOTES_DIR, Req.params.id), 'utf-8');
    Res.json({ content: Content });
});

APP.post('/api/notes', (Req, Res) => {
    let { title, content } = Req.body;
    FS.writeFileSync(PATH.join(NOTES_DIR, `${title}.txt`), content);
    Res.json({ success: true });
});

APP.get('/', (Req, Res) => {
    Res.sendFile(PATH.join(__dirname, 'src', 'index.html'));
});

APP.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));