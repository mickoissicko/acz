// Dom Elements
const LibraryPicker = document.getElementById('LibraryPicker');
const RecentGrid = document.getElementById('RecentGrid');
const CollectionsContainer = document.getElementById('CollectionsContainer');
const HeroSection = document.getElementById('HeroSection');
const ViewTitle = document.getElementById('ViewTitle');
const BackBtn = document.getElementById('BackBtn');
const SeeAllRecent = document.getElementById('SeeAllRecent');

// Reader Elements
const ReaderOverlay = document.getElementById('ReaderOverlay');
const ReaderContent = document.getElementById('ReaderContent');
const ReaderHud = document.getElementById('ReaderHud');
const ReaderProgress = document.getElementById('ReaderProgress');
const PageCounter = document.getElementById('PageCounter');

// Constants
const STORAGE_KEY = "MANGA_FLOW_RECENT";
const PREFETCH_LIMIT = 3;

// Global State
let CURRENT_IMAGES = [];
let CURRENT_INDEX = 0;
let READER_MODE = 'scroll'; 
let OBSERVER = null; 
let SaveTimeout;
let PREFETCH_QUEUE = new Set();

const GetRecent = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const SaveProgressThrottled = () => {
    clearTimeout(SaveTimeout);
    SaveTimeout = setTimeout(() => {
        const CurrentManga = {
            Title: document.getElementById('ReaderTitle').innerText,
            FullPath: new URLSearchParams(CURRENT_IMAGES[0].split('?')[1]).get('path')
        };
        SaveProgress(CurrentManga);
    }, 1000);
};

const UpdateButtonUi = () => {
    document.getElementById('BtnScroll').style.background = READER_MODE === 'scroll' ? '#6366f1' : 'transparent';
    document.getElementById('BtnPage').style.background = READER_MODE === 'page' ? '#6366f1' : 'transparent';
};

const SaveProgress = (MangaData) => {
    let Recent = GetRecent();
    const PageName = CURRENT_IMAGES[CURRENT_INDEX]?.split('page=')[1]; 
    
    const Entry = {
        ...MangaData,
        LastIndex: CURRENT_INDEX,
        LastPageName: decodeURIComponent(PageName || ""),
        LastMode: READER_MODE,
        Timestamp: new Date().getTime()
    };

    Recent = Recent.filter(Item => Item.FullPath !== MangaData.FullPath);
    Recent.unshift(Entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Recent.slice(0, 20))); 
    RenderRecentWidget();
};

const SaveRecent = (Manga) => {
    let Recent = GetRecent();
    Recent = Recent.filter(Item => Item.Title !== Manga.Title);
    Manga.Timestamp = new Date().getTime();
    Recent.unshift(Manga);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Recent));
    RenderRecentWidget();
};

const LoadLibrary = async (Path) => {
    const Res = await fetch(`http://localhost:3000/api/content?path=${encodeURIComponent(Path)}`);
    const Data = await Res.json();
    const Recent = GetRecent();

    RenderRecentWidget();

    // The backend now includes "Uncategorised" within Data.Collections
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
                        <div class="group cursor-pointer" onclick="HandleClick('${encodeURIComponent(JSON.stringify(I))}')">
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

const RenderRecentWidget = () => {
    const Recent = GetRecent();
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
             onclick="HandleClick('${encodeURIComponent(JSON.stringify(Item))}')">
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

const OpenReader = async (MangaData) => {
    PREFETCH_QUEUE.clear();
    ReaderContent.innerHTML = `
        <div id="ReaderLoader" class="flex flex-col items-center justify-center h-full w-full gap-4">
            <span class="loader"></span>
            <p class="text-indigo-400 font-bold text-xs uppercase tracking-widest">Initialising Gallery...</p>
        </div>
    `;
    
    document.getElementById('ReaderTitle').innerText = MangaData.Title;
    ReaderOverlay.classList.remove('hidden');
    
    try {
        const Res = await fetch(`http://localhost:3000/api/read?path=${encodeURIComponent(MangaData.FullPath)}`);
        const Data = await Res.json();

        CURRENT_IMAGES = Data.PageNames.map(Name => 
            `http://localhost:3000/api/page?path=${encodeURIComponent(MangaData.FullPath)}&page=${encodeURIComponent(Name)}`
        );
        
        const Saved = GetRecent().find(I => I.FullPath === MangaData.FullPath);
        CURRENT_INDEX = (Saved && Saved.LastIndex !== undefined) ? Saved.LastIndex : 0;
        
        const TargetMode = Saved?.LastMode || READER_MODE || 'scroll';
        ForceSyncMode(TargetMode);
        
        if (READER_MODE === 'scroll' && CURRENT_INDEX > 0) {
            setTimeout(() => {
                const Target = ReaderContent.querySelector(`[data-index="${CURRENT_INDEX}"]`);
                if (Target) Target.scrollIntoView({ block: 'start' });
            }, 100);
        }

        RunPrefetch();
    } catch (Err) {
        console.error("OpenReader failed:", Err);
        ReaderContent.innerHTML = `<p class="text-red-500">Error loading content.</p>`;
    }
};

const ForceSyncMode = (Mode) => {
    READER_MODE = Mode;
    RenderReaderContent();
    UpdateButtonUi();
};

const SetReaderMode = (Mode) => {
    ForceSyncMode(Mode);
    
    const CurrentTitle = document.getElementById('ReaderTitle').innerText;
    const Recent = GetRecent();
    const MangaEntry = Recent.find(R => R.Title === CurrentTitle);
    
    if (MangaEntry) {
        SaveProgress({
            Title: CurrentTitle,
            FullPath: MangaEntry.FullPath
        });
    }
};

const SetupScrollObserver = () => {
    if (OBSERVER) OBSERVER.disconnect();
    
    const Options = { root: ReaderContent, threshold: 0.3 };
    OBSERVER = new IntersectionObserver((Entries) => {
        Entries.forEach(Entry => {
            if (Entry.isIntersecting) {
                CURRENT_INDEX = parseInt(Entry.target.getAttribute('data-index'));
                UpdateHud();
                SaveProgressThrottled();
                RunPrefetch();
            }
        });
    }, Options);

    const Targets = ReaderContent.querySelectorAll('[data-index]');
    Targets.forEach(T => OBSERVER.observe(T));
};

const RenderReaderContent = () => {
    if (READER_MODE === 'scroll') {
        ReaderContent.innerHTML = CURRENT_IMAGES.map((ImgUrl, Idx) => `
            <div class="flex flex-col items-center bg-black py-2" data-index="${Idx}">
                <img src="${ImgUrl}" loading="lazy" class="w-full max-w-4xl block pointer-events-none min-h-[600px] bg-white/5">
            </div>
        `).join('');
        SetupScrollObserver();
    } else {
        ReaderContent.innerHTML = `
            <div class="h-screen w-screen flex items-center justify-center bg-black">
                <img src="${CURRENT_IMAGES[CURRENT_INDEX]}" class="max-h-full max-w-full object-contain pointer-events-none shadow-2xl">
            </div>
        `;
    }
    UpdateHud();
};

const UpdateHud = () => {
    const Total = CURRENT_IMAGES.length;
    const Current = CURRENT_INDEX + 1;
    PageCounter.innerText = `${Current} / ${Total}`;
    ReaderProgress.style.width = `${(Current / Total) * 100}%`;
};

const NextPage = () => {
    if (READER_MODE === 'page' && CURRENT_INDEX < CURRENT_IMAGES.length - 1) {
        CURRENT_INDEX++;
        RenderReaderContent();
        SaveProgressThrottled();
        RunPrefetch();
    }
};

const PrevPage = () => {
    if (READER_MODE === 'page' && CURRENT_INDEX > 0) {
        CURRENT_INDEX--;
        RenderReaderContent();
        SaveProgressThrottled();
    }
};

const RunPrefetch = () => {
    for (let I = 1; I <= PREFETCH_LIMIT; I++) {
        const NextIdx = CURRENT_INDEX + I;
        if (NextIdx < CURRENT_IMAGES.length) {
            const Url = CURRENT_IMAGES[NextIdx];
            if (!PREFETCH_QUEUE.has(Url)) {
                const Img = new Image();
                Img.src = Url;
                PREFETCH_QUEUE.add(Url);
            }
        }
    }
};

const CloseReader = () => {
    ReaderOverlay.classList.add('hidden');
    ReaderHud.style.opacity = "0";
    ReaderHud.style.pointerEvents = "none";
};

ReaderOverlay.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const IsHidden = ReaderHud.style.opacity === "0" || ReaderHud.style.opacity === "";
    ReaderHud.style.opacity = IsHidden ? "1" : "0";
    ReaderHud.style.pointerEvents = IsHidden ? "auto" : "none";
});

document.addEventListener('keydown', (e) => {
    if (ReaderOverlay.classList.contains('hidden')) return;
    if (e.key === "ArrowRight" || e.key === "d") NextPage();
    if (e.key === "ArrowLeft" || e.key === "a") PrevPage();
    if (e.key === "Escape") CloseReader();
    if (e.key === "m") SetReaderMode(READER_MODE === 'page' ? 'scroll' : 'page');
});

const HandleClick = (EncodedData) => {
    const MangaData = JSON.parse(decodeURIComponent(EncodedData));
    SaveRecent(MangaData);
    OpenReader(MangaData);
};

const ShowHistory = () => {
    const Recent = GetRecent();
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
                    <div class="group cursor-pointer" onclick="HandleClick('${encodeURIComponent(JSON.stringify(Item))}')">
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
            <button onclick="ClearHistory()" class="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition">Clear All History</button>
        </div>
    `;
};

const ShowCollections = () => {
    ViewTitle.innerText = "Your Library";
    ViewSub.innerText = "Let's get readin' :P";
    BackBtn.classList.add('hidden');
    LoadLibrary(LibraryPicker.value);
};

const ClearHistory = () => {
    if (confirm("Are you sure you want to clear your reading history?")) {
        localStorage.removeItem(STORAGE_KEY);
        ShowCollections();
    }
};

SeeAllRecent.addEventListener('click', ShowHistory);

const Initialise = async () => {
    try {
        const Res = await fetch('http://localhost:3000/api/libraries');
        const Libraries = await Res.json();
        Libraries.forEach(Lib => {
            const Opt = document.createElement('option');
            Opt.value = Lib;
            Opt.textContent = Lib.split('/').filter(p => p).pop() || Lib;
            LibraryPicker.appendChild(Opt);
        });
        if (Libraries.length > 0) LoadLibrary(Libraries[0]);
    } catch (Err) { console.error("Initialise failed:", Err); }
};

Initialise();
