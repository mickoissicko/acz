const FASTIFY = require('fastify')({ logger: false });
const FS = require('fs').promises;
const PATH = require('path');
const CORS = require('@fastify/cors');
const ADM_ZIP = require('adm-zip');

const CONFIG_FILE = "lib.txt";
const COMIC_EXTENSIONS = ['.zip', '.cbz'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

FASTIFY.register(CORS, { origin: '*' });

FASTIFY.get('/api/libraries', async (Request, Reply) => {
    try {
        const Content = await FS.readFile(CONFIG_FILE, 'utf8');
        return Content.split('\n').map(L => L.trim()).filter(L => L !== '');
    } catch (Err) { return []; }
});

FASTIFY.get('/api/content', async (Request, Reply) => {
    const { path: LibraryPath } = Request.query;
    if (!LibraryPath) return Reply.status(400).send({ Error: "No skibidi sigma?" });
    try {
        const Items = await FS.readdir(LibraryPath, { withFileTypes: true });
        const Response = { Recent: [], Collections: {} };
        for (const Item of Items) {
            const FullPath = PATH.join(LibraryPath, Item.name);
            if (Item.isDirectory() && Item.name.startsWith('c-')) {
                const CollectionName = Item.name.replace('c-', '');
                const SubFiles = await FS.readdir(FullPath);
                Response.Collections[CollectionName] = SubFiles
                    .filter(F => COMIC_EXTENSIONS.includes(PATH.extname(F).toLowerCase()))
                    .map(F => ({
                        Title: PATH.parse(F).name,
                        FileName: F,
                        FullPath: PATH.join(FullPath, F),
                        ThumbnailUrl: `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(PATH.join(FullPath, F))}`
                    }));
            } else if (COMIC_EXTENSIONS.includes(PATH.extname(Item.name).toLowerCase())) {
                Response.Recent.push({
                    Title: PATH.parse(Item.name).name,
                    FileName: Item.name,
                    FullPath: FullPath,
                    ThumbnailUrl: `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(FullPath)}`
                });
            }
        }
        return Response;
    } catch (Err) { Reply.status(500).send({ Error: "Path Error" }); }
});

FASTIFY.get('/api/thumbnail', async (Request, Reply) => {
    const { path: FullPath, page: PageName } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        let Entry;
        
        if (PageName && PageName !== 'undefined') {
            Entry = Zip.getEntry(PageName);
        } 
        
        if (!Entry) {
            Entry = Zip.getEntries().find(E => IMAGE_EXTENSIONS.includes(PATH.extname(E.entryName).toLowerCase()));
        }

        if (Entry) return Reply.type('image/jpeg').send(Entry.getData());
        Reply.status(404).send();
    } catch (Err) { Reply.status(500).send(); }
});

FASTIFY.get('/api/read', async (Request, Reply) => {
    const { path: FullPath } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        const PageNames = Zip.getEntries()
            .filter(E => IMAGE_EXTENSIONS.includes(PATH.extname(E.entryName).toLowerCase()))
            .sort((A, B) => A.entryName.localeCompare(B.entryName, undefined, { numeric: true }))
            .map(E => E.entryName);
            
        return { PageNames };
    } catch (Err) { Reply.status(500).send(); }
});

FASTIFY.get('/api/page', async (Request, Reply) => {
    const { path: FullPath, page: PageName } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        const Entry = Zip.getEntry(PageName);
        if (Entry) {
            const Buffer = Entry.getData();
            return Reply.type('image/jpeg').send(Buffer);
        }
        Reply.status(404).send();
    } catch (Err) { Reply.status(500).send(); }
});

const START = async () => {
    try { await FASTIFY.listen({ port: 3000 }); console.log("The skibidi has taxxed your fanum moggedly"); } 
    catch (Err) { process.exit(1); }
};
START();
