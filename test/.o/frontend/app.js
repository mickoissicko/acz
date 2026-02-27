const API_BASE = "http://localhost:10801/api/v1";

// ------------------- MANGA GRID -------------------
async function loadManga() {
  const res = await fetch(`${API_BASE}/media`);
  const data = await res.json();

  const grid = document.getElementById("mangaGrid");
  grid.innerHTML = "";

  data.data.forEach(media => {
    const card = document.createElement("div");
    card.className = "manga-card p-3";

    // Use page 1 as thumbnail
    const coverUrl = `${API_BASE}/media/${media.id}/page/1`;

    card.innerHTML = `
      <img src="${coverUrl}" class="rounded-2xl mb-2">
      <h2 class="text-md font-semibold text-purple-800 truncate">${media.name}</h2>
      <p class="text-sm text-gray-600">${media.pages} pages</p>
    `;

    card.onclick = () => {
      window.location.href = `reader.html?media=${media.id}&page=1&total=${media.pages}`;
    };

    grid.appendChild(card);
  });
}

// ------------------- READER -------------------
let mediaId = null;
let currentPage = 1;
let totalPages = 0;

function getPageUrl(mediaId, pageNumber) {
  return `${API_BASE}/media/${mediaId}/page/${pageNumber}`;
}

function loadPage() {
  document.getElementById("readerImage").src = getPageUrl(mediaId, currentPage);
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadPage();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPage();
  }
}

function goBack() {
  window.location.href = "index.html";
}

// ------------------- INIT -------------------
if (document.getElementById("mangaGrid")) {
  loadManga();
}

if (document.getElementById("readerImage")) {
  const params = new URLSearchParams(window.location.search);
  mediaId = params.get("media");
  currentPage = parseInt(params.get("page") || 1);
  totalPages = parseInt(params.get("total") || 1);
  loadPage();
}