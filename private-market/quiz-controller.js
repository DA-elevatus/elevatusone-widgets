(function(){
  var els = {};
  var state = {
    title: "Quick Confidence Check",
    questions: [],
    index: 0,
    answered: [],   // per-question: selected option index, or null
    ready: false
  };

  // Palette matches the tiles widget (dark theme, gold accent).
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

  window.ELV_registerQuiz = function(key, title, questions) {
    state.title = title || state.title;
    state.questions = questions || [];
    state.answered = state.questions.map(function(){ return null; });
    render();
  };

  function init() {
    els.root = document.getElementById("elv-quiz-widget");
    if (!els.root) return;
    render();
  }

  function render() {
    if (!els.root) return;
    els.root.innerHTML = "";

    if (!state.questions.length) {
      var loading = document.createElement("div");
      loading.style.cssText = "color:" + C.textMuted + "; font-size:13px; text-align:center; padding:20px;";
      loading.textContent = "Loading quiz…";
      els.root.appendChild(loading);
      return;
    }

    var card = document.createElement("div");
    card.style.cssText = "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:12px; padding:40px; max-width:900px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.35);";

    var progress = document.createElement("div");
    progress.style.cssText = "font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:" + C.gold + "; margin-bottom:8px;";
    progress.textContent = "Question " + (state.index + 1) + " of " + state.questions.length;
    card.appendChild(progress);

    var heading = document.createElement("h2");
    heading.style.cssText = "margin:0 0 20px 0; font-size:24px; font-weight:700; color:" + C.textStrong + ";";
    heading.textContent = state.title;
    card.appendChild(heading);

    var q = state.questions[state.index];

    var qText = document.createElement("div");
    qText.style.cssText = "font-size:16px; font-weight:600; color:" + C.textStrong + "; margin-bottom:20px; line-height:1.5;";
    qText.textContent = q.question;
    card.appendChild(qText);

    var optionsWrap = document.createElement("div");
    optionsWrap.style.cssText = "display:flex; flex-direction:column; gap:12px; margin-bottom:20px;";

    var selected = state.answered[state.index];
    var showFeedback = (selected !== null);

    q.options.forEach(function(optionText, i){
      var opt = document.createElement("button");
      opt.type = "button";
      var isSelected = (selected === i);
      var isCorrect = (i === q.correctIndex);

      var borderColor = C.optionBorder;
      var bg = C.optionBg;
      var textColor = C.textStrong;

      if (showFeedback) {
        if (isCorrect) {
          borderColor = C.gold;
          bg = C.goldWash;
        } else if (isSelected && !isCorrect) {
          borderColor = C.optionBorder;
          bg = C.optionBg;
          textColor = C.textDim;
        }
      }

      opt.style.cssText = "display:flex; align-items:center; gap:12px; text-align:left; padding:14px 16px; border-radius:8px; border:1px solid " + borderColor + "; background:" + bg + "; color:" + textColor + "; font-family:inherit; font-size:14px; font-weight:500; cursor:" + (showFeedback ? "default" : "pointer") + "; transition:border-color .15s ease, background .15s ease;";

      var circle = document.createElement("span");
      circle.style.cssText = "flex:0 0 auto; width:18px; height:18px; border-radius:50%; border:2px solid " + (showFeedback && isCorrect ? C.gold : "#475569") + "; display:inline-block; position:relative;";
      if (showFeedback && isCorrect) {
        var dot = document.createElement("span");
        dot.style.cssText = "position:absolute; inset:3px; border-radius:50%; background:" + C.gold + ";";
        circle.appendChild(dot);
      }

      var label = document.createElement("span");
      label.textContent = optionText;

      opt.appendChild(circle);
      opt.appendChild(label);

      if (!showFeedback) {
        opt.addEventListener("mouseenter", function(){ opt.style.borderColor = C.gold; });
        opt.addEventListener("mouseleave", function(){ opt.style.borderColor = C.optionBorder; });
        opt.addEventListener("click", function(){
          state.answered[state.index] = i;
          render();
        });
      }

      optionsWrap.appendChild(opt);
    });

    card.appendChild(optionsWrap);

    if (showFeedback) {
      var feedback = document.createElement("div");
      var isCorrectAnswer = (selected === q.correctIndex);
      feedback.style.cssText = "font-size:14px; font-weight:700; color:" + (isCorrectAnswer ? C.gold : C.textMuted) + "; margin-bottom:8px;";
      feedback.textContent = isCorrectAnswer ? "Yes, Correct Answer" : "Not quite — correct answer highlighted above";
      card.appendChild(feedback);

      if (q.explanation) {
        var explain = document.createElement("div");
        explain.style.cssText = "font-size:13px; color:" + C.textMuted + "; line-height:1.6; margin-bottom:20px;";
        explain.textContent = q.explanation;
        card.appendChild(explain);
      }

      var nextBtn = document.createElement("button");
      nextBtn.type = "button";
      var isLast = (state.index === state.questions.length - 1);
      nextBtn.textContent = isLast ? "See Results →" : "Next →";
      nextBtn.style.cssText = "background:" + C.gold + "; color:#1e293b; border:none; border-radius:6px; padding:12px 24px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; margin-top:10px;";
      nextBtn.addEventListener("click", function(){
        if (isLast) {
          renderResults();
        } else {
          state.index++;
          render();
        }
      });
      card.appendChild(nextBtn);
    }

    els.root.appendChild(card);
  }

  function renderResults() {
    els.root.innerHTML = "";

    var score = 0;
    state.questions.forEach(function(q, i){
      if (state.answered[i] === q.correctIndex) score++;
    });

    var card = document.createElement("div");
    card.style.cssText = "background:" + C.cardBg + "; border:1px solid " + C.cardBorder + "; border-radius:12px; padding:48px 40px; max-width:700px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.35); text-align:center;";

    var heading = document.createElement("h2");
    heading.style.cssText = "margin:0 0 12px 0; font-size:24px; font-weight:700; color:" + C.textStrong + ";";
    heading.textContent = "You scored " + score + " of " + state.questions.length;
    card.appendChild(heading);

    var sub = document.createElement("div");
    sub.style.cssText = "font-size:14px; color:" + C.textMuted + "; margin-bottom:28px; line-height:1.6;";
    sub.textContent = score === state.questions.length
      ? "Great work — you're ready to bring these concepts into client conversations."
      : "Review the tiles above and try again anytime to reinforce what you've learned.";
    card.appendChild(sub);

    var retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.textContent = "Retake Quiz";
    retryBtn.style.cssText = "background:" + C.gold + "; color:#1e293b; border:none; border-radius:6px; padding:12px 24px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;";
    retryBtn.addEventListener("click", function(){
      state.index = 0;
      state.answered = state.questions.map(function(){ return null; });
      render();
    });
    card.appendChild(retryBtn);

    els.root.appendChild(card);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ---- Load the quiz data file ----
  // For local preview this is a relative path; for Milemarker it points at the
  // hosted GitHub Pages URL. Override by setting window.ELV_QUIZ_SOURCE before
  // this script loads. Entries containing "YOUR-HOST" are skipped.
  var DATA_URL = window.ELV_QUIZ_SOURCE ||
    "https://da-elevatus.github.io/elevatusone-widgets/private-market/quiz-data-private-markets.js";
  if (DATA_URL.indexOf("YOUR-HOST") === -1) {
    var s = document.createElement("script");
    s.src = DATA_URL;
    s.async = false;
    (document.body || document.head).appendChild(s);
  }
})();
