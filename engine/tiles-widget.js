/* ============================================================================
   ELEVATUS ONE  ·  tiles-widget.js
   Tabs + tile grid + click-to-open modal. One copy of this file serves every
   page. It carries NO content — it fetches a topic's tiles.json and renders it.

   PAGE USAGE (Milemarker or anywhere):
     <div id="elv-tiles" data-topic="private-markets"></div>
     <script src="https://da-elevatus.github.io/elevatusone-widgets/engine/tiles-widget.js"></script>

   Attributes on the mount element:
     data-topic   topic folder name -> loads topics/<topic>/tiles.json
     data-src     explicit JSON URL, overrides data-topic (use for local preview
                  or to reuse another topic's file)

   Override the host base once per page (before this script) with:
     <script>window.ELV_BASE = "../.."</script>   // e.g. local preview

   tiles.json SHAPE:
     {
       "header": { "kicker": "...", "title": "...", "intro": "..." },   // optional
       "tabs": [
         { "key": "essentials", "label": "Private Markets", "tiles": [ TILE, ... ] },
         ...
       ]
     }
   A bare array, or { "tiles": [...] }, is accepted as a single untabbed set.

   TILE:  { "title": "...", "summary": "...", "body": [ ITEM, ... ] }
   ITEM:  "paragraph text"
        | { "text": "paragraph text" }
        | { "type": "image", "src": "potential-a.jpeg", "alt": "...", "caption": "..." }
        | { "type": "video", "src": "clip.mp4", "poster": "...", "caption": "..." }
        | { "type": "embed", "src": "https://youtube.com/watch?v=...", "caption": "..." }
   `type` is auto-detected from the URL when omitted. A bare-string body item is
   always TEXT; media must be an object. Image `src` with no "://" resolves to
   images/<topic>/<src>.
   ========================================================================== */
(function(){
  var DEFAULT_BASE = "https://da-elevatus.github.io/elevatusone-widgets";

  var C = {
    gold: "#C5A572",
    pageBg: "#0f172a",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    textStrong: "#e2e8f0",
    textMuted: "#94a3b8",
    textDim: "#64748b"
  };

  function base() {
    return String(window.ELV_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  }

  function dataUrl(mount) {
    var src = mount.getAttribute("data-src");
    if (src) return src;
    var topic = mount.getAttribute("data-topic");
    return topic ? base() + "/topics/" + topic + "/tiles.json" : null;
  }

  function resolveSrc(src, topic) {
    if (!src) return src;
    if (/^(https?:)?\/\//i.test(src) || /^data:/i.test(src)) return src;
    if (src.charAt(0) === "/") return base() + src;
    if (src.indexOf("/") === -1 && topic) return base() + "/images/" + topic + "/" + src;
    return base() + "/" + src.replace(/^\.?\//, "");
  }

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- media -------------------------------------------------------------
  function toEmbedUrl(src) {
    var yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) return "https://www.youtube.com/embed/" + yt[1];
    var vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return "https://player.vimeo.com/video/" + vm[1];
    return src;
  }

  function buildMedia(m, topic) {
    if (!m) return null;
    if (typeof m === "string") m = { src: m };
    if (!m.src) return null;
    var src = resolveSrc(m.src, topic);

    var type = m.type;
    if (!type) {
      if (/\.(mp4|webm|ogg|ogv|mov)(\?|#|$)/i.test(src)) type = "video";
      else if (/(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(src)) type = "embed";
      else type = "image";
    }

    var wrap = el("div", "margin:0 0 22px;");
    var node;

    if (type === "video") {
      node = document.createElement("video");
      node.src = src;
      node.controls = true;
      node.preload = "metadata";
      if (m.poster) node.poster = resolveSrc(m.poster, topic);
      if (m.autoplay) { node.autoplay = true; node.muted = true; node.loop = !!m.loop; node.setAttribute("playsinline", ""); }
      node.style.cssText = "width:100%; border-radius:8px; display:block; background:#000;";
    } else if (type === "embed") {
      var frame = el("div", "position:relative; width:100%; padding-top:56.25%; border-radius:8px; overflow:hidden; background:#000;");
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
    if (m.caption) wrap.appendChild(el("div", "font-size:12px; color:" + C.textDim + "; margin-top:8px; line-height:1.5;", m.caption));
    return wrap;
  }

  function buildBodyItem(item, topic) {
    if (item == null) return null;
    if (typeof item === "string") return el("p", "margin:0 0 14px;", item);
    if (typeof item.text === "string") return el("p", "margin:0 0 14px;", item.text);
    if (item.src || item.type) return buildMedia(item, topic);
    return null;
  }

  // ---- instance ---------------------------------------------------------
  function mountWidget(root) {
    var url = dataUrl(root);
    var topic = root.getAttribute("data-topic") || "";
    if (!url) { root.textContent = "tiles-widget: set data-topic or data-src"; return; }

    root.innerHTML = "";
    var loading = el("div", "padding:16px 24px; color:" + C.textDim + "; font-size:12px;", "Loading…");
    root.appendChild(loading);

    fetch(url, { credentials: "omit" })
      .then(function(r){ if (!r.ok) throw new Error(r.status + " " + url); return r.json(); })
      .then(function(data){ render(root, normalize(data), topic); })
      .catch(function(err){
        root.innerHTML = "";
        root.appendChild(el("div", "padding:16px 24px; color:#f87171; font-size:12px;", "Could not load tiles: " + err.message));
      });
  }

  function normalize(data) {
    if (Array.isArray(data)) return { header: null, tabs: [{ key: "all", label: "", tiles: data }] };
    if (data && Array.isArray(data.tabs)) return { header: data.header || null, tabs: data.tabs };
    if (data && Array.isArray(data.tiles)) return { header: data.header || null, tabs: [{ key: "all", label: "", tiles: data.tiles }] };
    return { header: null, tabs: [] };
  }

  function render(root, model, topic) {
    root.innerHTML = "";
    var state = { activeIndex: 0 };

    if (model.header) {
      var h = model.header;
      var head = el("div", "padding:48px 24px 24px; text-align:center;");
      if (h.kicker) head.appendChild(el("div", "font-size:32px; font-weight:700; letter-spacing:6px; color:" + C.gold + ";", h.kicker));
      if (h.title)  head.appendChild(el("div", "font-size:13px; font-weight:400; letter-spacing:2px; color:" + C.textMuted + "; margin-top:6px; text-transform:uppercase;", h.title));
      head.appendChild(el("div", "height:2px; background:" + C.cardBorder + "; margin:24px auto 28px; max-width:1100px;"));
      if (h.intro)  head.appendChild(el("div", "max-width:680px; margin:0 auto; color:" + C.textStrong + "; font-size:15px; line-height:1.6;", h.intro));
      root.appendChild(head);
    }

    var main = el("div", "max-width:1100px; margin:0 auto; padding:16px 24px 72px;");
    root.appendChild(main);

    var tabsBar = null;
    if (model.tabs.length > 1) {
      tabsBar = el("div", "display:flex; gap:8px; justify-content:center; margin-bottom:28px; flex-wrap:wrap;");
      tabsBar.setAttribute("role", "tablist");
      main.appendChild(tabsBar);
    }

    var grid = el("div", "display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:20px;");
    main.appendChild(grid);

    var overlay = buildModal(root);

    function selectTab(i) {
      state.activeIndex = i;
      if (tabsBar) {
        Array.prototype.forEach.call(tabsBar.children, function(btn, idx){
          var on = idx === i;
          btn.style.color = on ? C.textStrong : C.textMuted;
          btn.style.borderBottomColor = on ? C.gold : "transparent";
          btn.setAttribute("aria-selected", on ? "true" : "false");
        });
      }
      renderGrid(model.tabs[i].tiles);
    }

    function renderGrid(tiles) {
      grid.innerHTML = "";
      tiles.forEach(function(tile, i){
        var card = el("button", "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:8px; padding:28px 22px; cursor:pointer; text-align:left; font-family:inherit; color:inherit; transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;");
        card.type = "button";
        card.appendChild(el("div", "font-size:12px; color:" + C.gold + "; font-weight:700; letter-spacing:1px; margin-bottom:10px;", "0" + (i + 1)));
        card.appendChild(el("h3", "margin:0 0 10px; font-size:18px; font-weight:600; color:" + C.textStrong + ";", tile.title));
        card.appendChild(el("p", "margin:0 0 14px; font-size:14px; color:" + C.textMuted + "; line-height:1.5;", tile.summary || ""));
        card.appendChild(el("div", "font-size:13px; font-weight:600; color:" + C.gold + ";", "Read more →"));
        card.addEventListener("mouseenter", function(){ card.style.transform = "translateY(-4px)"; card.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)"; card.style.borderColor = C.gold; });
        card.addEventListener("mouseleave", function(){ card.style.transform = "none"; card.style.boxShadow = "none"; card.style.borderColor = C.cardBorder; });
        card.addEventListener("click", function(){ openModal(overlay, tile, i, topic); });
        grid.appendChild(card);
      });
    }

    if (tabsBar) {
      model.tabs.forEach(function(tab, i){
        var btn = el("button", "background:none; border:none; border-bottom:2px solid transparent; padding:8px 16px; font-family:inherit; font-size:13px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:" + C.textMuted + "; cursor:pointer; transition:color .15s ease;", tab.label || ("Tab " + (i + 1)));
        btn.type = "button";
        btn.setAttribute("role", "tab");
        btn.addEventListener("click", function(){ selectTab(i); });
        btn.addEventListener("mouseenter", function(){ if (i !== state.activeIndex) btn.style.color = "#cbd5e1"; });
        btn.addEventListener("mouseleave", function(){ if (i !== state.activeIndex) btn.style.color = C.textMuted; });
        tabsBar.appendChild(btn);
      });
    }

    selectTab(0);
  }

  // ---- modal ----------------------------------------------------------
  function buildModal(root) {
    var overlay = el("div", "display:none; position:fixed; inset:0; background:rgba(15,23,42,0.75); align-items:center; justify-content:center; padding:20px; z-index:1000;");
    var modal = el("div", "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; max-width:900px; width:100%; max-height:85vh; overflow-y:auto; border-radius:10px; padding:44px 48px; position:relative;");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var close = el("button", "position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; line-height:1; cursor:pointer; color:" + C.textMuted + "; font-family:inherit;", "×");
    close.setAttribute("aria-label", "Close");
    var number = el("div", "font-size:12px; color:" + C.gold + "; font-weight:700; letter-spacing:1px; margin-bottom:10px;");
    var title  = el("h2", "margin:0 0 16px; color:" + C.textStrong + "; font-size:22px; font-weight:700;");
    var body   = el("div", "font-size:15px; line-height:1.7; color:" + C.textMuted + ";");

    modal.appendChild(close); modal.appendChild(number); modal.appendChild(title); modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function hide() { overlay.style.display = "none"; body.innerHTML = ""; }
    close.addEventListener("click", hide);
    overlay.addEventListener("click", function(e){ if (e.target === overlay) hide(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") hide(); });

    overlay._parts = { modal: modal, close: close, number: number, title: title, body: body, hide: hide };
    return overlay;
  }

  function openModal(overlay, tile, i, topic) {
    var p = overlay._parts;
    p.number.textContent = "0" + (i + 1);
    p.title.textContent = tile.title;
    p.body.innerHTML = "";
    (tile.body || []).forEach(function(item){
      var node = buildBodyItem(item, topic);
      if (node) p.body.appendChild(node);
    });
    p.modal.scrollTop = 0;
    overlay.style.display = "flex";
    p.close.focus();
  }

  // ---- boot ----------------------------------------------------------
  function boot() {
    var mounts = document.querySelectorAll('[data-elv-widget="tiles"], #elv-tiles');
    Array.prototype.forEach.call(mounts, mountWidget);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
