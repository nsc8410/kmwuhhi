(function () {
  "use strict";

  var tabsEl = document.getElementById("boardTabs");
  var pubListEl = document.getElementById("pubList");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var yearFiltersEl = document.getElementById("yearFilters");

  var allPubs = [];
  var activeCategory = "전체";
  var activeYear = "전체";
  var searchTerm = "";

  var CATEGORY_ORDER = ["교섭속보", "지부쟁대위", "각종제도"];
  var FIXED_CATEGORIES = ["교섭속보", "지부쟁대위", "각종제도"]; // 내용이 없어도 항상 탭으로 보여줄 카테고리

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

  // 날짜가 없는 게시물은 "연도 미상"으로 분류
  function getYear(pub) {
    if (pub.date && /^\d{4}/.test(pub.date)) return pub.date.slice(0, 4);
    return "연도 미상";
  }

  function buildTabs() {
    var cats = Array.from(new Set(FIXED_CATEGORIES.concat(allPubs.map(function (p) { return p.category; }))));
    cats.sort(function (a, b) {
      var ia = CATEGORY_ORDER.indexOf(a);
      var ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1) ia = CATEGORY_ORDER.length;
      if (ib === -1) ib = CATEGORY_ORDER.length;
      return ia - ib;
    });
    var options = ["전체"].concat(cats);

    tabsEl.innerHTML = "";
    options.forEach(function (cat) {
      var count = cat === "전체" ? allPubs.length : allPubs.filter(function (p) { return p.category === cat; }).length;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat === activeCategory ? "true" : "false");
      btn.innerHTML = cat + '<span class="tab-count">' + count + '건</span>';
      btn.addEventListener("click", function () {
        activeCategory = cat;
        activeYear = "전체";
        Array.from(tabsEl.children).forEach(function (b) {
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        buildYearFilters();
        render();
      });
      tabsEl.appendChild(btn);
    });
  }

  function render() {
    var filtered = allPubs.filter(function (p) {
      var matchesCat = activeCategory === "전체" || p.category === activeCategory;
      var matchesYear = activeYear === "전체" || getYear(p) === activeYear;
      var matchesSearch = !searchTerm || (p.title + " " + (p.summary || "")).toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
      return matchesCat && matchesYear && matchesSearch;
    });

    pubListEl.innerHTML = "";

    if (filtered.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    filtered
      .slice()
      .sort(function (a, b) {
        // 날짜가 있는 항목을 우선 최신순으로, 날짜 없는 옛 자료는 그 아래에서 호수순
        var da = a.date || "";
        var db = b.date || "";
        if (da !== db) return db.localeCompare(da);
        return b.no - a.no;
      })
      .forEach(function (p) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "board-row";
        row.addEventListener("click", function () { openViewer(p); });

        var no = document.createElement("div");
        no.className = "row-no";
        no.textContent = p.noLabel || p.no;

        var body = document.createElement("div");
        body.className = "row-body";

        var tags = document.createElement("div");
        tags.className = "row-tags";
        var catTag = document.createElement("span");
        catTag.className = "row-tag";
        catTag.textContent = p.category;
        tags.appendChild(catTag);

        var h3 = document.createElement("h3");
        h3.textContent = p.title;

        var summary = document.createElement("p");
        summary.className = "row-summary";
        summary.textContent = p.summary || "";

        var pageCount = getPageList(p).length;
        var pageLabel = pageCount > 1 && !p.body ? (" · 전체 " + pageCount + "페이지") : "";

        var metaMobile = document.createElement("div");
        metaMobile.className = "row-meta-mobile";
        metaMobile.textContent = (p.date ? formatDate(p.date) : "") + pageLabel;

        body.appendChild(tags);
        body.appendChild(h3);
        if (p.summary) body.appendChild(summary);
        body.appendChild(metaMobile);

        var date = document.createElement("div");
        date.className = "row-date";
        date.textContent = p.date ? formatDate(p.date) : "-";

        row.appendChild(no);
        row.appendChild(body);
        row.appendChild(date);

        pubListEl.appendChild(row);
      });
  }

  // 선택된 카테고리 안에 등장하는 연도들로 연도 버튼 목록을 만듦.
  // "전체" 카테고리이거나 연도가 1종류뿐이면 연도 줄 자체를 숨김.
  function buildYearFilters() {
    yearFiltersEl.innerHTML = "";

    if (activeCategory === "전체") {
      yearFiltersEl.hidden = true;
      return;
    }

    var itemsInCat = allPubs.filter(function (p) { return p.category === activeCategory; });
    var years = Array.from(new Set(itemsInCat.map(getYear)));

    if (years.length <= 1) {
      yearFiltersEl.hidden = true;
      return;
    }

    // 연도 미상은 맨 뒤로, 나머지는 최신순
    years.sort(function (a, b) {
      if (a === "연도 미상") return 1;
      if (b === "연도 미상") return -1;
      return b.localeCompare(a);
    });

    var options = ["전체"].concat(years);
    yearFiltersEl.hidden = false;

    options.forEach(function (year) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = year;
      btn.setAttribute("aria-pressed", year === activeYear ? "true" : "false");
      btn.addEventListener("click", function () {
        activeYear = year;
        Array.from(yearFiltersEl.children).forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render();
      });
      yearFiltersEl.appendChild(btn);
    });
  }

  searchInput.addEventListener("input", function (e) {
    searchTerm = e.target.value.trim();
    render();
  });

  fetch("data/publications.json")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allPubs = data;
      buildTabs();
      render();
    })
    .catch(function (err) {
      pubListEl.innerHTML = "<p class='empty-state'>간행물 목록을 불러오지 못했습니다.</p>";
      console.error(err);
    });

  // ---------- 이미지/텍스트 뷰어 (라이트박스) ----------
  var viewerEl = document.getElementById("viewer");
  var viewerImage = document.getElementById("viewerImage");
  var viewerText = document.getElementById("viewerText");
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
    // 텍스트 본문(body)이 있는 게시물: 이미지 없이 글자 그대로 표시
    if (pub.body) {
      lastFocusedEl = document.activeElement;
      currentPages = [];
      viewerNo.textContent = pub.noLabel ? pub.noLabel : ("No." + pub.no);
      viewerTitle.textContent = pub.title;
      viewerImage.hidden = true;
      viewerImage.src = "";
      viewerText.hidden = false;
      viewerText.textContent = pub.body;
      viewerPageCount.textContent = "";
      viewerPrev.hidden = true;
      viewerNext.hidden = true;
      if (pub.sourceUrl) {
        viewerDownload.hidden = false;
        viewerDownload.href = pub.sourceUrl;
        viewerDownload.textContent = "원문 보기";
        viewerDownload.removeAttribute("download");
      } else {
        viewerDownload.hidden = true;
      }
      viewerEl.hidden = false;
      document.body.style.overflow = "hidden";
      viewerClose.focus();
      return;
    }

    currentPages = getPageList(pub);
    currentIndex = 0;
    if (!currentPages.length) return;

    // PDF 한 개짜리는 뷰어 대신 새 탭에서 바로 열기 (브라우저 내장 PDF 뷰어 사용)
    if (currentPages.length === 1 && isPdf(currentPages[0])) {
      window.open(currentPages[0], "_blank", "noopener");
      return;
    }

    lastFocusedEl = document.activeElement;
    viewerNo.textContent = pub.noLabel ? pub.noLabel : ("No." + pub.no);
    viewerTitle.textContent = pub.title;
    viewerImage.hidden = false;
    viewerText.hidden = true;
    viewerDownload.hidden = false;
    viewerDownload.setAttribute("download", "");
    viewerDownload.textContent = "원본 저장";
    viewerEl.hidden = false;
    document.body.style.overflow = "hidden";
    showPage();
    viewerClose.focus();
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function showPage() {
    var src = currentPages[currentIndex];
    viewerImage.src = src;
    viewerImage.alt = viewerTitle.textContent + " " + (currentIndex + 1) + "페이지";
    viewerDownload.href = src;
    if (isExternal(src)) {
      // 외부(Flickr 등) 이미지는 브라우저 보안 정책상 강제 다운로드가 안 되므로 새 탭으로 열기
      viewerDownload.removeAttribute("download");
      viewerDownload.target = "_blank";
      viewerDownload.rel = "noopener";
      viewerDownload.textContent = "새 탭에서 열기 (우클릭 저장)";
    } else {
      viewerDownload.setAttribute("download", "");
      viewerDownload.removeAttribute("target");
      viewerDownload.textContent = "원본 저장";
    }
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
    viewerText.textContent = "";
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
  var installText = document.getElementById("installText");

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  // 안드로이드/크롬: 브라우저가 자동으로 설치 가능 신호를 주면 배너 표시
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

  // 아이폰(사파리)은 자동 설치 신호 자체를 지원하지 않으므로, 안내 문구로 대신 표시
  if (isIos() && !isStandalone()) {
    installText.innerHTML = "<strong>공유 버튼(⬆)</strong>을 누른 뒤 <strong>'홈 화면에 추가'</strong>를 선택하면 앱처럼 쓸 수 있습니다.";
    installBtn.hidden = true;
    installBanner.hidden = false;
  }
})();
