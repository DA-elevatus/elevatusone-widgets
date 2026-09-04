/* ============================================================================
   ELEVATUS ONE  ·  quiz-widget.js
   Multi-question flow with per-question feedback and a final score. One copy
   of this file serves every page. It carries NO content.

   PAGE USAGE:
     <div id="elv-quiz" data-topic="private-markets"></div>
     <script src="https://da-elevatus.github.io/elevatusone-widgets/engine/quiz-widget.js"></script>

   Attributes on the mount element:
     data-topic   topic folder name -> loads topics/<topic>/quiz.json
     data-src     explicit JSON URL, overrides data-topic

   Override the host base once per page (before this script) with:
     <script>window.ELV_BASE = "../.."</script>

   quiz.json SHAPE:
     {
       "title": "Quick Confidence Check",
       "questions": [
         {
           "question": "...",
           "options": ["...", "...", "...", "..."],
           "correctIndex": 1,
           "explanation": "shown after answering (optional)"
         }
       ]
     }
   ========================================================================== */
(function(){
  var DEFAULT_BASE = "https://da-elevatus.github.io/elevatusone-widgets";

  var C = {
    gold: "#C5A572",
    goldWash: "rgba(197,165,114,0.12)",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    optionBg: "#0f172a",
    optionBorder: "#334155",
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
    return topic ? base() + "/topics/" + topic + "/quiz.json" : null;
  }

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  function mountWidget(root) {
    var url = dataUrl(root);
    if (!url) { root.textContent = "quiz-widget: set data-topic or data-src"; return; }

    root.innerHTML = "";
    root.appendChild(el("div", "color:" + C.textDim + "; font-size:13px; text-align:center; padding:20px;", "Loading quiz…"));

    fetch(url, { credentials: "omit" })
      .then(function(r){ if (!r.ok) throw new Error(r.status + " " + url); return r.json(); })
      .then(function(data){ runQuiz(root, data || {}); })
      .catch(function(err){
        root.innerHTML = "";
        root.appendChild(el("div", "color:#f87171; font-size:12px; text-align:center; padding:20px;", "Could not load quiz: " + err.message));
      });
  }

  function runQuiz(root, data) {
    var state = {
      title: data.title || "Quick Confidence Check",
      questions: data.questions || [],
      index: 0,
      answered: (data.questions || []).map(function(){ return null; })
    };

    function render() {
      root.innerHTML = "";
      if (!state.questions.length) {
        root.appendChild(el("div", "color:" + C.textMuted + "; font-size:13px; text-align:center; padding:20px;", "No questions."));
        return;
      }

      var card = el("div", "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:12px; padding:40px; max-width:700px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.35);");

      card.appendChild(el("div", "font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:" + C.gold + "; margin-bottom:8px;", "Question " + (state.index + 1) + " of " + state.questions.length));
      card.appendChild(el("h2", "margin:0 0 20px 0; font-size:24px; font-weight:700; color:" + C.textStrong + ";", state.title));

      var q = state.questions[state.index];
      card.appendChild(el("div", "font-size:16px; font-weight:600; color:" + C.textStrong + "; margin-bottom:20px; line-height:1.5;", q.question));

      var optionsWrap = el("div", "display:flex; flex-direction:column; gap:12px; margin-bottom:20px;");
      var selected = state.answered[state.index];
      var showFeedback = selected !== null;

      q.options.forEach(function(optionText, i){
        var isSelected = selected === i;
        var isCorrect = i === q.correctIndex;

        var borderColor = C.optionBorder, bg = C.optionBg, textColor = C.textStrong;
        if (showFeedback) {
          if (isCorrect) { borderColor = C.gold; bg = C.goldWash; }
          else if (isSelected) { textColor = C.textDim; }
        }

        var opt = el("button", "display:flex; align-items:center; gap:12px; text-align:left; padding:14px 16px; border-radius:8px; border:1px solid " + borderColor + "; background:" + bg + "; color:" + textColor + "; font-family:inherit; font-size:14px; font-weight:500; cursor:" + (showFeedback ? "default" : "pointer") + "; transition:border-color .15s ease, background .15s ease;");
        opt.type = "button";

        var circle = el("span", "flex:0 0 auto; width:18px; height:18px; border-radius:50%; border:2px solid " + (showFeedback && isCorrect ? C.gold : "#475569") + "; display:inline-block; position:relative;");
        if (showFeedback && isCorrect) circle.appendChild(el("span", "position:absolute; inset:3px; border-radius:50%; background:" + C.gold + ";"));

        opt.appendChild(circle);
        opt.appendChild(el("span", null, optionText));

        if (!showFeedback) {
          opt.addEventListener("mouseenter", function(){ opt.style.borderColor = C.gold; });
          opt.addEventListener("mouseleave", function(){ opt.style.borderColor = C.optionBorder; });
          opt.addEventListener("click", function(){ state.answered[state.index] = i; render(); });
        }
        optionsWrap.appendChild(opt);
      });
      card.appendChild(optionsWrap);

      if (showFeedback) {
        var isCorrectAnswer = selected === q.correctIndex;
        card.appendChild(el("div", "font-size:14px; font-weight:700; color:" + (isCorrectAnswer ? C.gold : C.textMuted) + "; margin-bottom:8px;", isCorrectAnswer ? "Yes, Correct Answer" : "Not quite — correct answer highlighted above"));
        if (q.explanation) card.appendChild(el("div", "font-size:13px; color:" + C.textMuted + "; line-height:1.6; margin-bottom:20px;", q.explanation));

        var isLast = state.index === state.questions.length - 1;
        var nextBtn = el("button", "background:" + C.gold + "; color:#1e293b; border:none; border-radius:6px; padding:12px 24px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; margin-top:10px;", isLast ? "See Results →" : "Next →");
        nextBtn.type = "button";
        nextBtn.addEventListener("click", function(){
          if (isLast) renderResults();
          else { state.index++; render(); }
        });
        card.appendChild(nextBtn);
      }

      root.appendChild(card);
    }

    function renderResults() {
      root.innerHTML = "";
      var score = 0;
      state.questions.forEach(function(q, i){ if (state.answered[i] === q.correctIndex) score++; });

      var card = el("div", "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:12px; padding:48px 40px; max-width:700px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.35); text-align:center;");
      card.appendChild(el("h2", "margin:0 0 12px 0; font-size:24px; font-weight:700; color:" + C.textStrong + ";", "You scored " + score + " of " + state.questions.length));
      card.appendChild(el("div", "font-size:14px; color:" + C.textMuted + "; margin-bottom:28px; line-height:1.6;",
        score === state.questions.length
          ? "Great work — you're ready to bring these concepts into client conversations."
          : "Review the material above and try again anytime to reinforce what you've learned."));

      var retryBtn = el("button", "background:" + C.gold + "; color:#1e293b; border:none; border-radius:6px; padding:12px 24px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;", "Retake Quiz");
      retryBtn.type = "button";
      retryBtn.addEventListener("click", function(){
        state.index = 0;
        state.answered = state.questions.map(function(){ return null; });
        render();
      });
      card.appendChild(retryBtn);
      root.appendChild(card);
    }

    render();
  }

  function boot() {
    var mounts = document.querySelectorAll('[data-elv-widget="quiz"], #elv-quiz');
    Array.prototype.forEach.call(mounts, mountWidget);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
