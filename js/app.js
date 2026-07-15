const API = "https://api.artic.edu/api/v1";
const FIELDS = [
  "id",
  "title",
  "image_id",
  "artist_display",
  "date_display",
  "medium_display",
  "place_of_origin",
  "description",
  "thumbnail",
].join(",");

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

let iiifUrl = "https://www.artic.edu/iiif/2";

function imageUrl(imageId, width = 843) {
  if (!imageId) return null;
  return `${iiifUrl}/${imageId}/full/${width},/0/default.jpg`;
}

function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function artistLine(artwork) {
  if (!artwork.artist_display) return "Artist unknown";
  return artwork.artist_display.split("\n")[0];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function setHero(artwork) {
  const url = imageUrl(artwork.image_id, 1686);
  if (url) {
    heroMedia.classList.remove("is-ready");
    // Force reflow so the reveal animation can replay.
    void heroMedia.offsetWidth;
    heroMedia.style.backgroundImage = `url("${url}")`;
    heroMedia.classList.add("is-ready");
  }
  heroTitle.textContent = artwork.title || "Untitled";
  const bits = [artistLine(artwork), artwork.date_display].filter(Boolean);
  heroSub.textContent = bits.join(" · ");
}

async function loadFeatured() {
  const page = Math.floor(Math.random() * 50) + 1;
  const params = new URLSearchParams({
    page: String(page),
    limit: "24",
    fields: FIELDS,
  });
  const data = await fetchJson(`${API}/artworks?${params.toString()}`);

  if (data.config?.iiif_url) {
    iiifUrl = data.config.iiif_url;
  }

  const withImages = (data.data || []).filter((item) => item.image_id);
  if (!withImages.length) {
    throw new Error("No featured artworks found");
  }

  const pick = withImages[Math.floor(Math.random() * withImages.length)];
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
    button.setAttribute("aria-label", `Open details for ${artwork.title || "artwork"}`);

    const frame = document.createElement("div");
    frame.className = "card-frame";

    const img = document.createElement("img");
    const src = imageUrl(artwork.image_id, 600);
    img.src = src || artwork.thumbnail?.lqip || "";
    img.alt = artwork.title || "Artwork";
    img.loading = "lazy";
    frame.appendChild(img);

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = artwork.title || "Untitled";

    const artist = document.createElement("p");
    artist.className = "card-artist";
    artist.textContent = artistLine(artwork);

    copy.append(title, artist);
    button.append(frame, copy);
    button.addEventListener("click", () => openDetail(artwork));
    fragment.appendChild(button);
  });

  resultsEl.appendChild(fragment);
}

function openDetail(artwork) {
  const url = imageUrl(artwork.image_id, 1200);
  detailImage.src = url || "";
  detailImage.alt = artwork.title || "Artwork";
  detailTitle.textContent = artwork.title || "Untitled";

  const meta = [artistLine(artwork), artwork.date_display, artwork.place_of_origin]
    .filter(Boolean)
    .join(" · ");
  detailMeta.textContent = meta;
  detailMedium.textContent = artwork.medium_display || "";
  detailDesc.textContent =
    stripHtml(artwork.description) ||
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
    const params = new URLSearchParams({
      q,
      fields: FIELDS,
      limit: "12",
    });
    // Prefer works that can be shown with images.
    params.set("query[term][is_public_domain]", "true");

    const data = await fetchJson(`${API}/artworks/search?${params.toString()}`);
    if (data.config?.iiif_url) {
      iiifUrl = data.config.iiif_url;
    }

    const artworks = (data.data || []).filter((item) => item.image_id);
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
    await loadFeatured();
    await searchArtworks("painting");
  } catch (error) {
    console.error(error);
    heroTitle.textContent = "Vitrine";
    heroSub.textContent = "We could not reach the museum API. Check your connection and reload.";
    statusEl.textContent = "Unable to load the collection right now.";
  }
})();
