/* ============================================================================
   ELEVATUS ONE  ·  takeaways-widget.js
   A "key takeaways" card — a short title and a checklist of points. One copy
   of this file serves every page. It carries NO content.

   PAGE USAGE:
     <div id="elv-takeaways" data-topic="private-markets"></div>
     <script src="https://da-elevatus.github.io/elevatusone-widgets/engine/takeaways-widget.js"></script>

   Attributes on the mount element:
     data-topic   topic folder name -> loads topics/<topic>/takeaways.json
     data-src     explicit JSON URL, overrides data-topic

   Override the host base once per page (before this script) with:
     <script>window.ELV_BASE = "../.."</script>

   takeaways.json SHAPE:
     {
       "title": "Key Takeaways",
       "intro": "optional sentence under the title",
       "points": [
         "a single takeaway",
         { "text": "a takeaway with a lead-in", "lead": "Diversification" }
       ]
     }
   ========================================================================== */
(function(){
  var DEFAULT_BASE = "https://da-elevatus.github.io/elevatusone-widgets";

  var C = {
    gold: "#C5A572",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    textStrong: "#e2e8f0",
    textMuted: "#94a3b8"
  };

  function base() {
    return String(window.ELV_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  }

  function dataUrl(mount) {
    var src = mount.getAttribute("data-src");
    if (src) return src;
    var topic = mount.getAttribute("data-topic");
    return topic ? base() + "/topics/" + topic + "/takeaways.json" : null;
  }

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  function mountWidget(root) {
    var url = dataUrl(root);
    if (!url) { root.textContent = "takeaways-widget: set data-topic or data-src"; return; }

    root.innerHTML = "";
    root.appendChild(el("div", "color:#64748b; font-size:12px; text-align:center; padding:20px;", "Loading…"));

    fetch(url, { credentials: "omit" })
      .then(function(r){ if (!r.ok) throw new Error(r.status + " " + url); return r.json(); })
      .then(function(data){ render(root, data || {}); })
      .catch(function(err){
        root.innerHTML = "";
        root.appendChild(el("div", "color:#f87171; font-size:12px; text-align:center; padding:20px;", "Could not load takeaways: " + err.message));
      });
  }

  function render(root, data) {
    root.innerHTML = "";
    var points = data.points || [];

    var card = el("div", "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:12px; padding:36px 40px; max-width:700px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.35);");
    card.appendChild(el("h2", "margin:0 0 " + (data.intro ? "8px" : "20px") + " 0; font-size:22px; font-weight:700; color:" + C.textStrong + ";", data.title || "Key Takeaways"));
    if (data.intro) card.appendChild(el("div", "font-size:14px; color:" + C.textMuted + "; line-height:1.6; margin-bottom:20px;", data.intro));

    var list = el("ul", "list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px;");
    points.forEach(function(pt){
      var row = el("li", "display:flex; align-items:flex-start; gap:12px;");
      row.appendChild(el("span", "flex:0 0 auto; margin-top:2px; color:" + C.gold + "; font-weight:700; font-size:14px;", "✓"));

      var text = el("span", "font-size:14px; color:" + C.textMuted + "; line-height:1.6;");
      if (pt && typeof pt === "object") {
        if (pt.lead) {
          var lead = el("strong", "color:" + C.textStrong + "; font-weight:700;", pt.lead + " — ");
          text.appendChild(lead);
        }
        text.appendChild(document.createTextNode(pt.text || ""));
      } else {
        text.textContent = String(pt);
      }
      row.appendChild(text);
      list.appendChild(row);
    });
    card.appendChild(list);
    root.appendChild(card);
  }

  function boot() {
    var mounts = document.querySelectorAll('[data-elv-widget="takeaways"], #elv-takeaways');
    Array.prototype.forEach.call(mounts, mountWidget);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
