const LibraryPicker = document.getElementById('LibraryPicker');
const RecentGrid = document.getElementById('RecentGrid');
const CollectionsContainer = document.getElementById('CollectionsContainer');
const HeroSection = document.getElementById('HeroSection');
const ViewTitle = document.getElementById('ViewTitle');
const BackBtn = document.getElementById('BackBtn');
const SeeAllRecent = document.getElementById('SeeAllRecent');

const STORAGE_KEY = "MANGA_FLOW_RECENT";

const GET_RECENT = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const SAVE_RECENT = (Manga) => {
    let Recent = GET_RECENT();
    Recent = Recent.filter(Item => Item.Title !== Manga.Title);
    Manga.Timestamp = new Date().getTime();
    Recent.unshift(Manga);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Recent));
    RENDER_RECENT_WIDGET();
};

const RENDER_RECENT_WIDGET = () => {
    const Recent = GET_RECENT();
    if (Recent.length === 0) {
        HeroSection.classList.add('hidden');
        return;
    }
    HeroSection.classList.remove('hidden');
    RecentGrid.innerHTML = Recent.slice(0, 2).map(Item => `
        <div class="squishy-card p-4 rounded-3xl flex gap-6 items-center cursor-pointer active:scale-95 transition" 
             onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(Item))}')">
            <img src="${Item.ThumbnailUrl}" class="w-20 h-28 rounded-xl object-cover shadow-lg pointer-events-none">
            <div>
                <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Continue Reading</span>
                <h3 class="text-lg font-bold truncate max-w-[200px] text-white">${Item.Title}</h3>
                <p class="text-[10px] text-gray-500 mt-1 uppercase font-semibold tracking-tighter">Last read: ${new Date(Item.Timestamp).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
};

const RENDER_CARD = (Item) => `
    <div class="group cursor-pointer" onclick="HANDLE_CLICK('${encodeURIComponent(JSON.stringify(Item))}')">
        <div class="squishy-card aspect-[3/4] rounded-2xl mb-3 overflow-hidden shadow-2xl">
            <img src="${Item.ThumbnailUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 pointer-events-none">
        </div>
        <h4 class="font-bold truncate text-sm text-white">${Item.Title}</h4>
    </div>
`;

const HANDLE_CLICK = (EncodedData) => {
    const MangaData = JSON.parse(decodeURIComponent(EncodedData));
    SAVE_RECENT(MangaData);
    OPEN_READER(MangaData);
};

const OPEN_READER = (MangaData) => {
    console.log("INITIALIZING READER ENGINE FOR:", MangaData.Title);
    // Next Step: Reader Implementation
};

const SHOW_HISTORY = () => {
    const Recent = GET_RECENT();
    HeroSection.classList.add('hidden');
    ViewTitle.innerText = "Reading History";
    BackBtn.classList.remove('hidden');
    CollectionsContainer.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8">
            ${Recent.map(Item => RENDER_CARD(Item)).join('')}
        </div>
    `;
};

const LOAD_LIBRARY = async (Path) => {
    ViewTitle.innerText = "System Library";
    BackBtn.classList.add('hidden');
    
    const Res = await fetch(`http://localhost:3000/api/content?path=${encodeURIComponent(Path)}`);
    const Data = await Res.json();
    
    RENDER_RECENT_WIDGET();

    CollectionsContainer.innerHTML = Object.entries(Data.Collections).map(([Name, Items]) => `
        <section>
            <h2 class="text-xl font-bold mb-6 capitalize flex items-center gap-3">
                <span class="h-1 w-8 bg-indigo-500 rounded-full"></span> ${Name}
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8">
                ${Items.map(I => RENDER_CARD(I)).join('')}
            </div>
        </section>
    `).join('');
};

LibraryPicker.addEventListener('change', (E) => LOAD_LIBRARY(E.target.value));
SeeAllRecent.addEventListener('click', SHOW_HISTORY);
BackBtn.addEventListener('click', () => LOAD_LIBRARY(LibraryPicker.value));

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
    } catch (Err) {
        console.error("BOOT ERROR:", Err);
    }
};

INITIALIZE();