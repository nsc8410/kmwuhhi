(function () {
  "use strict";

  var panelsWrapEl = document.getElementById("panelsWrap");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");

  var allPubs = [];
  var searchTerm = "";
  var expandedCategory = null;
  var expandedYear = null;
  var YEAR_GROUPED_CATEGORY = "과거소식지"; // 이 이름의 박스만 연도별로 묶어서 보여줌 (띄어쓰기는 무시하고 비교함)

  function normalizeCatName(s) {
    return (s || "").replace(/\s+/g, "");
  }

  var CATEGORY_ORDER = ["교섭속보", "지부쟁대위", "각종제도"]; // data/categories.json을 못 읽어오면 이 기본값 사용
  var FIXED_CATEGORIES = CATEGORY_ORDER;

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

  function sortPubs(list) {
    return list.slice().sort(function (a, b) {
      // 날짜가 있는 항목을 우선 최신순으로, 날짜 없는 옛 자료는 그 아래에서 호수순
      var da = a.date || "";
      var db = b.date || "";
      if (da !== db) return db.localeCompare(da);
      return b.no - a.no;
    });
  }

  // 날짜가 없는 게시물은 "연도 미상"으로 분류
  function getYear(p) {
    if (p.date && /^\d{4}/.test(p.date)) return p.date.slice(0, 4);
    return "연도 미상";
  }

  function buildRow(p) {
    var row = document.createElement("button");
    row.type = "button";
    row.className = "panel-row";
    row.addEventListener("click", function () { openViewer(p); });

    var top = document.createElement("div");
    top.className = "panel-row-top";
    var noSpan = document.createElement("span");
    noSpan.textContent = p.noLabel ? p.noLabel : ("No." + p.no);
    var dateSpan = document.createElement("span");
    dateSpan.textContent = p.date ? formatDate(p.date) : "";
    top.appendChild(noSpan);
    top.appendChild(dateSpan);

    var h3 = document.createElement("h3");
    h3.textContent = p.title;

    row.appendChild(top);
    row.appendChild(h3);

    if (p.summary) {
      var summary = document.createElement("p");
      summary.textContent = p.summary;
      row.appendChild(summary);
    }

    return row;
  }

  // "과거소식지" 박스 전용: 연도별로 묶어서 보여줌 (연도를 눌러야 그 해 목록이 펼쳐짐)
  function buildYearGroupedList(itemsInCat, term) {
    var wrap = document.createElement("div");

    var byYear = {};
    itemsInCat.forEach(function (p) {
      var y = getYear(p);
      (byYear[y] = byYear[y] || []).push(p);
    });

    var years = Object.keys(byYear).sort(function (a, b) {
      if (a === "연도 미상") return 1;
      if (b === "연도 미상") return -1;
      return b.localeCompare(a);
    });

    years.forEach(function (year) {
      var itemsInYear = byYear[year];
      var isYearOpen = term ? true : (expandedYear === year);

      var group = document.createElement("div");
      group.className = "year-group" + (isYearOpen ? " year-open" : "");

      var yHead = document.createElement("button");
      yHead.type = "button";
      yHead.className = "year-head";
      yHead.innerHTML = "<span>" + year + "</span><span class='year-count'>" + itemsInYear.length + "건</span>";
      yHead.addEventListener("click", function () {
        if (term) return;
        expandedYear = (expandedYear === year) ? null : year;
        render();
      });
      group.appendChild(yHead);

      if (isYearOpen) {
        var yList = document.createElement("div");
        yList.className = "year-list";
        sortPubs(itemsInYear).forEach(function (p) { yList.appendChild(buildRow(p)); });
        group.appendChild(yList);
      }

      wrap.appendChild(group);
    });

    return wrap;
  }

  function render() {
    var term = searchTerm.toLowerCase();
    var matches = allPubs.filter(function (p) {
      return !term || (p.title + " " + (p.summary || "")).toLowerCase().indexOf(term) !== -1;
    });

    if (term && matches.length === 0) {
      panelsWrapEl.innerHTML = "";
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    var cats = Array.from(new Set(FIXED_CATEGORIES.concat(allPubs.map(function (p) { return p.category; }))));
    cats.sort(function (a, b) {
      var ia = CATEGORY_ORDER.indexOf(a);
      var ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1) ia = CATEGORY_ORDER.length;
      if (ib === -1) ib = CATEGORY_ORDER.length;
      return ia - ib;
    });

    panelsWrapEl.innerHTML = "";

    cats.forEach(function (cat) {
      var itemsInCat = sortPubs(matches.filter(function (p) { return p.category === cat; }));

      var isOpen = term ? true : (expandedCategory === cat);
      var panel = document.createElement("section");
      panel.className = "panel" + (isOpen ? " panel-open" : "");

      var head = document.createElement("button");
      head.type = "button";
      head.className = "panel-head";
      var h2 = document.createElement("h2");
      h2.textContent = cat;
      var count = document.createElement("span");
      count.className = "panel-count";
      count.textContent = itemsInCat.length + "건";
      head.appendChild(h2);
      head.appendChild(count);
      head.addEventListener("click", function () {
        if (term) return; // 검색 중에는 전부 펼쳐진 상태 유지
        expandedCategory = (expandedCategory === cat) ? null : cat;
        expandedYear = null;
        render();
      });
      panel.appendChild(head);

      if (isOpen) {
        var list = document.createElement("div");
        list.className = "panel-list";

        if (itemsInCat.length === 0) {
          var empty = document.createElement("p");
          empty.className = "panel-empty";
          empty.textContent = term ? "검색 결과가 없습니다." : "아직 등록된 내용이 없습니다.";
          list.appendChild(empty);
        } else if (normalizeCatName(cat) === normalizeCatName(YEAR_GROUPED_CATEGORY)) {
          list.appendChild(buildYearGroupedList(itemsInCat, term));
        } else {
          itemsInCat.forEach(function (p) { list.appendChild(buildRow(p)); });
        }

        panel.appendChild(list);
      }

      panelsWrapEl.appendChild(panel);
    });
  }

  searchInput.addEventListener("input", function (e) {
    searchTerm = e.target.value.trim();
    render();
  });

  fetch("data/categories.json")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (cats) {
      if (Array.isArray(cats) && cats.length) {
        CATEGORY_ORDER = cats;
        FIXED_CATEGORIES = cats;
      }
    })
    .catch(function () { /* 파일이 없으면 기본값 그대로 사용 */ })
    .then(function () {
      return fetch("data/publications.json").then(function (res) { return res.json(); });
    })
    .then(function (data) {
      allPubs = data;
      render();
    })
    .catch(function (err) {
      panelsWrapEl.innerHTML = "<p class='empty-state'>간행물 목록을 불러오지 못했습니다.</p>";
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
