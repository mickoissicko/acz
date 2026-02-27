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
        return Content.split('\n').filter(Line => Line.trim() !== '');
    } catch (Err) {
        return [];
    }
});

FASTIFY.get('/api/content', async (Request, Reply) => {
    const { path: LibraryPath } = Request.query;
    try {
        const Items = await FS.readdir(LibraryPath, { withFileTypes: true });
        const Response = { Recent: [], Collections: {} };

        for (const Item of Items) {
            const FullPath = PATH.join(LibraryPath, Item.name);
            
            if (Item.isDirectory() && Item.name.startsWith('c-')) {
                const CollectionName = Item.name.replace('c-', '');
                const Files = await FS.readdir(FullPath);
                Response.Collections[CollectionName] = Files
                    .filter(F => COMIC_EXTENSIONS.includes(PATH.extname(F).toLowerCase()))
                    .map(F => ({
                        Title: PATH.parse(F).name,
                        FileName: F,
                        ParentDir: Item.name,
                        ThumbnailUrl: `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(PATH.join(FullPath, F))}`
                    }));
            } else if (COMIC_EXTENSIONS.includes(PATH.extname(Item.name).toLowerCase())) {
                Response.Recent.push({
                    Title: PATH.parse(Item.name).name,
                    FileName: Item.name,
                    ThumbnailUrl: `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(FullPath)}`
                });
            }
        }
        return Response;
    } catch (Err) {
        Reply.status(500).send({ Error: "Path unreachable" });
    }
});

FASTIFY.get('/api/thumbnail', async (Request, Reply) => {
    const { path: FullPath } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        const Entries = Zip.getEntries();
        const FirstImage = Entries.find(E => IMAGE_EXTENSIONS.includes(PATH.extname(E.entryName).toLowerCase()));
        if (FirstImage) return Reply.type('image/jpeg').send(FirstImage.getData());
        Reply.status(404).send();
    } catch (Err) { Reply.status(500).send(); }
});

const START = async () => {
    try { await FASTIFY.listen({ port: 3000 }); } 
    catch (Err) { process.exit(1); }
};
START();