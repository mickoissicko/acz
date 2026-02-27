const EXPRESS = require('express');
const PATH = require('path');
const FS = require('fs');
const ADM_ZIP = require('adm-zip');

const APP = EXPRESS();
const PORT = 3000;

/* serve static files from the src directory */
APP.use(EXPRESS.static(PATH.join(__dirname, 'src')));

/* route for the custom config file */
APP.get('/config.acz.mix', (Req, Res) => {
    Res.sendFile(PATH.join(__dirname, 'config.acz.mix'));
});

/* endpoint to stream images from manga zip files */
APP.get('/render-manga', (Req, Res) => {
    let ArchivePath = Req.query.file;
    let PageIndex = parseInt(Req.query.page) || 0;

    try {
        if (!FS.existsSync(ArchivePath)) {
            return Res.status(404).send("manga file not found at path");
        }

        let Zip = new ADM_ZIP(ArchivePath);
        let ZipEntries = Zip.getEntries().filter(Entry => 
            !Entry.isDirectory && Entry.entryName.match(/\.(jpg|jpeg|png|webp|avif)$/i)
        );

        /* sort alphabetically for correct reading order */
        ZipEntries.sort((A, B) => A.entryName.localeCompare(B.entryName, undefined, {numeric: true, sensitivity: 'base'}));

        if (ZipEntries[PageIndex]) {
            let Data = ZipEntries[PageIndex].getData();
            Res.contentType('image/jpeg');
            Res.send(Data);
        } else {
            Res.status(404).send("page index out of range");
        }
    } catch (Error) {
        console.error(Error);
        Res.status(500).send("internal server error reading zip");
    }
});

APP.get('/', (Req, Res) => {
    Res.sendFile(PATH.join(__dirname, 'src', 'index.html'));
});

APP.listen(PORT, () => {
    console.log(`mix acz server running at http://localhost:${PORT}`);
});