(function () {
  "use strict";

  var pubListEl = document.getElementById("pubList");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var catFiltersEl = document.getElementById("catFilters");
  var yearFiltersEl = document.getElementById("yearFilters");

  var allPubs = [];
  var activeCategory = "전체";
  var activeYear = "전체";
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

  // 날짜가 없는 게시물은 "연도 미상"으로 분류
  function getYear(pub) {
    if (pub.date && /^\d{4}/.test(pub.date)) return pub.date.slice(0, 4);
    return "연도 미상";
  }

  function render() {
    var filtered = allPubs.filter(function (p) {
      var matchesCat = activeCategory === "전체" || p.category === activeCategory;
      var matchesYear = activeYear === "전체" || getYear(p) === activeYear;
      var matchesSearch = !searchTerm || (p.title + " " + (p.summary || "")).toLowerCase().indexOf(searchTerm) !== -1;
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
      .sort(function (a, b) { return b.no - a.no; })
      .forEach(function (p) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pub-item";
        btn.addEventListener("click", function () { openViewer(p); });

        var no = document.createElement("div");
        no.className = "pub-no";
        no.textContent = p.noLabel || p.no;
        no.setAttribute("data-prefix", p.noLabel ? "" : "No.");

        var body = document.createElement("div");
        body.className = "pub-body";

        var h3 = document.createElement("h3");
        h3.textContent = p.title;

        var meta = document.createElement("p");
        meta.className = "pub-meta";
        var pageCount = getPageList(p).length;
        var pageLabel = pageCount > 1 ? " · 전체 " + pageCount + "페이지" : "";
        if (p.body) pageLabel = "";
        meta.textContent = p.date ? (p.category + " · " + formatDate(p.date) + pageLabel) : (p.category + pageLabel);

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
        activeYear = "전체";
        Array.from(catFiltersEl.children).forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        buildYearFilters();
        render();
      });
      catFiltersEl.appendChild(btn);
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
