(function () {
  "use strict";

  var pubListEl = document.getElementById("pubList");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var catFiltersEl = document.getElementById("catFilters");

  var allPubs = [];
  var activeCategory = "전체";
  var searchTerm = "";

  function formatDate(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
  }

  function render() {
    var filtered = allPubs.filter(function (p) {
      var matchesCat = activeCategory === "전체" || p.category === activeCategory;
      var matchesSearch = !searchTerm || (p.title + " " + (p.summary || "")).toLowerCase().indexOf(searchTerm) !== -1;
      return matchesCat && matchesSearch;
    });

    pubListEl.innerHTML = "";

    if (filtered.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    filtered
      .slice()
      .sort(function (a, b) { return b.no - a.no; })
      .forEach(function (p) {
        var a = document.createElement("a");
        a.className = "pub-item";
        a.href = p.file;
        a.target = "_blank";
        a.rel = "noopener";

        var no = document.createElement("div");
        no.className = "pub-no";
        no.textContent = p.no;

        var body = document.createElement("div");
        body.className = "pub-body";

        var h3 = document.createElement("h3");
        h3.textContent = p.title;

        var meta = document.createElement("p");
        meta.className = "pub-meta";
        meta.textContent = p.category + " · " + formatDate(p.date);

        var summary = document.createElement("p");
        summary.className = "pub-summary";
        summary.textContent = p.summary || "";

        body.appendChild(h3);
        body.appendChild(meta);
        body.appendChild(summary);

        var dl = document.createElement("span");
        dl.className = "pub-dl";
        dl.textContent = "PDF 보기";

        a.appendChild(no);
        a.appendChild(body);
        a.appendChild(dl);

        pubListEl.appendChild(a);
      });
  }

  function buildCategoryFilters() {
    var cats = ["전체"].concat(
      Array.from(new Set(allPubs.map(function (p) { return p.category; })))
    );
    catFiltersEl.innerHTML = "";
    cats.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cat;
      btn.setAttribute("aria-pressed", cat === activeCategory ? "true" : "false");
      btn.addEventListener("click", function () {
        activeCategory = cat;
        Array.from(catFiltersEl.children).forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render();
      });
      catFiltersEl.appendChild(btn);
    });
  }

  searchInput.addEventListener("input", function (e) {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  fetch("data/publications.json")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allPubs = data;
      buildCategoryFilters();
      render();
    })
    .catch(function (err) {
      pubListEl.innerHTML = "<p class='empty-state'>간행물 목록을 불러오지 못했습니다.</p>";
      console.error(err);
    });

  // ---------- PWA: service worker registration ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function (err) {
        console.warn("Service worker registration failed:", err);
      });
    });
  }

  // ---------- PWA: install prompt ----------
  var deferredPrompt = null;
  var installBanner = document.getElementById("installBanner");
  var installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.hidden = false;
  });

  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      installBanner.hidden = true;
    });
  });

  window.addEventListener("appinstalled", function () {
    installBanner.hidden = true;
  });
})();
