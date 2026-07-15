const API = "https://collectionapi.metmuseum.org/public/collection/v1";

const heroMedia = document.getElementById("hero-media");
const heroTitle = document.getElementById("hero-title");
const heroSub = document.getElementById("hero-sub");
const refreshHeroBtn = document.getElementById("refresh-hero");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const detailDialog = document.getElementById("detail");
const detailImage = document.getElementById("detail-image");
const detailTitle = document.getElementById("detail-title");
const detailMeta = document.getElementById("detail-meta");
const detailMedium = document.getElementById("detail-medium");
const detailDesc = document.getElementById("detail-desc");

// Featured searches rotate so the hero feels fresh without huge payloads.
const FEATURED_QUERIES = [
  "paintings",
  "landscape",
  "portrait",
  "still life",
  "impressionist",
];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function pickImage(artwork, preferLarge = false) {
  if (preferLarge) {
    return artwork.primaryImage || artwork.primaryImageSmall || "";
  }
  return artwork.primaryImageSmall || artwork.primaryImage || "";
}

function normalizeArtwork(raw) {
  if (!raw || (!raw.primaryImageSmall && !raw.primaryImage)) return null;
  return {
    id: raw.objectID,
    title: raw.title || "Untitled",
    artist: raw.artistDisplayName || "Artist unknown",
    date: raw.objectDate || "",
    medium: raw.medium || "",
    place: raw.country || raw.culture || "",
    department: raw.department || "",
    description: [raw.creditLine, raw.repository].filter(Boolean).join(" · "),
    primaryImage: raw.primaryImage || "",
    primaryImageSmall: raw.primaryImageSmall || "",
  };
}

async function fetchArtwork(id) {
  const raw = await fetchJson(`${API}/objects/${id}`);
  return normalizeArtwork(raw);
}

async function fetchArtworksByIds(ids, limit = 12) {
  const slice = ids.slice(0, limit);
  const results = await Promise.all(
    slice.map(async (id) => {
      try {
        return await fetchArtwork(id);
      } catch (error) {
        console.error(error);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

async function searchObjectIds(query) {
  const params = new URLSearchParams({
    q: query,
    hasImages: "true",
  });
  const data = await fetchJson(`${API}/search?${params.toString()}`);
  return data.objectIDs || [];
}

function setHero(artwork) {
  const url = pickImage(artwork, true);
  if (url) {
    heroMedia.classList.remove("is-ready");
    void heroMedia.offsetWidth;
    heroMedia.style.backgroundImage = `url("${url}")`;
    heroMedia.classList.add("is-ready");
  }
  heroTitle.textContent = artwork.title;
  const bits = [artwork.artist, artwork.date].filter(Boolean);
  heroSub.textContent = bits.join(" · ");
}

async function loadFeatured() {
  const query =
    FEATURED_QUERIES[Math.floor(Math.random() * FEATURED_QUERIES.length)];
  const ids = await searchObjectIds(query);
  if (!ids.length) {
    throw new Error("No featured artworks found");
  }

  // Sample from deeper in the list so refreshes feel varied.
  const start = Math.floor(Math.random() * Math.min(40, Math.max(ids.length - 6, 1)));
  const artworks = await fetchArtworksByIds(ids.slice(start, start + 6), 6);
  if (!artworks.length) {
    throw new Error("No featured artworks with images");
  }

  const pick = artworks[Math.floor(Math.random() * artworks.length)];
  setHero(pick);
  return pick;
}

function renderResults(artworks, query) {
  resultsEl.innerHTML = "";

  if (!artworks.length) {
    statusEl.textContent = `No artworks found for “${query}”. Try another search.`;
    return;
  }

  statusEl.textContent = `Showing ${artworks.length} result${artworks.length === 1 ? "" : "s"} for “${query}”.`;

  const fragment = document.createDocumentFragment();

  artworks.forEach((artwork) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.setAttribute("aria-label", `Open details for ${artwork.title}`);

    const frame = document.createElement("div");
    frame.className = "card-frame";

    const img = document.createElement("img");
    img.src = pickImage(artwork, false);
    img.alt = artwork.title;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    frame.appendChild(img);

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = artwork.title;

    const artist = document.createElement("p");
    artist.className = "card-artist";
    artist.textContent = artwork.artist;

    copy.append(title, artist);
    button.append(frame, copy);
    button.addEventListener("click", () => openDetail(artwork));
    fragment.appendChild(button);
  });

  resultsEl.appendChild(fragment);
}

function openDetail(artwork) {
  detailImage.referrerPolicy = "no-referrer";
  detailImage.src = pickImage(artwork, true);
  detailImage.alt = artwork.title;
  detailTitle.textContent = artwork.title;

  const meta = [artwork.artist, artwork.date, artwork.place]
    .filter(Boolean)
    .join(" · ");
  detailMeta.textContent = meta;
  detailMedium.textContent = artwork.medium || artwork.department || "";
  detailDesc.textContent =
    artwork.description ||
    "No written description is available for this work in the API.";

  if (typeof detailDialog.showModal === "function") {
    detailDialog.showModal();
  }
}

async function searchArtworks(query) {
  const q = query.trim();
  if (!q) return;

  statusEl.textContent = "Fetching artworks…";
  resultsEl.innerHTML = "";

  try {
    const ids = await searchObjectIds(q);
    const artworks = await fetchArtworksByIds(ids, 12);
    renderResults(artworks, q);
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Something went wrong talking to the API. Please try again.";
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchArtworks(searchInput.value);
});

document.querySelectorAll(".quick-tags button").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.dataset.query;
    searchInput.value = query;
    searchArtworks(query);
  });
});

refreshHeroBtn.addEventListener("click", async () => {
  refreshHeroBtn.disabled = true;
  try {
    await loadFeatured();
  } catch (error) {
    console.error(error);
    heroTitle.textContent = "Could not refresh the featured work";
    heroSub.textContent = "Please try again in a moment.";
  } finally {
    refreshHeroBtn.disabled = false;
  }
});

detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) {
    detailDialog.close();
  }
});

(async function init() {
  try {
    await Promise.all([loadFeatured(), searchArtworks("painting")]);
  } catch (error) {
    console.error(error);
    heroTitle.textContent = "Vitrine";
    heroSub.textContent = "We could not reach the museum API. Check your connection and reload.";
    statusEl.textContent = "Unable to load the collection right now.";
  }
})();
