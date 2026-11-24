(() => {
  "use strict";
  if (window.__GM_LAYOUT__) return;
  window.__GM_LAYOUT__ = true;

  // ---- Which kind of page is this? (playgames detail/play, app, topgames) ----
  const path = location.pathname || "/";
  const KINDS = ["playgames", "app", "topgames"];
  let kind = "", marker = -1;
  for (const k of KINDS) {
    const i = path.indexOf("/" + k + "/");
    if (i >= 0) { kind = k; marker = i; break; }
  }
  if (!kind) return;
  const root = path.slice(0, marker + 1);
  const rest = path.slice(marker + kind.length + 2).split("/");
  const current = decodeURIComponent(rest[0] || "").toLowerCase();
  if (!current) return; // section index pages are left alone

  const detail = document.querySelector(".detail-page");
  if (!detail) return;
  document.body.classList.add("gm-layout", "gm-page");

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- Catalogue per section, normalised to {slug,name,logo,local,cat,href} ----
  const SOURCES = {
    playgames: {
      url: "assets/data/playgames-lite.json?v=gm1",
      norm: (g) => g && g.slug && { slug: g.slug, name: g.name, logo: g.logo, local: g.localLogo, cat: g.category, href: root + "playgames/" + encodeURIComponent(g.slug) + "/index.html" },
    },
    app: {
      url: "assets/data/apps-lite.json?v=gm1",
      norm: (g) => {
        if (!g || !g.href) return null;
        const slug = decodeURIComponent(g.href.replace(/\/+$/, "").split("/").pop());
        return { slug, name: g.title, logo: g.icon, local: g.localIcon, cat: g.category, href: root + g.href.replace(/^\//, "") };
      },
    },
    topgames: {
      url: "games.json?v=gm1",
      norm: (g) => g && g.slug && { slug: g.slug, name: g.title, logo: g.icon, local: g.localIcon, cat: g.category, href: root + "topgames/" + encodeURIComponent(g.slug) + "/index.html" },
    },
  };
  const src = SOURCES[kind];
  const noun = kind === "app" ? "Apps" : "Games"; // section labels: "Trending Apps" on app pages

  const tile = (g) => {
    const first = g.local ? root + g.local.replace(/^\//, "") : g.logo;
    const fb = g.local && g.logo ? ` onerror="this.onerror=null;this.src='${esc(g.logo)}'"` : "";
    return `<a href="${esc(g.href)}" title="${esc(g.name)}"><img src="${esc(first)}"${fb} alt="${esc(g.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
  };

  // ---- Details: rebuild as plain elements (own classes only) ----
  const oldReview = document.querySelector(".review");
  const oldEntry = oldReview && oldReview.querySelector(".entry");
  let review = null;

  const inline = (from, to) => {
    from.childNodes.forEach((n) => {
      if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.textContent)); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (t === "STRONG" || t === "B") { const e = document.createElement("strong"); inline(n, e); to.appendChild(e); }
      else if (t === "EM" || t === "I") { const e = document.createElement("em"); inline(n, e); to.appendChild(e); }
      else if (t === "A" && /^(https?:|\/|\.)/.test(n.getAttribute("href") || "")) {
        const e = document.createElement("a"); e.href = n.getAttribute("href"); e.rel = "noopener"; inline(n, e); to.appendChild(e);
      } else if (t === "BR") to.appendChild(document.createElement("br"));
      else inline(n, to);
    });
  };
  const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  if (oldReview && oldEntry) {
    review = mk("section", "gm-details gm-card gm-collapsible");
    review.innerHTML = '<h5 class="gm-title gm-details-title">Details</h5><div class="gm-details-body"></div>' +
      '<div class="gm-more-wrap"><button type="button" class="gm-more">SHOW MORE</button></div>';
    const body = review.querySelector(".gm-details-body");

    const nodes = [];
    Array.from(oldEntry.children).forEach((c) => {
      if (c.hidden) return;
      if (c.classList.contains("detail-block")) Array.from(c.children).forEach((x) => { if (!x.hidden) nodes.push(x); });
      else nodes.push(c);
    });
    let cur = null;
    const flush = () => { if (cur && cur.children.length) body.appendChild(cur); cur = null; };
    const ensure = () => cur || (cur = mk("div", "gm-d-block"));
    nodes.forEach((n) => {
      const t = n.tagName;
      if (t === "H1" || t === "H2" || t === "H3") {
        flush(); cur = mk("div", "gm-d-block");
        const h = mk("h3", "gm-d-h"); inline(n, h); cur.appendChild(h);
      } else if (t === "P") {
        if (!n.textContent.trim()) return;
        const p = mk("p", "gm-d-p"); inline(n, p); ensure().appendChild(p);
      } else if (t === "UL" || t === "OL") {
        const ul = mk("ul", "gm-d-ul");
        n.querySelectorAll(":scope > li").forEach((li) => { const l = document.createElement("li"); inline(li, l); ul.appendChild(l); });
        if (ul.children.length) ensure().appendChild(ul);
      } else if (n.classList && n.classList.contains("online-faq-list")) {
        n.querySelectorAll(".faq-item").forEach((f) => {
          const q = f.querySelector("h3, h4"), a = f.querySelector("p");
          if (q) { const h = mk("h4", "gm-d-q"); inline(q, h); ensure().appendChild(h); }
          if (a) { const p = mk("p", "gm-d-p"); inline(a, p); ensure().appendChild(p); }
        });
      } else if (n.textContent && n.textContent.trim()) {
        const p = mk("p", "gm-d-p gm-d-note"); inline(n, p); ensure().appendChild(p);
      }
    });
    flush();

    oldReview.parentNode.insertBefore(review, oldReview);
    oldReview.style.display = "none";
    review.querySelector(".gm-more").addEventListener("click", (e) => {
      const open = review.classList.toggle("gm-open");
      e.currentTarget.textContent = open ? "SHOW LESS" : "SHOW MORE";
    });
  }

  // ---- Side columns, strip, Similar, Editor's Choice ----
  fetch(root + src.url)
    .then((r) => r.json())
    .then((raw) => {
      const all = raw.map(src.norm).filter(Boolean);
      const me = all.find((g) => g.slug.toLowerCase() === current);
      const list = all.filter((g) => g.slug.toLowerCase() !== current);
      if (list.length < 8) return;

      const grid = (t, a) => `<section class="gm-card"><h5 class="gm-title">${t}</h5><div class="gm-grid">${a.map(tile).join("")}</div></section>`;

      // Trending: rotates in place every ROTATE_MS (wall-clock aligned)
      const ROTATE_MS = 3 * 60 * 1000; // use 5 * 60 * 1000 for 5 minutes
      const TREND_COUNT = 30;
      const trendPool = list.slice(0, 120);
      const trendingAt = (t) => {
        const start = (Math.floor(t / ROTATE_MS) * TREND_COUNT) % trendPool.length;
        return Array.from({ length: TREND_COUNT }, (_, i) => trendPool[(start + i) % trendPool.length]);
      };
      const newest = list.slice(-30).reverse();
      const left = document.createElement("aside");
      left.className = "gm-side-left";
      left.innerHTML = grid("Trending " + noun, trendingAt(Date.now())) + grid("Newest " + noun, newest);
      const pageLeft = detail.querySelector(".page-left");
      detail.insertBefore(left, pageLeft);

      const trendGrid = left.querySelector(".gm-grid");
      const swapTrending = () => {
        const next = trendingAt(Date.now());
        Array.from(trendGrid.children).forEach((a, i) => {
          const g = next[i];
          if (!g) return;
          a.style.transition = "opacity .4s";
          a.style.opacity = "0";
          setTimeout(() => {
            a.href = g.href;
            a.title = g.name;
            const im = a.querySelector("img");
            im.alt = g.name;
            im.onerror = function () { this.onerror = null; this.src = g.logo; };
            im.src = g.local ? root + g.local.replace(/^\//, "") : g.logo;
            a.style.opacity = "1";
          }, 400 + i * 40);
        });
      };
      setTimeout(() => { swapTrending(); setInterval(swapTrending, ROTATE_MS); }, ROTATE_MS - (Date.now() % ROTATE_MS) + 50);

      // Top icon strip across the full width
      const strip = document.createElement("div");
      strip.className = "gm-strip";
      strip.innerHTML = list.slice(12, 24).map(tile).join("");
      detail.insertBefore(strip, left);

      // Right column: original boxes are hidden (their scripts may still fill them), ours are appended
      let h = 0;
      for (const c of current) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const pool = list.slice(0, 120);
      const picks = Array.from({ length: 8 }, (_, i) => pool[(h + i * 13) % pool.length]);
      const right = detail.querySelector(".page-right");
      if (right) {
        Array.from(right.children).forEach((el) => { el.style.display = "none"; });
        const cat = me && me.cat;
        const same = list.filter((g) => g.cat === cat);
        const sim = same.concat(list.filter((g) => g.cat !== cat)).slice(0, 36);
        const wrap = document.createElement("div");
        wrap.innerHTML =
          (sim.length ? `<section class="gm-card gm-similar"><h5 class="gm-title">Similar ${noun}</h5><div class="gm-grid">${sim.map(tile).join("")}</div></section>` : "") +
          `<section class="gm-card gm-ad-box"><p class="gm-ad-label">Advertisement</p><div class="gm-grid">${picks.map(tile).join("")}</div></section>`;
        while (wrap.firstChild) right.appendChild(wrap.firstChild);
      }

      // Bottom: Similar section (moved full width) + Editor's Choice
      const choice = list.slice(24, 60);
      const editor = document.createElement("section");
      editor.className = "gm-editor gm-card";
      editor.innerHTML = `<h5 class="gm-title">Editor's Choice ${noun}</h5><div class="gm-grid">${choice.map(tile).join("")}</div>`;
      detail.parentNode.insertBefore(editor, detail.nextSibling);

      const findSimilarSection = () => {
        const byId = document.querySelector("#similarGames, #moreGames");
        if (byId) return byId.closest("section");
        return Array.from(detail.querySelectorAll(".page-left > section")).find((s) => /^(similar|more)/i.test((s.querySelector("h5") || {}).textContent || "") && s.querySelector(".game-list")) || null;
      };
      const moveSimilar = () => {
        const sec = findSimilarSection();
        if (!sec || sec.classList.contains("gm-similar-wide")) return;
        sec.classList.add("gm-similar-wide");
        detail.parentNode.insertBefore(sec, editor);
      };
      // Move only once its own script has filled it (or after a timeout), so that script keeps working
      let tries = 0;
      const waitFill = () => {
        const sec = findSimilarSection();
        const gl = sec && sec.querySelector(".game-list");
        if ((gl && gl.children.length) || tries++ > 40) moveSimilar();
        else setTimeout(waitFill, 250);
      };
      waitFill();

      // Balance: trim side columns (whole rows) so they never exceed the middle column
      const midCol = detail.querySelector(".page-left");
      const wide = () => window.matchMedia("(min-width: 1220px)").matches;
      const kids = (col) => Array.from(col.children).filter((el) => el.style.display !== "none");
      const colH = (col) => {
        col.style.alignSelf = "flex-start";
        const k = kids(col);
        k.forEach((el) => (el.style.flex = "none"));
        return k.reduce((s, el) => s + el.offsetHeight, 0) + 10 * Math.max(0, k.length - 1);
      };
      const setCount = (g, n) => Array.from(g.children).forEach((el, i) => { el.style.display = i < n ? "" : "none"; });
      const balance = () => {
        const lg = Array.from(left.querySelectorAll(".gm-grid"));
        const rg = right ? Array.from(right.querySelectorAll(".gm-similar .gm-grid")) : [];
        lg.concat(rg).forEach((g) => setCount(g, g.children.length));
        if (!wide()) return;
        const target = midCol.offsetHeight;
        const trim = (col, grids) => {
          const counts = grids.map((g) => g.children.length);
          let guard = 200;
          while (colH(col) > target && guard-- > 0) {
            let k = 0;
            counts.forEach((n, i) => { if (n > counts[k]) k = i; });
            if (counts[k] <= 3) break;
            counts[k] -= 3;
            grids.forEach((g, i) => setCount(g, counts[i]));
          }
        };
        trim(left, lg);
        if (right && rg.length) trim(right, rg);
        [left, right].forEach((col) => { if (!col) return; col.style.alignSelf = ""; Array.from(col.children).forEach((el) => (el.style.flex = "")); });
      };
      balance();
      window.addEventListener("load", balance);
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(balance, 150); });
      if (review) review.querySelector(".gm-more").addEventListener("click", () => setTimeout(balance, 60));
      if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(balance, 100); }).observe(midCol);
    })
    .catch(() => {});
})();
