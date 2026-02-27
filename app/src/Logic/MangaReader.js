let CurrentMangaPath = ""; /* this will come from your .acz.mix file */

function UpdateReaderDisplay() {
    let PageImage = document.getElementById("ActivePageImage");
    let Indicator = document.getElementById("PageIndicator");

    /* point to our server endpoint */
    let RequestUrl = `/render-manga?file=${encodeURIComponent(CurrentMangaPath)}&page=${CurrentPageNumber - 1}`;
    
    PageImage.src = RequestUrl;
    Indicator.innerText = `Page ${CurrentPageNumber}`;
}

function OpenManga(Path) {
    CurrentMangaPath = Path;
    CurrentPageNumber = 1;
    document.getElementById("MangaViewport").style.display = "flex";
    UpdateReaderDisplay();
}

function CloseManga() {
    document.getElementById("MangaViewport").style.display = "none";
    document.body.style.overflow = "auto";
}