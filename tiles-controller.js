(function(){
  var TABS_ORDER = ["private-market", "practice-management"];
  var LABEL_FALLBACK = {
    "private-market": "Private Markets",
    "practice-management": "Practice Management"
  };

  // Data files the controller loads itself, so the page only needs ONE
  // <script> tag (this file). For local preview these are relative paths;
  // for Milemarker swap them for your hosted GitHub Pages URLs, e.g.
  //   "https://YOUR-HOST-HERE/private-market-tiles.js"
  // You can also override this list by setting window.ELV_TILE_SOURCES
  // before this script loads. Entries containing "YOUR-HOST" are skipped,
  // as are data sets already registered via their own <script> tag.
  var DATA_URLS = (window.ELV_TILE_SOURCES && window.ELV_TILE_SOURCES.length) ? window.ELV_TILE_SOURCES : [
    "https://da-elevatus.github.io/elevatusone-widgets/private-market-tiles.js",
    "https://da-elevatus.github.io/elevatusone-widgets/practice-management-tiles.js"
  ];

  var datasets = {};        // key -> { label, tiles }
  var activeKey = null;
  var ready = false;
  var els = {};

  // Registered by the data files. Safe to call before the DOM is ready.
  window.ELV_registerTileSet = function(key, label, tiles) {
    datasets[key] = {
      label: label || LABEL_FALLBACK[key] || key,
      tiles: tiles || []
    };
    if (els.tabs && els.tabs[key]) els.tabs[key].textContent = datasets[key].label;
    maybeRenderInitial();
  };

  function init() {
    els.grid = document.getElementById("elv-tiles-grid");
    els.overlay = document.getElementById("elv-tiles-overlay");
    els.modal = document.getElementById("elv-tiles-modal");
    els.modalNumber = document.getElementById("elv-tiles-modal-number");
    els.modalTitle = document.getElementById("elv-tiles-modal-title");
    els.modalBody = document.getElementById("elv-tiles-modal-body");
    els.modalClose = document.getElementById("elv-tiles-modal-close");
    els.tabs = {
      "private-market": document.getElementById("elv-tab-private-market"),
      "practice-management": document.getElementById("elv-tab-practice-management")
    };

    TABS_ORDER.forEach(function(k){
      var btn = els.tabs[k];
      if (!btn) return;
      if (datasets[k]) btn.textContent = datasets[k].label;
      btn.addEventListener("click", function(){ setActiveTab(k); });
      btn.addEventListener("mouseenter", function(){ if (k !== activeKey) btn.style.color = "#cbd5e1"; });
      btn.addEventListener("mouseleave", function(){ if (k !== activeKey) btn.style.color = "#94a3b8"; });
    });

    if (els.modalClose) els.modalClose.addEventListener("click", closeModal);
    if (els.overlay) els.overlay.addEventListener("click", function(e){ if (e.target === els.overlay) closeModal(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeModal(); });

    ready = true;
    maybeRenderInitial();
  }

  function maybeRenderInitial() {
    if (!ready || activeKey) return;
    for (var i = 0; i < TABS_ORDER.length; i++) {
      if (datasets[TABS_ORDER[i]]) { setActiveTab(TABS_ORDER[i]); return; }
    }
  }

  function setActiveTab(key) {
    if (!datasets[key]) return;
    activeKey = key;
    TABS_ORDER.forEach(function(k){
      var btn = els.tabs[k];
      if (!btn) return;
      var on = (k === key);
      btn.style.color = on ? "#e2e8f0" : "#94a3b8";
      btn.style.borderBottomColor = on ? "#C5A572" : "transparent";
      btn.style.opacity = on ? "1" : "0.8";
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderTiles(datasets[key].tiles);
  }

  function renderTiles(tiles) {
    els.grid.innerHTML = "";
    for (var i = 0; i < tiles.length; i++) {
      (function(i){
        var tile = tiles[i];
        var card = document.createElement("button");
        card.type = "button";
        card.style.cssText = "background:#1e293b; border:1px solid #334155; border-radius:8px; padding:28px 22px; cursor:pointer; text-align:left; font-family:inherit; color:inherit; transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;";
        var num = document.createElement("div");
        num.style.cssText = "font-size:12px; color:#C5A572; font-weight:700; letter-spacing:1px; margin-bottom:10px;";
        num.textContent = "0" + (i + 1);
        var h3 = document.createElement("h3");
        h3.style.cssText = "margin:0 0 10px; font-size:18px; font-weight:600; color:#e2e8f0;";
        h3.textContent = tile.title;
        var p = document.createElement("p");
        p.style.cssText = "margin:0 0 14px; font-size:14px; color:#94a3b8; line-height:1.5;";
        p.textContent = tile.summary;
        var more = document.createElement("div");
        more.style.cssText = "font-size:13px; font-weight:600; color:#C5A572;";
        more.textContent = "Read more →";
        card.appendChild(num);
        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(more);
        card.addEventListener("mouseenter", function(){ card.style.transform = "translateY(-4px)"; card.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)"; card.style.borderColor = "#C5A572"; });
        card.addEventListener("mouseleave", function(){ card.style.transform = "none"; card.style.boxShadow = "none"; card.style.borderColor = "#334155"; });
        card.addEventListener("click", function(){ openModal(tile, i); });
        els.grid.appendChild(card);
      })(i);
    }
  }

  function toEmbedUrl(src) {
    var yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) return "https://www.youtube.com/embed/" + yt[1];
    var vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return "https://player.vimeo.com/video/" + vm[1];
    return src;
  }

  // Accepts a string URL or { type, src, alt, caption, poster, autoplay, loop }
  function buildMedia(m) {
    if (!m) return null;
    if (typeof m === "string") m = { src: m };
    var src = m.src;
    if (!src) return null;

    var type = m.type;
    if (!type) {
      if (/\.(mp4|webm|ogg|ogv|mov)(\?|#|$)/i.test(src)) type = "video";
      else if (/(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(src)) type = "embed";
      else type = "image";
    }

    var wrap = document.createElement("div");
    wrap.style.cssText = "margin:0 0 22px;";
    var node;

    if (type === "video") {
      node = document.createElement("video");
      node.src = src;
      node.controls = true;
      node.preload = "metadata";
      if (m.poster) node.poster = m.poster;
      if (m.autoplay) { node.autoplay = true; node.muted = true; node.loop = !!m.loop; node.setAttribute("playsinline", ""); }
      node.style.cssText = "width:100%; border-radius:8px; display:block; background:#000;";
    } else if (type === "embed") {
      var frame = document.createElement("div");
      frame.style.cssText = "position:relative; width:100%; padding-top:56.25%; border-radius:8px; overflow:hidden; background:#000;";
      var iframe = document.createElement("iframe");
      iframe.src = toEmbedUrl(src);
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen");
      iframe.setAttribute("allowfullscreen", "");
      iframe.style.cssText = "position:absolute; inset:0; width:100%; height:100%; border:0;";
      frame.appendChild(iframe);
      node = frame;
    } else {
      node = document.createElement("img");
      node.src = src;
      node.alt = m.alt || "";
      node.loading = "lazy";
      node.style.cssText = "width:100%; border-radius:8px; display:block;";
    }

    wrap.appendChild(node);
    if (m.caption) {
      var cap = document.createElement("div");
      cap.style.cssText = "font-size:12px; color:#64748b; margin-top:8px; line-height:1.5;";
      cap.textContent = m.caption;
      wrap.appendChild(cap);
    }
    return wrap;
  }

  function buildText(str) {
    var p = document.createElement("p");
    p.style.margin = "0 0 14px";
    p.textContent = str;
    return p;
  }

  // A body item is either a string (paragraph), { text: "..." } (paragraph),
  // or a media descriptor (string URL is treated as text, so media must be an
  // object here: { type/src/... } — see buildMedia).
  function buildBodyItem(item) {
    if (item == null) return null;
    if (typeof item === "string") return buildText(item);
    if (typeof item.text === "string") return buildText(item.text);
    if (item.src || item.type) return buildMedia(item);
    return null;
  }

  function openModal(tile, i) {
    els.modalNumber.textContent = "0" + (i + 1);
    els.modalTitle.textContent = tile.title;
    els.modalBody.innerHTML = "";

    var body = tile.body || [];
    for (var j = 0; j < body.length; j++) {
      var node = buildBodyItem(body[j]);
      if (node) els.modalBody.appendChild(node);
    }

    if (els.modal) {
      els.modal.style.maxWidth = "900px";
      els.modal.style.padding = "44px 48px";
      els.modal.scrollTop = 0;
    }
    els.overlay.style.display = "flex";
    els.modalClose.focus();
  }

  function closeModal() {
    if (els.overlay) els.overlay.style.display = "none";
    // Stop any playing video / embed
    if (els.modalBody) els.modalBody.innerHTML = "";
  }

  // ---- Load the data files (see DATA_URLS above) ----
  function keyFromUrl(url) {
    for (var k in LABEL_FALLBACK) {
      if (url.indexOf(k) !== -1) return k;
    }
    return null;
  }
  DATA_URLS.forEach(function(url){
    if (!url || url.indexOf("YOUR-HOST") !== -1) return;
    var k = keyFromUrl(url);
    if (k && datasets[k]) return; // already registered via its own <script> tag
    var s = document.createElement("script");
    s.src = url;
    s.async = false;
    (document.body || document.head).appendChild(s);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
