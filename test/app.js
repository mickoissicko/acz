const LibraryPicker = document.getElementById('LibraryPicker');
const RecentGrid = document.getElementById('RecentGrid');
const CollectionsContainer = document.getElementById('CollectionsContainer');

const FETCH_DATA = async (Url) => {
    const Res = await fetch(Url);
    return await Res.json();
};

const RENDER_CARD = (Item) => `
    <div class="group cursor-pointer">
        <div class="squishy-card aspect-[3/4] rounded-2xl mb-3 overflow-hidden shadow-2xl">
            <img src="${Item.ThumbnailUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
        </div>
        <h4 class="font-bold truncate text-sm">${Item.Title}</h4>
    </div>
`;

const LOAD_LIBRARY = async (Path) => {
    const Data = await FETCH_DATA(`http://localhost:3000/api/content?path=${encodeURIComponent(Path)}`);
    
    // Render Hero / Recent
    if (Data.Recent.length > 0) {
        document.getElementById('HeroSection').classList.remove('hidden');
        RecentGrid.innerHTML = Data.Recent.slice(0, 2).map(Item => `
            <div class="squishy-card p-4 rounded-3xl flex gap-6 items-center border-indigo-500/20 bg-indigo-500/5">
                <img src="${Item.ThumbnailUrl}" class="w-24 h-32 rounded-xl object-cover shadow-lg">
                <div>
                    <h3 class="text-lg font-bold">${Item.Title}</h3>
                    <button class="mt-3 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-400 hover:text-white transition">Resume</button>
                </div>
            </div>
        `).join('');
    }

    // Render Collections
    CollectionsContainer.innerHTML = Object.entries(Data.Collections).map(([Name, Items]) => `
        <section class="mb-12">
            <h2 class="text-xl font-bold mb-6 capitalize">${Name}</h2>
            <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-6">
                ${Items.map(I => RENDER_CARD(I)).join('')}
            </div>
        </section>
    `).join('');
};

const INITIALIZE = async () => {
    const Libraries = await FETCH_DATA('http://localhost:3000/api/libraries');
    Libraries.forEach(Lib => {
        const Opt = document.createElement('option');
        Opt.value = Lib;
        Opt.textContent = Lib.split('/').pop();
        LibraryPicker.appendChild(Opt);
    });

    LibraryPicker.addEventListener('change', (E) => LOAD_LIBRARY(E.target.value));
    if (Libraries.length > 0) LOAD_LIBRARY(Libraries[0]);
};

INITIALIZE();