/* =========================================================================
   Elevatus — Portfolio Analyzer widget
   Loaded on the Milemarker "Portfolio Analzyer" page (path: /portfolio-analzyer,
   tenant ELEVATUS, page id 64) via a trailing <img onerror> script tag.
   This file owns everything under #pa-root and does not touch markup
   outside that container.

   STATUS: file intake + UI wiring below is fully functional against the
   current page markup. Report GENERATION (actually reading a statement
   and producing a branded report) is a demo stub — see the clearly
   marked "CLAUDE API INTEGRATION POINT" section for exactly where and
   how to wire up the real backend call.

   Element IDs this file depends on (all present in the current page):
     pa-root, pa-file, pa-drop, pa-status, pa-results, pa-filename,
     pa-clear, pa-stats, pa-allocbar, pa-table, pa-report-empty,
     pa-builder, pa-print, pa-preview-wrap, pa-preview
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var root = $('pa-root');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');

  /* ---------------------------------------------------------------------
     Config
  --------------------------------------------------------------------- */
  var ALLOWED = ['pdf', 'csv', 'xlsx', 'xls', 'xlsm', 'txt'];

  /* ---------------------------------------------------------------------
     State
  --------------------------------------------------------------------- */
  var files = [];              // { id, file, url }
  var nextId = 1;
  var report = null;           // { html } once a report has been generated
  var reportRequestToken = 0;  // guards against stale async responses

  /* ---------------------------------------------------------------------
     Utilities
  --------------------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function size(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  function find(id) {
    for (var i = 0; i < files.length; i++) if (files[i].id === id) return files[i];
    return null;
  }
  function status(msg, kind) {
    // kind: 'ok' | 'error' | 'busy' | undefined (clears the message)
    var el = $('pa-status');
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.color = kind === 'error' ? '#f87171' : kind === 'busy' ? '#C5A572' : '#4ade80';
    el.style.borderColor = kind === 'error' ? 'rgba(248,113,113,0.35)' : kind === 'busy' ? 'rgba(197,165,114,0.35)' : 'rgba(74,222,128,0.35)';
    el.textContent = msg;
  }
  function triggerDownload(x) {
    var a = document.createElement('a');
    a.href = x.url;
    a.download = x.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ---------------------------------------------------------------------
     File intake
  --------------------------------------------------------------------- */
  function addFiles(list) {
    var added = 0, rejected = [];
    Array.prototype.forEach.call(list || [], function (f) {
      if (ALLOWED.indexOf(ext(f.name)) === -1) { rejected.push(f.name); return; }
      files.push({ id: nextId++, file: f, url: URL.createObjectURL(f) });
      added++;
    });

    if (rejected.length && !added) {
      status('Unsupported file type: ' + rejected.join(', ') + '. Please upload a PDF, CSV, or Excel file.', 'error');
    } else if (rejected.length) {
      status(added + ' file(s) added. Skipped unsupported: ' + rejected.join(', ') + '.', 'ok');
    } else if (added) {
      status(added + ' file' + (added > 1 ? 's' : '') + ' uploaded. ' + files.length + ' total.', 'ok');
    }

    render();
    if (added) requestReport(); // (re)generate whenever the file set changes
  }

  function removeFile(id) {
    var x = find(id);
    if (x) URL.revokeObjectURL(x.url);
    files = files.filter(function (f) { return f.id !== id; });
    render();
    if (files.length) {
      status(files.length + ' file' + (files.length === 1 ? '' : 's') + ' uploaded.', 'ok');
      requestReport();
    } else {
      status('');
      report = null;
      renderReport();
    }
  }

  function clearAll() {
    files.forEach(function (x) { URL.revokeObjectURL(x.url); });
    files = [];
    report = null;
    reportRequestToken++; // invalidate any in-flight request
    render();
    status('');
  }

  /* ---------------------------------------------------------------------
     Rendering — upload results / file list ("Holdings")

     NOTE: this table lists the *uploaded source files*, not parsed
     positions. Real holdings / asset-class data depends on the analysis
     step below (Claude, optionally cross-checked against Nitrogen) —
     until that exists, this is a file manifest, not a positions table,
     and the page copy above it ("Change any asset class...") is ahead
     of what this script actually does.
  --------------------------------------------------------------------- */
  function render() {
    var has = files.length > 0;
    $('pa-results').style.display = has ? 'block' : 'none';
    $('pa-filename').textContent = files.map(function (x) { return x.file.name; }).join(', ');

    $('pa-stats').innerHTML = has ? statsHtml() : '';
    $('pa-allocbar').innerHTML = has ? allocHtml() : '';

    if (!has) { $('pa-table').innerHTML = ''; renderReport(); return; }

    var th = 'text-align:left;padding:10px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#C5A572;border-bottom:1px solid #334155;';
    var td = 'padding:10px 14px;font-size:13px;color:#e2e8f0;border-bottom:1px solid #334155;';
    var btn = 'background:transparent;color:#e2e8f0;font-size:12px;font-weight:600;border:1px solid #475569;border-radius:6px;padding:6px 12px;cursor:pointer;font-family:inherit;margin-left:6px;';

    $('pa-table').innerHTML =
      '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr><th style="' + th + '">File</th><th style="' + th + '">Type</th><th style="' + th + '">Size</th><th style="' + th + 'text-align:right;">Actions</th></tr></thead><tbody>' +
      files.map(function (x) {
        return '<tr>' +
          '<td style="' + td + 'word-break:break-all;">' + esc(x.file.name) + '</td>' +
          '<td style="' + td + '">' + esc((ext(x.file.name) || 'file').toUpperCase()) + '</td>' +
          '<td style="' + td + '">' + size(x.file.size) + '</td>' +
          '<td style="' + td + 'text-align:right;white-space:nowrap;">' +
            '<button type="button" data-view="' + x.id + '" style="' + btn + '">View</button>' +
            '<button type="button" data-dl="' + x.id + '" style="' + btn + '">Download</button>' +
            '<button type="button" data-rm="' + x.id + '" style="' + btn + 'color:#94a3b8;">Remove</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function statsHtml() {
    var box = 'background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 16px;';
    var label = 'font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:4px;';
    var value = 'font-size:20px;font-weight:700;color:#f8fafc;';
    var totalSize = files.reduce(function (s, x) { return s + x.file.size; }, 0);
    // "Report Status" is the only figure here grounded in real state.
    // Once the analysis step returns real portfolio data (total value,
    // account count, etc.), add stat boxes for those alongside this.
    return (
      '<div style="' + box + '"><div style="' + label + '">Files</div><div style="' + value + '">' + files.length + '</div></div>' +
      '<div style="' + box + '"><div style="' + label + '">Combined Size</div><div style="' + value + '">' + size(totalSize) + '</div></div>' +
      '<div style="' + box + '"><div style="' + label + '">Report Status</div><div style="' + value + 'font-size:15px;color:#C5A572;">' + (report ? 'Ready' : 'Pending analysis') + '</div></div>'
    );
  }

  function allocHtml() {
    // Placeholder until the analysis step returns real asset-class weights.
    return '<div style="font-size:12px;color:#64748b;border:1px dashed #334155;border-radius:8px;padding:10px 14px;">Asset allocation will appear here once statement analysis is connected.</div>';
  }

  $('pa-table').addEventListener('click', function (e) {
    var v = e.target.getAttribute('data-view');
    var d = e.target.getAttribute('data-dl');
    var r = e.target.getAttribute('data-rm');
    if (v) { var xv = find(parseInt(v, 10)); if (xv) window.open(xv.url, '_blank'); }
    if (d) { var xd = find(parseInt(d, 10)); if (xd) triggerDownload(xd); }
    if (r) removeFile(parseInt(r, 10));
  });

  /* ---------------------------------------------------------------------
     Report generation — orchestration
  --------------------------------------------------------------------- */
  function requestReport() {
    if (!files.length) return;
    var token = ++reportRequestToken;
    report = null;
    renderReport(); // shows the "generating" state immediately
    status('Analyzing statement' + (files.length > 1 ? 's' : '') + ' and building report…', 'busy');

    generatePortfolioReport(files)
      .then(function (result) {
        if (token !== reportRequestToken) return; // superseded by a newer request
        report = result;
        renderReport();
        status('Report ready.', 'ok');
      })
      .catch(function (err) {
        if (token !== reportRequestToken) return;
        report = null;
        renderReport();
        status('Report generation failed: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.', 'error');
      });
  }

  /* =======================================================================
     ================  CLAUDE API INTEGRATION POINT  =======================
     =======================================================================
     This is the one function that turns uploaded statements into an actual
     report. Everything above this line (upload UI, file list, stats,
     status messages, print wiring) is functional today. Everything in
     this function is a DEMO STUB — it does not call Claude, Nitrogen, or
     any backend. Replace the body below with a real call, following the
     notes here.

     WHY THIS CAN'T CALL THE ANTHROPIC API DIRECTLY FROM THIS FILE:
       - This script runs in the visitor's browser. Any Anthropic API key
         placed here would be visible to anyone who opens dev tools — an
         Anthropic API key must never be called directly from client-side
         JS.
       - The real call has to go through an Elevatus-controlled backend
         endpoint that holds the Claude API key server-side, and that
         this script talks to over HTTPS. That backend does not exist
         yet — it is the actual piece of work this stub is standing in
         for.

     WHAT THAT BACKEND ENDPOINT SHOULD DO (server-side, not part of this
     file):
       1. Receive the uploaded statement file(s) as posted by the
          fetch() call below (multipart/form-data).
       2. Pass the statement to the Claude API — Claude can read PDF
          pages natively — to extract holdings, balances, income, and
          gain/loss data. This extraction approach was validated
          end-to-end earlier against a real Schwab statement.
       3. Optionally cross-reference the extracted holdings against
          Nitrogen (Riskalyze) for computed risk analytics (Risk Number,
          stress tests, GPA). Note: that earlier test also surfaced a
          real Nitrogen bug — inconsistent proxy assignment on
          unresolved/custom holdings can overstate modeled risk — so any
          Nitrogen-derived figures should be checked or clearly flagged,
          not presented as fact without review.
       4. Assemble the branded report (the Elevatus reportlab template
          already built and validated is the reference for layout/
          styling) and return either:
            a) { html: "<...report html...>" } for inline preview, or
            b) { pdfUrl: "https://.../report.pdf" } to a generated PDF.
       5. Return errors as a non-2xx response with a JSON { message }
          body so the .catch() in requestReport() above can surface
          something specific rather than a generic failure.

     SECURITY / PRIVACY NOTE: uploaded statements contain client PII and
     account numbers. The backend endpoint must require the same
     authentication as this page (Advisor / Org Admin / Firm Admin /
     Senior Advisor / Office Admin), and statements should not be logged
     or retained beyond what generating the report requires.
  ========================================================================= */
  function generatePortfolioReport(fileList) {
    // ---- REPLACE EVERYTHING BELOW THIS LINE WITH THE REAL CALL --------
    //
    // Example of what the real implementation should look like:
    //
    //   var formData = new FormData();
    //   fileList.forEach(function (x) { formData.append('statements', x.file, x.file.name); });
    //
    //   return fetch('https://api.elevatusone.com/portfolio-analyzer/generate', {
    //     method: 'POST',
    //     credentials: 'include',   // send the advisor's session/auth
    //     body: formData
    //   }).then(function (res) {
    //     if (!res.ok) {
    //       return res.json().catch(function () { return {}; }).then(function (body) {
    //         throw new Error(body.message || ('Request failed (' + res.status + ')'));
    //       });
    //     }
    //     return res.json(); // expected: { html: '...' } or { pdfUrl: '...' }
    //   });
    //
    // ---------------------------------------------------------------------

    // DEMO STUB — simulates latency and returns placeholder HTML so the
    // rest of the UI (status messages, report panel, print button) can
    // be exercised end-to-end before the real backend exists. Delete
    // this block once the fetch() above is wired up.
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          html:
            '<div style="padding:48px;font-family:Georgia,serif;color:#0f172a;">' +
              '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B8944B;margin-bottom:8px;">Elevatus Wealth Management &middot; Demo Preview</div>' +
              '<div style="font-size:22px;font-weight:700;margin-bottom:16px;">Portfolio Report — Not Yet Connected</div>' +
              '<div style="font-size:14px;line-height:1.6;color:#334155;">This is placeholder output from the demo stub in generatePortfolioReport(). ' +
              'Files received: ' + fileList.map(function (x) { return esc(x.file.name); }).join(', ') + '. ' +
              'Wire up the commented Claude API call above to replace this with a real, branded report.</div>' +
            '</div>'
        });
      }, 900);
    });
  }

  /* ---------------------------------------------------------------------
     Report panel rendering
  --------------------------------------------------------------------- */
  function renderReport() {
    var has = files.length > 0;
    $('pa-report-empty').style.display = has ? 'none' : 'block';
    $('pa-builder').style.display = has ? 'block' : 'none';

    var printBtn = $('pa-print');
    var wrap = $('pa-preview-wrap');
    var box = $('pa-preview');

    if (!has) {
      wrap.style.display = 'none';
      box.innerHTML = '';
      printBtn.style.display = 'none';
      return;
    }

    if (!report) {
      // mid-generation (or failed) state
      wrap.style.display = 'block';
      box.innerHTML = '<div style="padding:60px 24px;text-align:center;color:#64748b;font-size:14px;">Generating report…</div>';
      printBtn.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    printBtn.style.display = 'inline-block';
    box.innerHTML = report.html || '<div style="padding:40px;text-align:center;color:#64748b;">No preview available.</div>';
  }

  $('pa-print').addEventListener('click', function () {
    if (!report) return;
    var w = window.open('', '_blank');
    w.document.write('<html><head><title>Portfolio Report</title></head><body>' + (report.html || '') + '</body></html>');
    w.document.close();
    w.focus();
    w.print();
  });

  /* ---------------------------------------------------------------------
     Browse + drag and drop
  --------------------------------------------------------------------- */
  var drop = $('pa-drop'), input = $('pa-file');
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.style.borderColor = '#C5A572';
      drop.style.background = 'rgba(197,165,114,0.06)';
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.style.borderColor = '#334155';
      drop.style.background = '#0f172a';
    });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  $('pa-clear').addEventListener('click', clearAll);

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  render();
  renderReport();
})();
