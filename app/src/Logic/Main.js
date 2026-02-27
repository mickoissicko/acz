/* initialises the dashboard cards */
let GridElement = document.getElementById("MainGrid");

async function InitialiseApp() {
    let Config = await LoadConfiguration();
    let MangaList = Config["MANGA"];

    if (MangaList) {
        GridElement.innerHTML = "";
        for (let Name in MangaList) {
            let Path = MangaList[Name];
            let Card = document.createElement("div");
            Card.className = "media-card";
            Card.innerHTML = `<div class="card-overlay"><span>${Name}</span></div>`;
            Card.onclick = () => OpenManga(Path);
            GridElement.appendChild(Card);
        }
    }
    
    /* start the input listeners */
    InitialiseControls();
}

InitialiseApp();