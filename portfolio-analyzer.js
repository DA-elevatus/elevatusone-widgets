/* =========================================================================
   Elevatus — Portfolio Analyzer widget
   Loaded on the Milemarker "Portfolio Analzyer" page (path: /portfolio-analzyer,
   tenant ELEVATUS, page id 64) via a trailing <img onerror> script tag.
   This file owns everything under #pa-root and does not touch markup
   outside that container.

   FLOW (v2 — submit button):
     1. Advisor uploads one or more files. Nothing is generated yet.
     2. Advisor clicks "Generate Report" (#pa-submit).
     3. generatePortfolioReport() runs:
          - if CONFIG.SUBMIT_ENDPOINT is set  -> POSTs the files there
            (intended target: an n8n Webhook node — see notes below)
          - if CONFIG.SUBMIT_ENDPOINT is ''   -> demo stub (placeholder)
     4. Adding or removing files after a report is built marks the report
        out of date; the advisor clicks Generate Report again.

   Element IDs this file depends on (all present in the current page):
     pa-root, pa-file, pa-drop, pa-status, pa-results, pa-filename,
     pa-clear, pa-stats, pa-allocbar, pa-table, pa-report-empty,
     pa-builder, pa-print, pa-preview-wrap, pa-preview
   Optional (added in v2; script still runs if missing):
     pa-submit, pa-submit-hint
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

  var CONFIG = {
    // Leave '' to keep using the demo stub.
    // When the n8n workflow exists, paste its PRODUCTION webhook URL here,
    // e.g. 'https://<your-n8n-host>/webhook/portfolio-analyzer'
    SUBMIT_ENDPOINT: 'https://projection.milemarker-cloud.com/webhook-test/portfolio-analyzer-ycharts',
    // Abort the request if the workflow hasn't answered in this many ms.
    // Where the page asks "is my report ready?" (PRODUCTION URL of the always-active status workflow).
    STATUS_ENDPOINT: 'https://projection.milemarker-cloud.com/webhook-test/portfolio-analyzer-status',
    // How often to ask, in ms.
    POLL_MS: 5000,
    // Give up waiting for the finished report after this many ms (covers the whole job, not one request).
    TIMEOUT_MS: 300000
  };

  /* ---------------------------------------------------------------------
     State
  --------------------------------------------------------------------- */
  var files = [];              // { id, file, url }
  var nextId = 1;
  var report = null;           // { html } once a report has been generated
  var generating = false;      // true while a request is in flight
  var stale = false;           // true if files changed after the last report
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
     File intake — uploading NO LONGER triggers report generation.
     Any change to the file set cancels an in-flight request and marks an
     existing report as out of date.
  --------------------------------------------------------------------- */
  function filesChanged() {
    reportRequestToken++;      // ignore any response still in flight
    generating = false;
    if (report) stale = true;
  }

  function addFiles(list) {
    var added = 0, rejected = [];
    Array.prototype.forEach.call(list || [], function (f) {
      if (ALLOWED.indexOf(ext(f.name)) === -1) { rejected.push(f.name); return; }
      files.push({ id: nextId++, file: f, url: URL.createObjectURL(f) });
      added++;
    });

    if (added) filesChanged();

    var next = ' Click Generate Report when ready.';
    if (rejected.length && !added) {
      status('Unsupported file type: ' + rejected.join(', ') + '. Please upload a PDF, CSV, Excel, or TXT file.', 'error');
    } else if (rejected.length) {
      status(added + ' file(s) added. Skipped unsupported: ' + rejected.join(', ') + '.' + next, 'ok');
    } else if (added) {
      status(added + ' file' + (added > 1 ? 's' : '') + ' added. ' + files.length + ' total.' + next, 'ok');
    }

    render();
  }

  function removeFile(id) {
    var x = find(id);
    if (x) URL.revokeObjectURL(x.url);
    files = files.filter(function (f) { return f.id !== id; });
    filesChanged();
    if (files.length) {
      status(files.length + ' file' + (files.length === 1 ? '' : 's') + ' uploaded.', 'ok');
    } else {
      status('');
      report = null;
      stale = false;
    }
    render();
  }

  function clearAll() {
    files.forEach(function (x) { URL.revokeObjectURL(x.url); });
    files = [];
    report = null;
    stale = false;
    filesChanged();
    render();
    status('');
  }

  /* ---------------------------------------------------------------------
     Rendering — upload results / file list ("Holdings")

     NOTE: this table lists the *uploaded source files*, not parsed
     positions. Real holdings / asset-class data depends on the analysis
     step (the n8n workflow).
  --------------------------------------------------------------------- */
  function reportStatusLabel() {
    if (generating) return 'Generating…';
    if (report && stale) return 'Out of date';
    if (report) return 'Ready';
    return 'Not generated';
  }

  function render() {
    var has = files.length > 0;
    $('pa-results').style.display = has ? 'block' : 'none';
    $('pa-filename').textContent = files.map(function (x) { return x.file.name; }).join(', ');

    $('pa-stats').innerHTML = has ? statsHtml() : '';
    $('pa-allocbar').innerHTML = has ? allocHtml() : '';

    renderSubmit();

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

    renderReport();
  }

  function statsHtml() {
    var box = 'background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 16px;';
    var label = 'font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:4px;';
    var value = 'font-size:20px;font-weight:700;color:#f8fafc;';
    var totalSize = files.reduce(function (s, x) { return s + x.file.size; }, 0);
    return (
      '<div style="' + box + '"><div style="' + label + '">Files</div><div style="' + value + '">' + files.length + '</div></div>' +
      '<div style="' + box + '"><div style="' + label + '">Combined Size</div><div style="' + value + '">' + size(totalSize) + '</div></div>' +
      '<div style="' + box + '"><div style="' + label + '">Report Status</div><div style="' + value + 'font-size:15px;color:#C5A572;">' + reportStatusLabel() + '</div></div>'
    );
  }

  function allocHtml() {
    return '<div style="font-size:12px;color:#64748b;border:1px dashed #334155;border-radius:8px;padding:10px 14px;">Asset allocation will appear here once statement analysis is connected.</div>';
  }

  /* ---------------------------------------------------------------------
     Submit button
  --------------------------------------------------------------------- */
  function renderSubmit() {
    var b = $('pa-submit');
    var hint = $('pa-submit-hint');
    if (!b) return;
    var disabled = !files.length || generating;
    b.disabled = disabled;
    b.style.opacity = disabled ? '0.55' : '1';
    b.style.cursor = disabled ? 'not-allowed' : 'pointer';
    b.textContent = generating ? 'Generating…' : (report && !stale ? 'Regenerate Report' : 'Generate Report');
    if (hint) {
      hint.textContent = generating
        ? 'Building the report — this can take a minute.'
        : (report && stale)
          ? 'Files changed since the last report. Generate again to update it.'
          : 'Upload one statement per report (a statement covering several accounts is fine), then generate the report.';
    }
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
     Report generation — orchestration (only called from the button)
  --------------------------------------------------------------------- */
  function requestReport() {
    if (!files.length || generating) return;
    var token = ++reportRequestToken;
    generating = true;
    render();
    status('Analyzing statement' + (files.length > 1 ? 's' : '') + ' and building report…', 'busy');

    generatePortfolioReport(files)
      .then(function (result) {
        if (token !== reportRequestToken) return; // superseded
        generating = false;
        if (!result || (!result.html && !result.pdfUrl)) throw new Error('The report service returned an empty response');
        report = result;
        stale = false;
        render();
        status('Report ready.', 'ok');
      })
      .catch(function (err) {
        if (token !== reportRequestToken) return;
        generating = false;
        render();
        status('Report generation failed: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.', 'error');
      });
  }

  /* =======================================================================
     ================  REPORT BACKEND INTEGRATION POINT  ===================
     =======================================================================
     Sends the files to CONFIG.SUBMIT_ENDPOINT (the n8n Webhook URL) as
     multipart/form-data:
         file0, file1, ...   the uploaded files (n8n stores these as binary
                             properties with the same names)
         fileCount           number of files
         fileNames           JSON array of original file names
         source              'milemarker-portfolio-analyzer'
     Expected response (from n8n's "Respond to Webhook" node):
         200  { "html": "<...report html...>" }   or   { "pdfUrl": "https://..." }
         4xx/5xx  { "message": "what went wrong" }

     SECURITY / PRIVACY: statements contain client PII and account numbers.
     Anything placed in this file (URLs, header secrets) is visible to anyone
     who can open the page's dev tools. Do not put an Anthropic API key here.
  ========================================================================= */
  function generatePortfolioReport(fileList) {
    if (!CONFIG.SUBMIT_ENDPOINT) return demoStub(fileList);

    var formData = new FormData();
    fileList.forEach(function (x, i) { formData.append('file' + i, x.file, x.file.name); });
    formData.append('fileCount', String(fileList.length));
    formData.append('fileNames', JSON.stringify(fileList.map(function (x) { return x.file.name; })));
    formData.append('source', 'milemarker-portfolio-analyzer');

    var startedAt = Date.now();

    // Step 1: send the files. n8n answers within a second or two with { jobId }.
    return fetch(CONFIG.SUBMIT_ENDPOINT, { method: 'POST', body: formData })
      .then(readJson)
      .then(function (body) {
        // Older single-request workflows may still reply with the finished report directly.
        if (body && (body.html || body.pdfUrl)) return withPdfPreview(body);
        if (!body || !body.jobId) throw new Error('The report service did not return a job ID');
        // Step 2: ask the status endpoint until the job is done.
        return pollJob(body.jobId, startedAt);
      });
  }

  // Reads a response as JSON without choking on empty bodies; turns HTTP errors into Errors.
  function readJson(res) {
    return res.text().then(function (text) {
      var body = {};
      try { body = text ? JSON.parse(text) : {}; } catch (e) { body = {}; }
      if (!res.ok) throw new Error(body.message || ('Request failed (' + res.status + ')'));
      return body;
    });
  }

  function withPdfPreview(body) {
    if (body && !body.html && body.pdfUrl) {
      body.html =
        '<div style="padding:10px 16px;font-family:Inter,sans-serif;font-size:13px;">' +
          '<a href="' + esc(body.pdfUrl) + '" target="_blank" rel="noopener" style="color:#B8944B;font-weight:600;">Open report in a new tab</a>' +
        '</div>' +
        '<iframe src="' + esc(body.pdfUrl) + '" style="width:100%;height:900px;border:0;"></iframe>';
    }
    return body;
  }

  function pollJob(jobId, startedAt) {
    return new Promise(function (resolve, reject) {
      var misses = 0; // consecutive failed status checks (a brief network blip should not abort the job)
      (function tick() {
        if (Date.now() - startedAt > CONFIG.TIMEOUT_MS) {
          return reject(new Error('The report service took too long to respond'));
        }
        fetch(CONFIG.STATUS_ENDPOINT + '?jobId=' + encodeURIComponent(jobId))
          .then(readJson)
          .then(function (b) {
            misses = 0;
            if (b.status === 'done' && b.pdfUrl) return resolve(withPdfPreview(b));
            if (b.status === 'error') return reject(new Error(b.message || 'Report generation failed'));
            if (b.status === 'unknown') return reject(new Error('The report job could not be found'));
            setTimeout(tick, CONFIG.POLL_MS); // still running
          })
          .catch(function (err) {
            misses++;
            if (misses >= 3) return reject(err);
            setTimeout(tick, CONFIG.POLL_MS);
          });
      })();
    });
  }

  // DEMO STUB — used while CONFIG.SUBMIT_ENDPOINT is ''.
  function demoStub(fileList) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          html:
            '<div style="padding:48px;font-family:Georgia,serif;color:#0f172a;">' +
              '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B8944B;margin-bottom:8px;">Elevatus Wealth Management &middot; Demo Preview</div>' +
              '<div style="font-size:22px;font-weight:700;margin-bottom:16px;">Portfolio Report — Not Yet Connected</div>' +
              '<div style="font-size:14px;line-height:1.6;color:#334155;">This is placeholder output from the demo stub. ' +
              'Files received: ' + fileList.map(function (x) { return esc(x.file.name); }).join(', ') + '. ' +
              'Set CONFIG.SUBMIT_ENDPOINT to the n8n webhook URL to replace this with a real report.</div>' +
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
    var msg = function (t) { return '<div style="padding:60px 24px;text-align:center;color:#64748b;font-size:14px;">' + t + '</div>'; };

    if (!has) {
      wrap.style.display = 'none';
      box.innerHTML = '';
      printBtn.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';

    if (generating && !report) {
      box.innerHTML = msg('Generating report…');
      printBtn.style.display = 'none';
      return;
    }

    if (!report) {
      box.innerHTML = msg('Files are ready. Click <strong style="color:#B8944B;">Generate Report</strong> above to build the report.');
      printBtn.style.display = 'none';
      return;
    }

    printBtn.style.display = 'inline-block';
    var banner = stale
      ? '<div style="background:#fef3c7;color:#92400e;font-size:13px;padding:10px 16px;font-family:Inter,sans-serif;">The uploaded files changed after this report was built. Click Generate Report to update it.</div>'
      : '';
    box.innerHTML = banner + (report.html || msg('No preview available.'));
  }

  $('pa-print').addEventListener('click', function () {
    if (!report) return;
    var w = window.open('', '_blank');
    if (!w) { status('Your browser blocked the print window. Allow pop-ups for this site and try again.', 'error'); return; }
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
  if ($('pa-submit')) $('pa-submit').addEventListener('click', requestReport);

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  render();
})();
