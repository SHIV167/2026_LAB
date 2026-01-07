// Global state
let cachedPosts = [];
let translations = {}; // {postId: {title, excerpt}}
let currentLang = "en";
let currentPage = 1;
let totalPages = 1;

async function fetchPosts() {
  const loader = document.getElementById("loader");
  const loaderText = document.getElementById("loader-text");
  const postsGrid = document.getElementById("posts");

  // Show loader
  loader.removeAttribute("hidden");
  loaderText.removeAttribute("hidden");
  postsGrid.style.opacity = 0;
  postsGrid.setAttribute("hidden", "");

  const perPage = 6;
  const api = `https://shivjhawebtech.online/wp-json/wp/v2/posts?_embed&per_page=${perPage}&page=${currentPage}`;

  try {
    const res = await fetch(api);
    totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const posts = await res.json();
    cachedPosts = posts;
    renderPosts(posts, "en");
  } catch (err) {
    console.error("Error fetching posts:", err);
    postsGrid.innerHTML = `<p style=\"color:red\">Failed to load posts. Please try again later.</p>`;
  } finally {
    // Hide loader regardless of success/error
    loader.setAttribute("hidden", "");
    loaderText.setAttribute("hidden", "");
    postsGrid.removeAttribute("hidden");
    postsGrid.style.opacity = 1;
    updatePagination();
  }
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function renderPosts(posts, lang = "en") {
  const postsGrid = document.getElementById("posts");
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const titleEn = stripHTML(post.title.rendered);
    const excerptEn = stripHTML(post.excerpt.rendered).slice(0, 140) + "...";
    const {title: titleHi, excerpt: excerptHi} = translations[post.id] || {};
    const title = lang === "hi" && titleHi ? titleHi : titleEn;
    const excerpt = lang === "hi" && excerptHi ? excerptHi : excerptEn;

    let imageUrl = "https://via.placeholder.com/640x360?text=No+Image";
    if (
      post._embedded &&
      post._embedded["wp:featuredmedia"] &&
      post._embedded["wp:featuredmedia"][0]
    ) {
      imageUrl = post._embedded["wp:featuredmedia"][0].source_url;
    }

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img src="${imageUrl}" alt="${title}" loading="lazy" />
      <div class="card-content">
        <h2 class="card-title">${title}</h2>
        <p class="card-excerpt">${excerpt}</p>
        <a class="card-link" href="${post.link}" target="_blank" rel="noopener">Read more</a>
      </div>`;
    fragment.appendChild(card);
  });

  postsGrid.innerHTML = "";
  postsGrid.appendChild(fragment);
}

async function translateMissingToHindi() {
  const toTranslate = [];
  const mapIndexes = [];
  cachedPosts.forEach((p, idx) => {
    if (!translations[p.id]) {
      const text = `${stripHTML(p.title.rendered)}\n${stripHTML(p.excerpt.rendered)}`;
      toTranslate.push(text);
      mapIndexes.push(p.id);
    }
  });
  if (toTranslate.length === 0) return; // all cached
  const loaderText = document.getElementById("loader-text");
  loaderText.textContent = "कृपया प्रतीक्षा करें...";
  const loader = document.getElementById("loader");
  loader.removeAttribute("hidden");
  loaderText.removeAttribute("hidden");
  try {
    // Use MyMemory API (GET, no CORS preflight)
    async function translateText(text) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi`;
      const r = await fetch(url);
      const j = await r.json();
      return j.responseData.translatedText;
    }

    const translationsArr = await Promise.all(toTranslate.map(t => translateText(t)));
    translationsArr.forEach((translated, i) => {
      const [tTitle, ...tExArr] = translated.split("\n");
      translations[mapIndexes[i]] = {
        title: tTitle,
        excerpt: tExArr.join("\n")
      };
    });
  } catch (e) {
    console.error("Translation error", e);
  } finally {
    loader.setAttribute("hidden", "");
    loaderText.setAttribute("hidden", "");
  }
}

function setActiveButton(lang) {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });
}

function updatePagination() {
  const pag = document.getElementById("pagination");
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  const info = document.getElementById("pageInfo");
  if (totalPages <= 1) {
    pag.setAttribute("hidden", "");
    return;
  }
  pag.removeAttribute("hidden");
  prev.disabled = currentPage === 1;
  next.disabled = currentPage === totalPages;
  info.textContent = `${currentPage} / ${totalPages}`;
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPosts();

  // Pagination button listeners
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  prevBtn.addEventListener("click", async () => {
    if (currentPage === 1) return;
    currentPage--;
    await fetchPosts();
  });
  nextBtn.addEventListener("click", async () => {
    if (currentPage === totalPages) return;
    currentPage++;
    await fetchPosts();
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      currentLang = lang;
      setActiveButton(lang);
      if (lang === "hi") {
        await translateMissingToHindi();
      }
      renderPosts(cachedPosts, lang);
    });
  });
});
