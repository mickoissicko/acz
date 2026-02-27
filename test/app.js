// da dom tss
const LibraryPicker = document.getElementById('LibraryPicker');
const RecentGrid = document.getElementById('RecentGrid');
const CollectionsContainer = document.getElementById('CollectionsContainer');
const HeroSection = document.getElementById('HeroSection');
const ViewTitle = document.getElementById('ViewTitle');
const BackBtn = document.getElementById('BackBtn');
const SeeAllRecent = document.getElementById('SeeAllRecent');

// reader stuff
const ReaderOverlay = document.getElementById('ReaderOverlay');
const ReaderContent = document.getElementById('ReaderContent');
const ReaderHUD = document.getElementById('ReaderHUD');
const ReaderProgress = document.getElementById('ReaderProgress');
const PageCounter = document.getElementById('PageCounter');

// global
const STORAGE_KEY = "MANGA_FLOW_RECENT";
let CURRENT_IMAGES = [];
let CURRENT_INDEX = 0;
let READER_MODE = 'scroll'; 

const GET_RECENT = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const SAVE_RECENT = (Manga) => {
    let Recent = GET_RECENT();
    Recent = Recent.filter(Item => Item.Title !== Manga.Title);
    Manga.Timestamp = new Date().getTime();
    Recent.unshift(Manga);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Recent));
    RENDER_RECENT_WIDGET();
};

const LOAD_LIBRARY = async (Path) => {
    const Res = await fetch(`http://localhost:3000/api/content?path=${encodeURIComponent(Path)}`);
    const Data = await Res.json();
    RENDER_RECENT_WIDGET();
    CollectionsContainer.innerHTML = Object.entries(Data.Collections).map(([Name, Items]) => `
        <section>
            <h2 class="text-xl font-bold mb-6 capitalize flex items-center gap-3"><span class="h-1 w-8 bg-indigo-500 rounded-full"></span>${Name}</h2>
            <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8">
                ${Items.map(I => `
                    <div class="group cursor-pointer" onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(I))}')">
                        <div class="squishy-card aspect-[3/4] rounded-2xl mb-3 overflow-hidden shadow-2xl">
                            <img src="${I.ThumbnailUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                        </div>
                        <h4 class="font-bold truncate text-sm text-white">${I.Title}</h4>
                    </div>
                `).join('')}
            </div>
        </section>
    `).join('');
};

const RENDER_RECENT_WIDGET = () => {
    const Recent = GET_RECENT();
    if (Recent.length === 0) { HeroSection.classList.add('hidden'); return; }
    HeroSection.classList.remove('hidden');
    RecentGrid.innerHTML = Recent.slice(0, 2).map(Item => `
        <div class="squishy-card p-4 rounded-3xl flex gap-6 items-center cursor-pointer active:scale-95 transition" onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(Item))}')">
            <img src="${Item.ThumbnailUrl}" class="w-20 h-28 rounded-xl object-cover shadow-lg pointer-events-none">
            <div>
                <h3 class="text-lg font-bold text-white">${Item.Title}</h3>
                <p class="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Read: ${new Date(Item.Timestamp).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
};

const OPEN_READER = async (MangaData) => {
    document.getElementById('ReaderTitle').innerText = MangaData.Title;
    ReaderOverlay.classList.remove('hidden');
    
    const Res = await fetch(`http://localhost:3000/api/read?path=${encodeURIComponent(MangaData.FullPath)}`);
    const Data = await Res.json();

    CURRENT_IMAGES = Data.PageNames.map(Name => 
        `http://localhost:3000/api/page?path=${encodeURIComponent(MangaData.FullPath)}&page=${encodeURIComponent(Name)}`
    );
    
    CURRENT_INDEX = 0;
    RENDER_READER_CONTENT();
};

const SET_READER_MODE = (Mode) => {
    READER_MODE = Mode;
    document.getElementById('BtnScroll').style.background = Mode === 'scroll' ? '#6366f1' : 'transparent';
    document.getElementById('BtnPage').style.background = Mode === 'page' ? '#6366f1' : 'transparent';
    
    ReaderContent.scrollTop = 0;
    RENDER_READER_CONTENT();
};

const RENDER_READER_CONTENT = () => {
    if (READER_MODE === 'scroll') {
        ReaderContent.innerHTML = CURRENT_IMAGES.map(ImgUrl => `
            <div class="flex flex-col items-center bg-black">
                <img src="${ImgUrl}" loading="lazy" class="w-full max-w-4xl block pointer-events-none mb-4">
            </div>
        `).join('');
    } else {
        ReaderContent.innerHTML = `
            <div class="h-screen w-screen flex items-center justify-center bg-black">
                <img src="${CURRENT_IMAGES[CURRENT_INDEX]}" class="max-h-full max-w-full object-contain pointer-events-none shadow-2xl">
            </div>
        `;
        UPDATE_HUD();
    }
};

const UPDATE_HUD = () => {
    const Total = CURRENT_IMAGES.length;
    const Current = CURRENT_INDEX + 1;
    PageCounter.innerText = `${Current} / ${Total}`;
    ReaderProgress.style.width = `${(Current / Total) * 100}%`;
};

const NEXT_PAGE = () => {
    if (READER_MODE === 'page' && CURRENT_INDEX < CURRENT_IMAGES.length - 1) {
        CURRENT_INDEX++;
        RENDER_READER_CONTENT();
        PRELOAD();
    }
};

const PREV_PAGE = () => {
    if (READER_MODE === 'page' && CURRENT_INDEX > 0) {
        CURRENT_INDEX--;
        RENDER_READER_CONTENT();
    }
};

const PRELOAD = () => {
    const Next = CURRENT_INDEX + 1;
    if (Next < CURRENT_IMAGES.length) {
        const img = new Image();
        img.src = CURRENT_IMAGES[Next];
    }
};

const CLOSE_READER = () => {
    ReaderOverlay.classList.add('hidden');
    ReaderHUD.style.opacity = "0";
    ReaderHUD.style.pointerEvents = "none";
};

ReaderOverlay.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;

    const IsHidden = ReaderHUD.style.opacity === "0" || ReaderHUD.style.opacity === "";
    ReaderHUD.style.opacity = IsHidden ? "1" : "0";
    ReaderHUD.style.pointerEvents = IsHidden ? "auto" : "none";
});

document.addEventListener('keydown', (e) => {
    if (ReaderOverlay.classList.contains('hidden')) return;

    if (e.key === "ArrowRight" || e.key === "d") NEXT_PAGE();
    if (e.key === "ArrowLeft" || e.key === "a") PREV_PAGE();
    if (e.key === "Escape") CLOSE_READER();
    if (e.key === "m") SET_READER_MODE(READER_MODE === 'page' ? 'scroll' : 'page');
});

ReaderContent.addEventListener('scroll', () => {
    if (READER_MODE === 'scroll') {
        const Percent = (ReaderContent.scrollTop / (ReaderContent.scrollHeight - ReaderContent.clientHeight)) * 100;
        ReaderProgress.style.width = `${Percent || 0}%`;
        PageCounter.innerText = "SCROLLING";
    }
});

const HANDLE_CLICK = (EncodedData) => {
    const MangaData = JSON.parse(decodeURIComponent(EncodedData));
    SAVE_RECENT(MangaData);
    OPEN_READER(MangaData);
};

// init
const INITIALIZE = async () => {
    try {
        const Res = await fetch('http://localhost:3000/api/libraries');
        const Libraries = await Res.json();
        Libraries.forEach(Lib => {
            const Opt = document.createElement('option');
            Opt.value = Lib;
            Opt.textContent = Lib.split('/').filter(p => p).pop() || Lib;
            LibraryPicker.appendChild(Opt);
        });
        if (Libraries.length > 0) LOAD_LIBRARY(Libraries[0]);
    } catch (Err) { console.error("Initialize failed:", Err); }
};

INITIALIZE();
