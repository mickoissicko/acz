const FASTIFY_INSTANCE = require('fastify')({ logger: false });
const FS = require('fs').promises;
const PATH = require('path');
const CORS = require('@fastify/cors');
const ADM_ZIP = require('adm-zip');

// Constants
const CONFIG_FILE = "lib.txt";
const COMIC_EXTENSIONS = ['.zip', '.cbz'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

FASTIFY_INSTANCE.register(CORS, { origin: '*' });

/**
 * Retrieves the list of library paths from the configuration file.
 */
FASTIFY_INSTANCE.get('/api/libraries', async (Request, Reply) => {
    try {
        const Content = await FS.readFile(CONFIG_FILE, 'utf8');
        const Libraries = Content.split('\n').map(L => L.trim()).filter(L => L !== '');
        return Libraries;
    } catch (Err) {
        console.error("Error reading libraries:", Err);
        return [];
    }
});

/**
 * Scans a library path for collections and individual comic files.
 * Loose files are automatically grouped into an 'Uncategorised' collection.
 */
FASTIFY_INSTANCE.get('/api/content', async (Request, Reply) => {
    const { path: LibraryPath } = Request.query;
    if (!LibraryPath) return Reply.status(400).send({ Error: "Library path is missing." });

    try {
        const Items = await FS.readdir(LibraryPath, { withFileTypes: true });
        const Response = { Recent: [], Collections: {} };
        const UncategorisedFiles = [];

        for (const Item of Items) {
            const FullPath = PATH.join(LibraryPath, Item.name);

            // Handle Collections (Directories starting with 'c-')
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
            } 
            // Collect Loose Comics in the root library folder
            else if (COMIC_EXTENSIONS.includes(PATH.extname(Item.name).toLowerCase())) {
                UncategorisedFiles.push({
                    Title: PATH.parse(Item.name).name,
                    FileName: Item.name,
                    FullPath: FullPath,
                    ThumbnailUrl: `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(FullPath)}`
                });
            }
        }

        // If loose files exist, group them under "Uncategorised" for the frontend to render
        if (UncategorisedFiles.length > 0) {
            Response.Collections["Uncategorised"] = UncategorisedFiles;
        }

        return Response;
    } catch (Err) {
        console.error("Error scanning content:", Err);
        Reply.status(500).send({ Error: "Failed to scan library directory." });
    }
});

/**
 * Extracts a thumbnail from a zip/cbz file.
 */
FASTIFY_INSTANCE.get('/api/thumbnail', async (Request, Reply) => {
    const { path: FullPath, page: PageName } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        let Entry;
        
        if (PageName && PageName !== 'undefined') {
            Entry = Zip.getEntry(PageName);
        } 
        
        if (!Entry) {
            Entry = Zip.getEntries().find(E => 
                IMAGE_EXTENSIONS.includes(PATH.extname(E.entryName).toLowerCase())
            );
        }

        if (Entry) {
            const ImageData = Entry.getData();
            return Reply.type('image/jpeg').send(ImageData);
        }
        
        Reply.status(404).send({ Error: "No image entry found for thumbnail." });
    } catch (Err) {
        console.error("Thumbnail extraction failed:", Err);
        Reply.status(500).send({ Error: "Failed to extract thumbnail." });
    }
});

/**
 * Lists all valid image pages within a comic file, sorted numerically.
 */
FASTIFY_INSTANCE.get('/api/read', async (Request, Reply) => {
    const { path: FullPath } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        const PageNames = Zip.getEntries()
            .filter(E => IMAGE_EXTENSIONS.includes(PATH.extname(E.entryName).toLowerCase()))
            .sort((A, B) => A.entryName.localeCompare(B.entryName, undefined, { numeric: true }))
            .map(E => E.entryName);
            
        return { PageNames };
    } catch (Err) {
        console.error("Read initialisation failed:", Err);
        Reply.status(500).send({ Error: "Failed to read comic archive." });
    }
});

/**
 * Serves a specific page buffer from the comic archive.
 */
FASTIFY_INSTANCE.get('/api/page', async (Request, Reply) => {
    const { path: FullPath, page: PageName } = Request.query;
    try {
        const Zip = new ADM_ZIP(FullPath);
        const Entry = Zip.getEntry(PageName);
        
        if (Entry) {
            const Buffer = Entry.getData();
            return Reply.type('image/jpeg').send(Buffer);
        }
        
        Reply.status(404).send({ Error: "Page not found in archive." });
    } catch (Err) {
        console.error("Page extraction failed:", Err);
        Reply.status(500).send({ Error: "Internal server error during page fetch." });
    }
});

/**
 * Starts the Fastify server.
 */
const StartServer = async () => {
    try {
        await FASTIFY_INSTANCE.listen({ port: 3000 });
        console.log("--- MANGAĈIKA Backend Operational ---");
        console.log("Server listening at http://localhost:3000");
    } catch (Err) {
        console.error("Critical server failure:", Err);
        process.exit(1);
    }
};

StartServer();
