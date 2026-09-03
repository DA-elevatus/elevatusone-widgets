(function(){
  var tiles = [
    { title: "Understanding the Opportunity", summary: "Why private markets have become a core building block in modern portfolios.",
      body: ["Private markets \u2014 private equity, private credit, real estate, and infrastructure \u2014 give investors exposure to companies and assets that never trade on public exchanges.",
             "As more of the economy stays private for longer, advisors who understand this space can offer clients a broader, more diversified opportunity set."] },
    { title: "Diversification Beyond Stocks and Bonds", summary: "How private allocations can smooth returns and reduce correlation to public markets.",
      body: ["Private assets often behave differently than public stocks and bonds, which can help dampen overall portfolio volatility.",
             "That said, they come with trade-offs \u2014 including reduced liquidity \u2014 that need to be weighed against the diversification benefit."] },
    { title: "Talking to Clients About Illiquidity", summary: "Framing the liquidity trade-off in terms clients actually understand.",
      body: ["Private investments typically lock up capital for years, which can be unfamiliar territory for clients used to daily liquidity.",
             "Clear, plain-language conversations about time horizon and access to capital are essential before any allocation is made."] },
    { title: "Manager Selection Matters", summary: "Why the dispersion between top and bottom private markets managers is so wide.",
      body: ["Unlike public index investing, the gap in performance between skilled and unskilled private markets managers can be substantial.",
             "Track record, sourcing capability, and operational expertise all become critical parts of due diligence."] },
    { title: "Building a Practice Around Alternatives", summary: "Practical steps for introducing private markets into an existing practice.",
      body: ["Advisors who successfully integrate private markets tend to start with education \u2014 for themselves and their clients \u2014 before moving to implementation.",
             "Vehicle structure, minimums, and reporting cadence all shape how smoothly this fits into an existing practice."] },
    { title: "Looking Ahead", summary: "Where the private markets landscape is headed for individual investors.",
      body: ["Access to private markets has been expanding, with newer fund structures designed specifically for individual investors.",
             "Advisors who build fluency now are positioning themselves \u2014 and their clients \u2014 for a landscape where private markets play a larger role."] }
  ];
 
  var grid = document.getElementById("elv-tiles-grid");
  var overlay = document.getElementById("elv-tiles-overlay");
  var modalNumber = document.getElementById("elv-tiles-modal-number");
  var modalTitle = document.getElementById("elv-tiles-modal-title");
  var modalBody = document.getElementById("elv-tiles-modal-body");
  var modalClose = document.getElementById("elv-tiles-modal-close");
 
  function renderTiles() {
    grid.innerHTML = "";
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
        more.textContent = "Read more \u2192";
        card.appendChild(num);
        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(more);
        card.addEventListener("mouseenter", function(){ card.style.transform = "translateY(-4px)"; card.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)"; card.style.borderColor = "#C5A572"; });
        card.addEventListener("mouseleave", function(){ card.style.transform = "none"; card.style.boxShadow = "none"; card.style.borderColor = "#334155"; });
        card.addEventListener("click", function(){ openModal(i); });
        grid.appendChild(card);
      })(i);
    }
  }
 
  function openModal(i) {
    var tile = tiles[i];
    modalNumber.textContent = "0" + (i + 1);
    modalTitle.textContent = tile.title;
    modalBody.innerHTML = "";
    for (var j = 0; j < tile.body.length; j++) {
      var p = document.createElement("p");
      p.style.margin = "0 0 14px";
      p.textContent = tile.body[j];
      modalBody.appendChild(p);
    }
    overlay.style.display = "flex";
    modalClose.focus();
  }
 
  function closeModal() {
    overlay.style.display = "none";
  }
 
  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", function(e){ if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeModal(); });
 
  renderTiles();