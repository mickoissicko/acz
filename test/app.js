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
let OBSERVER = null; // to observe scrolling (observer is a tuff ass name btw)
let SaveTimeout;

const GET_RECENT = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const SAVE_PROGRESS_THROTTLED = () => {
    clearTimeout(SaveTimeout);
    SaveTimeout = setTimeout(() => {
        const CurrentManga = {
            Title: document.getElementById('ReaderTitle').innerText,
            FullPath: new URLSearchParams(CURRENT_IMAGES[0].split('?')[1]).get('path')
        };
        SAVE_PROGRESS(CurrentManga);
    }, 1000);
};

const UPDATE_BUTTON_UI = () => {
    document.getElementById('BtnScroll').style.background = READER_MODE === 'scroll' ? '#6366f1' : 'transparent';
    document.getElementById('BtnPage').style.background = READER_MODE === 'page' ? '#6366f1' : 'transparent';
};

const SAVE_PROGRESS = (MangaData) => {
    let Recent = GET_RECENT();
    const PageName = CURRENT_IMAGES[CURRENT_INDEX]?.split('page=')[1]; // url name
    
    const Entry = {
        ...MangaData,
        LastIndex: CURRENT_INDEX,
        LastPageName: decodeURIComponent(PageName || ""),
        LastMode: READER_MODE,
        Timestamp: new Date().getTime()
    };

    Recent = Recent.filter(Item => Item.FullPath !== MangaData.FullPath);
    Recent.unshift(Entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Recent.slice(0, 20))); // Keep last 20
    RENDER_RECENT_WIDGET();
};

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
    const Recent = GET_RECENT();

    RENDER_RECENT_WIDGET();

    CollectionsContainer.innerHTML = Object.entries(Data.Collections).map(([Name, Items]) => `
        <section>
            <h2 class="text-xl font-bold mb-6 capitalize flex items-center gap-3">
                <span class="h-1 w-8 bg-indigo-500 rounded-full"></span>${Name}
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8">
                ${Items.map(I => {
                    const Saved = Recent.find(R => R.FullPath === I.FullPath);
                    const PageParam = (Saved && Saved.LastPageName) ? `&page=${encodeURIComponent(Saved.LastPageName)}` : '';
                    const CoverUrl = Saved ? `${I.ThumbnailUrl}${PageParam}` : I.ThumbnailUrl;

                    return `
                        <div class="group cursor-pointer" onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(I))}')">
                            <div class="squishy-card aspect-[3/4] rounded-2xl mb-3 overflow-hidden shadow-2xl">
                                <img src="${CoverUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                            </div>
                            <h4 class="font-bold truncate text-sm text-white">${I.Title}</h4>
                            ${Saved ? `<p class="text-[9px] text-indigo-400 font-bold uppercase mt-1">Page ${Saved.LastIndex + 1}</p>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </section>
    `).join('');
};

const RENDER_RECENT_WIDGET = () => {
    const Recent = GET_RECENT();
    if (Recent.length === 0) { HeroSection.classList.add('hidden'); return; }
    HeroSection.classList.remove('hidden');
    
    RecentGrid.innerHTML = Recent.slice(0, 2).map(Item => {
        const PageParam = Item.LastPageName ? `&page=${encodeURIComponent(Item.LastPageName)}` : '';
        const Thumb = `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(Item.FullPath)}${PageParam}`;
        const DisplayProgress = (Item.LastIndex !== undefined && !isNaN(Item.LastIndex)) 
            ? `Page ${Item.LastIndex + 1}` 
            : "Not started";

        return `
        <div class="squishy-card p-4 rounded-3xl flex gap-6 items-center cursor-pointer active:scale-95 transition" 
             onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(Item))}')">
            <img src="${Thumb}" class="w-20 h-28 rounded-xl object-cover shadow-lg pointer-events-none" 
                 onerror="this.src='https://via.placeholder.com/150?text=No+Cover'">
            <div class="flex-1">
                <h3 class="text-lg font-bold text-white truncate w-48">${Item.Title}</h3>
                <p class="text-[10px] text-indigo-400 mt-1 uppercase font-bold">Status: ${DisplayProgress}</p>
                <p class="text-[9px] text-gray-600 uppercase font-semibold">${new Date(Item.Timestamp).toLocaleDateString()}</p>
            </div>
        </div>
    `}).join('');
};

const OPEN_READER = async (MangaData) => {
    document.getElementById('ReaderTitle').innerText = MangaData.Title;
    ReaderOverlay.classList.remove('hidden');
    
    const Res = await fetch(`http://localhost:3000/api/read?path=${encodeURIComponent(MangaData.FullPath)}`);
    const Data = await Res.json();

    CURRENT_IMAGES = Data.PageNames.map(Name => 
        `http://localhost:3000/api/page?path=${encodeURIComponent(MangaData.FullPath)}&page=${encodeURIComponent(Name)}`
    );
    
    const Saved = GET_RECENT().find(I => I.FullPath === MangaData.FullPath);
    
    CURRENT_INDEX = (Saved && Saved.LastIndex !== undefined) ? Saved.LastIndex : 0;
    READER_MODE = Saved ? Saved.LastMode : 'scroll';

    RENDER_READER_CONTENT();
    
    if (READER_MODE === 'scroll' && CURRENT_INDEX > 0) {
        setTimeout(() => {
            const Target = ReaderContent.children[CURRENT_INDEX];
            Target?.scrollIntoView({ block: 'start' });
        }, 150);
    }
};

const SET_READER_MODE = (Mode) => {
    READER_MODE = Mode;
    document.getElementById('BtnScroll').style.background = Mode === 'scroll' ? '#6366f1' : 'transparent';
    document.getElementById('BtnPage').style.background = Mode === 'page' ? '#6366f1' : 'transparent';
    
    ReaderContent.scrollTop = 0;
    RENDER_READER_CONTENT();
};

const SETUP_SCROLL_OBSERVER = () => {
    const Options = { root: ReaderContent, threshold: 0.2 };
    OBSERVER = new IntersectionObserver((Entries) => {
        Entries.forEach(Entry => {
            if (Entry.isIntersecting) {
                CURRENT_INDEX = parseInt(Entry.target.getAttribute('data-index'));
                UPDATE_HUD();
                SAVE_PROGRESS_THROTTLED();
            }
        });
    }, Options);

    Array.from(ReaderContent.children).forEach(Child => OBSERVER.observe(Child));
};

const RENDER_READER_CONTENT = () => {
    // Clean up old observer
    if (OBSERVER) OBSERVER.disconnect();

    if (READER_MODE === 'scroll') {
        ReaderContent.innerHTML = CURRENT_IMAGES.map((ImgUrl, idx) => `
            <div class="flex flex-col items-center bg-black py-2" data-index="${idx}">
                <img src="${ImgUrl}" loading="lazy" class="w-full max-w-4xl block pointer-events-none">
            </div>
        `).join('');
        SETUP_SCROLL_OBSERVER();
    } else {
        ReaderContent.innerHTML = `
            <div class="h-screen w-screen flex items-center justify-center bg-black">
                <img src="${CURRENT_IMAGES[CURRENT_INDEX]}" class="max-h-full max-w-full object-contain pointer-events-none shadow-2xl">
            </div>
        `;
    }
    UPDATE_HUD();
    UPDATE_BUTTON_UI();
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
        SAVE_PROGRESS_THROTTLED();
        PRELOAD();
    }
};

const PREV_PAGE = () => {
    if (READER_MODE === 'page' && CURRENT_INDEX > 0) {
        CURRENT_INDEX--;
        RENDER_READER_CONTENT();
        SAVE_PROGRESS_THROTTLED();
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

const SHOW_HISTORY = () => {
    const Recent = GET_RECENT();

    ViewTitle.innerText = "Reading History";
    ViewSub.innerText = "Everything you've touched recently.";
    BackBtn.classList.remove('hidden');
    HeroSection.classList.add('hidden');
    
    if (Recent.length === 0) {
        CollectionsContainer.innerHTML = `<p class="text-gray-500 text-center py-20">No history found. Start reading!</p>`;
        return;
    }

    CollectionsContainer.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8">
            ${Recent.map(Item => {
                const PageParam = Item.LastPageName ? `&page=${encodeURIComponent(Item.LastPageName)}` : '';
                const Thumb = `http://localhost:3000/api/thumbnail?path=${encodeURIComponent(Item.FullPath)}${PageParam}`;
                
                return `
                    <div class="group cursor-pointer" onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(Item))}')">
                        <div class="squishy-card aspect-[3/4] rounded-2xl mb-3 overflow-hidden shadow-2xl">
                            <img src="${Thumb}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                        </div>
                        <h4 class="font-bold truncate text-sm text-white">${Item.Title}</h4>
                        <p class="text-[9px] text-indigo-400 font-bold uppercase mt-1">Page ${Item.LastIndex + 1}</p>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="flex justify-center mt-12">
            <button onclick="CLEAR_HISTORY()" class="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition">Clear All History</button>
        </div>
    `;
};

const SHOW_COLLECTIONS = () => {
    ViewTitle.innerText = "Your Library";
    ViewSub.innerText = "Let's get readin' :P";
    BackBtn.classList.add('hidden');
    LOAD_LIBRARY(LibraryPicker.value);
};

const CLEAR_HISTORY = () => {
    if (confirm("Are you sure you want to clear your reading history?")) {
        localStorage.removeItem(STORAGE_KEY);
        SHOW_COLLECTIONS();
    }
};

SeeAllRecent.addEventListener('click', SHOW_HISTORY);

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
