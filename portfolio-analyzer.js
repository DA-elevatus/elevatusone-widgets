(function () {
  var $ = function (id) { return document.getElementById(id); };
  var root = $('pa-root');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');

  var ALLOWED = ['pdf', 'csv', 'xlsx', 'xls', 'xlsm', 'txt'];
  var files = [];        // { id, file, url }
  var nextId = 1;
  var previewId = 0;

  // Let the file picker accept PDFs too
  $('pa-file').setAttribute('accept', '.pdf,.csv,.xlsx,.xls,.xlsm,.txt');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  function status(msg, ok) {
    var el = $('pa-status');
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.color = ok ? '#4ade80' : '#f87171';
    el.style.borderColor = ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)';
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

  function addFiles(list) {
    var added = 0, rejected = [];
    Array.prototype.forEach.call(list || [], function (f) {
      if (ALLOWED.indexOf(ext(f.name)) === -1) { rejected.push(f.name); return; }
      var x = { id: nextId++, file: f, url: URL.createObjectURL(f) };
      files.push(x);
      previewId = x.id;
      added++;
    });
    render();
    if (rejected.length && !added) {
      status('Unsupported file type: ' + rejected.join(', ') + '. Please upload a PDF, CSV, or Excel file.', false);
    } else if (rejected.length) {
      status(added + ' file(s) added. Skipped unsupported: ' + rejected.join(', ') + '.', true);
    } else if (added) {
      status(added + ' file' + (added > 1 ? 's' : '') + ' uploaded. ' + files.length + ' total.', true);
    }
  }

  function render() {
    var has = files.length > 0;
    $('pa-results').style.display = has ? 'block' : 'none';
    $('pa-report-empty').style.display = has ? 'none' : 'block';
    $('pa-builder').style.display = has ? 'block' : 'none';
    $('pa-filename').textContent = files.map(function (x) { return x.file.name; }).join(', ');

    if (!has) {
      $('pa-table').innerHTML = '';
      $('pa-preview-wrap').style.display = 'none';
      $('pa-preview').innerHTML = '';
      return;
    }

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
            '<button type="button" data-view="' + x.id + '" style="' + btn + '">Preview</button>' +
            '<button type="button" data-dl="' + x.id + '" style="' + btn + '">Download</button>' +
            '<button type="button" data-rm="' + x.id + '" style="' + btn + 'color:#94a3b8;">Remove</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';

    preview(previewId && find(previewId) ? previewId : files[files.length - 1].id);
  }

  function preview(id) {
    var x = find(id);
    var wrap = $('pa-preview-wrap'), box = $('pa-preview');
    if (!x) { wrap.style.display = 'none'; box.innerHTML = ''; return; }
    previewId = id;
    wrap.style.display = 'block';
    if (ext(x.file.name) === 'pdf') {
      box.innerHTML = '<iframe src="' + x.url + '" title="' + esc(x.file.name) + '" style="width:100%;height:720px;border:0;background:#fff;"></iframe>';
    } else {
      box.innerHTML = '<div style="padding:40px 24px;text-align:center;color:#0f172a;">' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:6px;">' + esc(x.file.name) + '</div>' +
        '<div style="font-size:13px;color:#64748b;">Preview is only available for PDFs. Use Download to open the original file.</div></div>';
    }
  }

  // Row buttons
  $('pa-table').addEventListener('click', function (e) {
    var v = e.target.getAttribute('data-view');
    var d = e.target.getAttribute('data-dl');
    var r = e.target.getAttribute('data-rm');
    if (v) preview(parseInt(v, 10));
    if (d) { var xd = find(parseInt(d, 10)); if (xd) triggerDownload(xd); }
    if (r) {
      var id = parseInt(r, 10), xr = find(id);
      if (xr) URL.revokeObjectURL(xr.url);
      files = files.filter(function (f) { return f.id !== id; });
      if (previewId === id) previewId = 0;
      render();
      status(files.length ? files.length + ' file' + (files.length === 1 ? '' : 's') + ' uploaded.' : '', true);
    }
  });

  // Browse + drag and drop
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

  // Sample portfolio (small CSV generated in the browser)
  $('pa-sample').addEventListener('click', function () {
    var csv = 'Symbol,Description,Quantity,Price,Market Value\n' +
      'VTI,Vanguard Total Stock Market ETF,500,250.00,125000\n' +
      'VXUS,Vanguard Total International Stock ETF,800,65.00,52000\n' +
      'BND,Vanguard Total Bond Market ETF,1000,72.00,72000\n' +
      'AAPL,Apple Inc,150,220.00,33000\n' +
      'CASH,Cash & Equivalents,,,18000\n';
    addFiles([new File([csv], 'sample-portfolio.csv', { type: 'text/csv' })]);
  });

  // Clear
  $('pa-clear').addEventListener('click', function () {
    files.forEach(function (x) { URL.revokeObjectURL(x.url); });
    files = [];
    previewId = 0;
    render();
    status('');
  });

  // Report section: for now, Download returns the uploaded file(s) unchanged
  var dl = $('pa-download');
  dl.textContent = 'Download Uploaded File';
  dl.addEventListener('click', function () {
    files.forEach(function (x, i) { setTimeout(function () { triggerDownload(x); }, i * 400); });
  });
  $('pa-print').style.display = 'none'; // returns when the real report exists

  // Default the report date to today
  var dateEl = $('pa-date');
  if (dateEl && !dateEl.value) {
    var t = new Date();
    dateEl.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  render();
})();
