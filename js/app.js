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

  // 발행물이 이미지 여러 장(pages)인지, 단일 파일(file, 예: PDF)인지 둘 다 지원
  function getPageList(pub) {
    if (Array.isArray(pub.pages) && pub.pages.length) return pub.pages;
    if (pub.file) return [pub.file];
    return [];
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
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pub-item";
        btn.addEventListener("click", function () { openViewer(p); });

        var no = document.createElement("div");
        no.className = "pub-no";
        no.textContent = p.no;

        var body = document.createElement("div");
        body.className = "pub-body";

        var h3 = document.createElement("h3");
        h3.textContent = p.title;

        var meta = document.createElement("p");
        meta.className = "pub-meta";
        var pageCount = getPageList(p).length;
        var pageLabel = pageCount > 1 ? " · 전체 " + pageCount + "페이지" : "";
        meta.textContent = p.category + " · " + formatDate(p.date) + pageLabel;

        var summary = document.createElement("p");
        summary.className = "pub-summary";
        summary.textContent = p.summary || "";

        body.appendChild(h3);
        body.appendChild(meta);
        body.appendChild(summary);

        var dl = document.createElement("span");
        dl.className = "pub-dl";
        dl.textContent = "보기";

        btn.appendChild(no);
        btn.appendChild(body);
        btn.appendChild(dl);

        pubListEl.appendChild(btn);
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

  // ---------- 이미지 뷰어 (라이트박스) ----------
  var viewerEl = document.getElementById("viewer");
  var viewerImage = document.getElementById("viewerImage");
  var viewerNo = document.getElementById("viewerNo");
  var viewerTitle = document.getElementById("viewerTitle");
  var viewerDownload = document.getElementById("viewerDownload");
  var viewerPageCount = document.getElementById("viewerPageCount");
  var viewerPrev = document.getElementById("viewerPrev");
  var viewerNext = document.getElementById("viewerNext");
  var viewerClose = document.getElementById("viewerClose");

  var currentPages = [];
  var currentIndex = 0;
  var lastFocusedEl = null;

  function isPdf(path) {
    return /\.pdf(\?.*)?$/i.test(path || "");
  }

  function openViewer(pub) {
    currentPages = getPageList(pub);
    currentIndex = 0;
    if (!currentPages.length) return;

    // PDF 한 개짜리는 뷰어 대신 새 탭에서 바로 열기 (브라우저 내장 PDF 뷰어 사용)
    if (currentPages.length === 1 && isPdf(currentPages[0])) {
      window.open(currentPages[0], "_blank", "noopener");
      return;
    }

    lastFocusedEl = document.activeElement;
    viewerNo.textContent = "No." + pub.no;
    viewerTitle.textContent = pub.title;
    viewerEl.hidden = false;
    document.body.style.overflow = "hidden";
    showPage();
    viewerClose.focus();
  }

  function showPage() {
    var src = currentPages[currentIndex];
    viewerImage.src = src;
    viewerImage.alt = viewerTitle.textContent + " " + (currentIndex + 1) + "페이지";
    viewerDownload.href = src;
    viewerPageCount.textContent = (currentIndex + 1) + " / " + currentPages.length;
    viewerPrev.hidden = currentPages.length <= 1;
    viewerNext.hidden = currentPages.length <= 1;
    viewerPrev.disabled = currentIndex === 0;
    viewerNext.disabled = currentIndex === currentPages.length - 1;
  }

  function closeViewer() {
    viewerEl.hidden = true;
    document.body.style.overflow = "";
    viewerImage.src = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function goPrev() {
    if (currentIndex > 0) { currentIndex -= 1; showPage(); }
  }
  function goNext() {
    if (currentIndex < currentPages.length - 1) { currentIndex += 1; showPage(); }
  }

  viewerClose.addEventListener("click", closeViewer);
  viewerPrev.addEventListener("click", goPrev);
  viewerNext.addEventListener("click", goNext);

  viewerEl.addEventListener("click", function (e) {
    if (e.target === viewerEl) closeViewer();
  });

  document.addEventListener("keydown", function (e) {
    if (viewerEl.hidden) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
  });

  // 모바일 스와이프로 페이지 넘기기
  var touchStartX = null;
  viewerEl.addEventListener("touchstart", function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  viewerEl.addEventListener("touchend", function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx > 0) goPrev(); else goNext();
    }
    touchStartX = null;
  }, { passive: true });

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
