const POSTS_URL = "posts.json";

const elements = {
  featured: document.getElementById("featured-post"),
  grid: document.getElementById("posts-grid"),
  empty: document.getElementById("posts-empty"),
  summary: document.getElementById("results-summary"),
  filters: Array.from(document.querySelectorAll(".filter-chip")),
  navFilters: Array.from(document.querySelectorAll("[data-nav-filter]"))
};

let publishedPosts = [];
let activeCategory = "Wszystkie";

function formatDate(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPublishedPosts(posts) {
  if (!Array.isArray(posts)) {
    return [];
  }

  return posts
    .filter((post) => post && post.status === "published" && post.title && post.url)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function getFeaturedPost(posts) {
  if (!posts.length) {
    return null;
  }

  const featuredPosts = posts.filter((post) => post.featured);
  return featuredPosts[0] || posts[0];
}

function renderTagRow(tags = []) {
  if (!Array.isArray(tags) || !tags.length) {
    return "";
  }

  return `
    <div class="tag-row">
      ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderFeaturedPost(post) {
  if (!elements.featured) {
    return;
  }

  if (!post) {
    elements.featured.innerHTML = `<div class="empty-state">Brak opublikowanych wpisów do wyróżnienia.</div>`;
    return;
  }

  elements.featured.innerHTML = `
    <article class="featured-card">
      <div class="featured-copy">
        <span class="category-badge">${escapeHtml(post.category || "Research")}</span>
        <h3 class="featured-title"><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h3>
        <p class="featured-excerpt">${escapeHtml(post.excerpt || "")}</p>
        <div class="meta-row">
          <span class="meta-chip">${escapeHtml(formatDate(post.date || ""))}</span>
          <span class="meta-chip">${escapeHtml(post.readingTime || "5 min")}</span>
          <span class="meta-chip">${escapeHtml(post.slug || "")}</span>
        </div>
        <div class="card-footer">
          <a class="read-more" href="${escapeHtml(post.url)}">Czytaj wpis <span>+</span></a>
        </div>
      </div>

      <aside class="featured-side">
        <article class="metric-card">
          <span>Kategoria</span>
          <strong>${escapeHtml(post.category || "Research")}</strong>
        </article>
        <article class="metric-card">
          <span>Status</span>
          <strong>${escapeHtml(post.status)}</strong>
        </article>
        <article class="metric-card">
          <span>Tagi</span>
          <strong>${Array.isArray(post.tags) && post.tags.length ? escapeHtml(post.tags.slice(0, 2).join(" / ")) : "Brak"}</strong>
        </article>
        ${renderTagRow(post.tags)}
      </aside>
    </article>
  `;
}

function renderPosts(posts) {
  if (!elements.grid || !elements.empty || !elements.summary) {
    return;
  }

  const filteredPosts = activeCategory === "Wszystkie"
    ? posts
    : posts.filter((post) => post.category === activeCategory);

  elements.summary.textContent = activeCategory === "Wszystkie"
    ? `Wyświetlanych wpisów: ${filteredPosts.length}`
    : `Wyświetlanych wpisów w kategorii "${activeCategory}": ${filteredPosts.length}`;

  if (!filteredPosts.length) {
    elements.grid.innerHTML = "";
    elements.empty.hidden = false;
    return;
  }

  elements.empty.hidden = true;
  elements.grid.innerHTML = filteredPosts.map((post) => `
    <article class="post-card">
      <span class="category-badge">${escapeHtml(post.category || "Research")}</span>
      <h3 class="post-title"><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h3>
      <div class="meta-row">
        <span class="meta-chip">${escapeHtml(formatDate(post.date || ""))}</span>
        <span class="meta-chip">${escapeHtml(post.readingTime || "5 min")}</span>
      </div>
      <p class="post-excerpt">${escapeHtml(post.excerpt || "")}</p>
      ${renderTagRow(post.tags)}
      <div class="card-footer">
        <a class="read-more" href="${escapeHtml(post.url)}">Czytaj dalej <span>+</span></a>
      </div>
    </article>
  `).join("");
}

function updateActiveFilter(nextCategory) {
  activeCategory = nextCategory;

  elements.filters.forEach((button) => {
    const isActive = button.dataset.category === nextCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderPosts(publishedPosts);
}

function bindFilters() {
  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      updateActiveFilter(button.dataset.category || "Wszystkie");
    });
  });

  elements.navFilters.forEach((link) => {
    link.addEventListener("click", () => {
      const category = link.dataset.navFilter;
      if (category) {
        updateActiveFilter(category);
      }
    });
  });
}

async function loadPosts() {
  if (!elements.summary) {
    return;
  }

  try {
    const response = await fetch(POSTS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    publishedPosts = getPublishedPosts(data);

    renderFeaturedPost(getFeaturedPost(publishedPosts));
    renderPosts(publishedPosts);
  } catch (error) {
    console.error("Nie udało się załadować posts.json", error);

    if (elements.featured) {
      elements.featured.innerHTML = `<div class="empty-state">Nie udało się załadować wyróżnionego wpisu.</div>`;
    }

    if (elements.grid) {
      elements.grid.innerHTML = "";
    }

    if (elements.empty) {
      elements.empty.hidden = false;
      elements.empty.textContent = "Nie udało się załadować listy wpisów.";
    }

    elements.summary.textContent = "Błąd ładowania danych.";
  }
}

bindFilters();
loadPosts();
