(function(){
  var $ = function(id){ return document.getElementById(id); };
  var root = $('pa-root');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');

  var CLASSES = ['Equity', 'Fixed Income', 'Cash', 'Alternatives', 'Other'];
  var CLASS_COLORS = { 'Equity': '#1e3a5f', 'Fixed Income': '#C5A572', 'Cash': '#94a3b8', 'Alternatives': '#0f766e', 'Other': '#7c3aed' };
  var state = { files: [], holdings: [], overrides: {}, reportHTML: '', reportName: '' };

  var FIELDS = [
    { k: 'symbol', label: 'Symbol', re: /^(symbol|ticker|security\s*symbol|cusip)\b/i },
    { k: 'quantity', label: 'Quantity', re: /(quantity|shares|qty|units)/i, ex: /change|%/i },
    { k: 'price', label: 'Price', re: /(price|close)/i, ex: /change|chng|%|cost|avg|average/i },
    { k: 'value', label: 'Market Value', re: /(market\s*value|current\s*value|mkt\s*val|^value$|total\s*value)/i, ex: /change|chng|%|gain|loss|pct|percent/i },
    { k: 'cost', label: 'Cost Basis', re: /(cost)/i, ex: /per\s*share|avg|average|%|unit/i },
    { k: 'assetClass', label: 'Asset Class', re: /(asset\s*class|asset\s*type|security\s*type|category|^type$)/i },
    { k: 'account', label: 'Account', re: /(account)/i, ex: /%|percent|of\s*acc/i },
    { k: 'name', label: 'Description', re: /(description|security\s*name|^name$|^security$|holding|investment)/i, ex: /account/i }
  ];

  var CASH_SYM = /^(SPAXX|FDRXX|FZFXX|SWVXX|SNVXX|SNSXX|SNOXX|VMFXX|VMRXX|SPRXX|FCASH|CORE|CASH|MMDA)/i;
  var FI_SYM = /^(AGG|BND|BNDX|TLT|IEF|IEI|SHY|LQD|HYG|JNK|MUB|VCIT|VCSH|VCLT|BSV|BIV|BLV|SCHZ|SCHP|SCHR|SCHO|TIP|VTIP|GOVT|VGSH|VGIT|VGLT|SGOV|BIL|JPST|MINT|FBND|IUSB|EMB|VTEB|TFI|FLOT|USFR|STIP|VWOB|PIMIX|PTTRX|DODIX|FXNAX|VBTLX|VBMFX)$/i;
  var ALT_SYM = /^(VNQ|VNQI|SCHH|XLRE|IYR|GLD|IAU|GLDM|SLV|IBIT|FBTC|GBTC|BITO|DBC|PDBC|GSG|USO)$/i;

  // ---------- helpers ----------
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function num(v){
    if (v == null) return NaN;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (!s || /^(--|n\/a|na|-)$/i.test(s)) return NaN;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /^\$-/.test(s);
    s = s.replace(/[^0-9.]/g, '');
    if (!s) return NaN;
    var n = parseFloat(s);
    if (isNaN(n)) return NaN;
    return neg ? -n : n;
  }
  function money(n, d){
    if (isNaN(n)) return '-';
    d = d || 0;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? '-$' : '$') + s;
  }
  function pct(n, d){ if (isNaN(n) || !isFinite(n)) return '-'; return (n * 100).toFixed(d == null ? 1 : d) + '%'; }
  function qtyFmt(n){ return isNaN(n) ? '-' : n.toLocaleString('en-US', { maximumFractionDigits: 4 }); }
  function val(id){ return ($(id).value || '').trim(); }
  function fmtDate(v){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (!m) { var d = new Date(); return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
    return months[parseInt(m[2],10)-1] + ' ' + parseInt(m[3],10) + ', ' + m[1];
  }
  function status(msg, type){
    var el = $('pa-status');
    if (!msg) { el.style.display = 'none'; return; }
    var c = type === 'err' ? '#f87171' : (type === 'ok' ? '#4ade80' : '#94a3b8');
    var b = type === 'err' ? 'rgba(248,113,113,0.35)' : (type === 'ok' ? 'rgba(74,222,128,0.35)' : '#334155');
    el.style.display = 'block';
    el.style.color = c;
    el.style.borderColor = b;
    el.innerHTML = esc(msg);
  }

  // ---------- parsing ----------
  function parseCSV(t){
    var rows = [], row = [], f = '', q = false;
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    for (var i = 0; i < t.length; i++){
      var c = t[i];
      if (q){
        if (c === '"'){ if (t[i+1] === '"'){ f += '"'; i++; } else q = false; }
        else f += c;
      } else {
        if (c === '"') q = true;
        else if (c === ','){ row.push(f); f = ''; }
        else if (c === '\n' || c === '\r'){
          if (c === '\r' && t[i+1] === '\n') i++;
          row.push(f); rows.push(row); row = []; f = '';
        } else f += c;
      }
    }
    if (f !== '' || row.length){ row.push(f); rows.push(row); }
    return rows;
  }

  function detectMap(headers){
    var used = {}, map = {};
    FIELDS.forEach(function(f){
      map[f.k] = -1;
      for (var i = 0; i < headers.length; i++){
        var h = headers[i];
        if (!h || used[i]) continue;
        if (f.re.test(h) && !(f.ex && f.ex.test(h))){ map[f.k] = i; used[i] = 1; break; }
      }
    });
    return map;
  }

  function parseRows(rows, fileName){
    rows = rows.map(function(r){ return (r || []).map(function(c){ return c == null ? '' : c; }); });
    var hi = -1;
    for (var i = 0; i < Math.min(rows.length, 40); i++){
      var sc = 0;
      rows[i].forEach(function(c){
        var s = String(c).trim();
        if (s && s.length < 60 && FIELDS.some(function(f){ return f.re.test(s); })) sc++;
      });
      if (sc >= 3){ hi = i; break; }
    }
    if (hi < 0) return { error: fileName + ': no header row found (expected columns such as Symbol, Quantity, Market Value).' };
    var headers = rows[hi].map(function(c){ return String(c).trim(); });
    var map = detectMap(headers);
    if (map.value < 0 && (map.quantity < 0 || map.price < 0)) return { error: fileName + ': no Market Value column found.' };
    return {
      name: fileName,
      label: fileName.replace(/\.[^.]+$/, ''),
      headers: headers,
      map: map,
      rows: rows.slice(hi + 1).filter(function(r){ return r.some(function(c){ return String(c).trim() !== ''; }); })
    };
  }

  function classify(raw, sym, name){
    var s = String(raw || '').toLowerCase();
    if (s){
      if (/cash|money\s*market|sweep/.test(s)) return 'Cash';
      if (/bond|fixed|treas|muni|debt|\bcd\b|certificate/.test(s)) return 'Fixed Income';
      if (/alternative|real\s*estate|reit|commodit|crypto/.test(s)) return 'Alternatives';
      if (/equit|stock|common|adr/.test(s)) return 'Equity';
    }
    var t = (sym + ' ' + name).toLowerCase();
    if (CASH_SYM.test(sym) || /money\s*market|\bcash\b|sweep|\bmmf\b|deposit account|govt\s*mm|government money/.test(t)) return 'Cash';
    if (FI_SYM.test(sym) || /bond|treasur|fixed\s*inc|municipal|\bmuni\b|aggregate|t-bill|\btips\b|\bcd\b|certificate of deposit|\bnote[s]?\b.*\d{2}\/\d{2}/.test(t)) return 'Fixed Income';
    if (ALT_SYM.test(sym) || /\breit\b|real estate|\bgold\b|silver|commodit|bitcoin|crypto|ethereum/.test(t)) return 'Alternatives';
    return 'Equity';
  }

  function isTotalRow(sym, name){
    var re = /^(account\s*|grand\s*|portfolio\s*|net\s*)?totals?\b/i;
    return re.test(sym) || (!sym && re.test(name));
  }

  function build(){
    var H = [], multi = state.files.length > 1;
    state.files.forEach(function(file){
      var m = file.map;
      file.rows.forEach(function(r){
        var g = function(k){ return m[k] >= 0 && m[k] < r.length ? r[m[k]] : ''; };
        var sym = String(g('symbol')).trim(), name = String(g('name')).trim();
        if (/^-+$/.test(name)) name = '';
        if (/^-+$/.test(sym)) sym = '';
        if (!sym && !name) return;
        if (isTotalRow(sym, name)) return;
        var qty = num(g('quantity')), price = num(g('price')), v = num(g('value')), cost = num(g('cost'));
        if (isNaN(v) && !isNaN(qty) && !isNaN(price)) v = qty * price;
        if (isNaN(v)) return;
        var acct = String(g('account')).trim() || (multi ? file.label : '');
        var key = file.name + '|' + sym + '|' + name + '|' + acct;
        var cls = state.overrides[key] || classify(g('assetClass'), sym, name);
        H.push({ key: key, symbol: sym, name: name || sym, qty: qty, price: price, value: v, cost: cost, account: acct, cls: cls });
      });
    });
    state.holdings = H;
    renderHoldings();
    generate();
  }

  function totals(H){
    var t = { value: 0, cost: 0, gl: 0, hasCost: false, n: H.length };
    H.forEach(function(h){
      t.value += h.value;
      if (!isNaN(h.cost)){ t.cost += h.cost; t.gl += h.value - h.cost; t.hasCost = true; }
    });
    return t;
  }
  function allocation(H, total){
    var g = {};
    H.forEach(function(h){ g[h.cls] = (g[h.cls] || 0) + h.value; });
    return Object.keys(g).map(function(k){ return { cls: k, value: g[k], w: total ? g[k] / total : 0 }; })
      .filter(function(a){ return a.value !== 0; })
      .sort(function(a, b){ return b.value - a.value; });
  }

  // ---------- upload section rendering ----------
  var INPUT = 'width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:9px 10px;font-size:13px;font-family:inherit;';

  function statCard(label, value, sub){
    return '<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 18px;">' +
      '<div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:#C5A572;margin-top:6px;">' + value + '</div>' +
      (sub ? '<div style="font-size:12px;color:#64748b;margin-top:4px;">' + sub + '</div>' : '') + '</div>';
  }

  function renderStats(){
    var H = state.holdings, t = totals(H), al = allocation(H, t.value);
    var glColor = t.gl >= 0 ? '#4ade80' : '#f87171';
    $('pa-stats').innerHTML =
      statCard('Total Market Value', money(t.value)) +
      statCard('Holdings', String(t.n), state.files.length + ' file' + (state.files.length === 1 ? '' : 's')) +
      statCard('Cost Basis', t.hasCost ? money(t.cost) : '-', t.hasCost ? '' : 'Not provided') +
      statCard('Unrealized Gain / Loss', t.hasCost ? '<span style="color:' + glColor + ';">' + money(t.gl) + '</span>' : '-', t.hasCost && t.cost ? pct(t.gl / t.cost) + ' on cost' : '');
    $('pa-allocbar').innerHTML =
      '<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:#0f172a;border:1px solid #334155;">' +
      al.map(function(a){ return '<div title="' + esc(a.cls) + '" style="width:' + Math.max(a.w * 100, 0) + '%;background:' + (CLASS_COLORS[a.cls] || '#64748b') + ';"></div>'; }).join('') +
      '</div><div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;">' +
      al.map(function(a){ return '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#cbd5e1;"><span style="width:10px;height:10px;border-radius:2px;background:' + (CLASS_COLORS[a.cls] || '#64748b') + ';display:inline-block;"></span>' + esc(a.cls) + ' <span style="color:#94a3b8;">' + pct(a.w) + '</span></div>'; }).join('') +
      '</div>';
  }

  function renderHoldings(){
    var H = state.holdings;
    renderStats();
    var th = 'text-align:left;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;padding:10px 12px;border-bottom:1px solid #334155;position:sticky;top:0;background:#1e293b;';
    var td = 'padding:9px 12px;border-bottom:1px solid #243247;font-size:13px;color:#e2e8f0;';
    var total = totals(H).value;
    var sorted = H.slice().sort(function(a, b){ return b.value - a.value; });
    var html = '<table style="width:100%;border-collapse:collapse;min-width:720px;"><thead><tr>' +
      '<th style="' + th + '">Symbol</th><th style="' + th + '">Description</th><th style="' + th + 'text-align:right;">Quantity</th><th style="' + th + 'text-align:right;">Market Value</th><th style="' + th + 'text-align:right;">Weight</th><th style="' + th + '">Asset Class</th></tr></thead><tbody>';
    sorted.forEach(function(h){
      html += '<tr><td style="' + td + 'font-weight:600;color:#C5A572;">' + esc(h.symbol || '-') + '</td>' +
        '<td style="' + td + 'max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(h.name) + '</td>' +
        '<td style="' + td + 'text-align:right;">' + qtyFmt(h.qty) + '</td>' +
        '<td style="' + td + 'text-align:right;">' + money(h.value, 2) + '</td>' +
        '<td style="' + td + 'text-align:right;color:#94a3b8;">' + pct(total ? h.value / total : NaN) + '</td>' +
        '<td style="' + td + '"><select data-key="' + esc(h.key) + '" style="' + INPUT + 'padding:6px 8px;width:auto;">' +
        CLASSES.map(function(c){ return '<option' + (c === h.cls ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
        '</select></td></tr>';
    });
    html += '</tbody></table>';
    $('pa-table').innerHTML = H.length ? html : '<div style="padding:24px;color:#94a3b8;font-size:14px;">No holdings found with the current column mapping.</div>';
    Array.prototype.forEach.call($('pa-table').querySelectorAll('select[data-key]'), function(s){
      s.addEventListener('change', function(){
        var k = s.getAttribute('data-key');
        state.overrides[k] = s.value;
        H.forEach(function(h){ if (h.key === k) h.cls = s.value; });
        renderStats();
        generate();
      });
    });
    $('pa-report-empty').style.display = H.length ? 'none' : 'block';
    $('pa-builder').style.display = H.length ? 'block' : 'none';
  }

  // ---------- file handling ----------
  function loadXLSX(cb){
    if (window.XLSX) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = cb;
    s.onerror = function(){ status('Could not load the Excel reader. Save the file as CSV and try again.', 'err'); };
    document.head.appendChild(s);
  }
  function readFile(file, done){
    var name = file.name || 'file';
    if (/\.(xlsx|xls|xlsm)$/i.test(name)){
      loadXLSX(function(){
        var r = new FileReader();
        r.onload = function(e){
          try {
            var wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            done(parseRows(window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), name));
          } catch (err){ done({ error: name + ': ' + err.message }); }
        };
        r.readAsArrayBuffer(file);
      });
    } else {
      var r = new FileReader();
      r.onload = function(e){
        try { done(parseRows(parseCSV(String(e.target.result)), name)); }
        catch (err){ done({ error: name + ': ' + err.message }); }
      };
      r.readAsText(file);
    }
  }

  function handleFiles(list){
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    status('Reading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '...', 'info');
    var results = [], left = files.length;
    files.forEach(function(f, i){
      readFile(f, function(res){
        results[i] = res;
        if (--left === 0) finish(results);
      });
    });
  }

  function finish(results){
    var errors = [];
    results.forEach(function(r){
      if (r.error) { errors.push(r.error); return; }
      state.files = state.files.filter(function(f){ return f.name !== r.name; });
      state.files.push(r);
    });
    if (!state.files.length){ status(errors.join(' '), 'err'); return; }
    $('pa-filename').innerHTML = esc(state.files.map(function(f){ return f.name; }).join(', '));
    $('pa-results').style.display = 'block';
    build();
    var msg = 'Loaded ' + state.holdings.length + ' holdings from ' + state.files.length + ' file' + (state.files.length > 1 ? 's' : '') + '. Your report is ready below.';
    if (errors.length) status(msg + ' Skipped: ' + errors.join(' '), 'err'); else status(msg, 'ok');
    setTimeout(function(){ $('pa-report-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
  }

  var SAMPLE = [
    'Symbol,Description,Quantity,Price,Market Value,Cost Basis,Security Type',
    'AAPL,APPLE INC,420,228.15,95823.00,41250.00,Equity',
    'MSFT,MICROSOFT CORP,190,431.20,81928.00,52300.00,Equity',
    'VTI,VANGUARD TOTAL STOCK MARKET ETF,610,282.40,172264.00,121900.00,ETF',
    'VXUS,VANGUARD TOTAL INTL STOCK ETF,980,64.75,63455.00,58100.00,ETF',
    'NVDA,NVIDIA CORP,300,118.90,35670.00,9800.00,Equity',
    'JPM,JPMORGAN CHASE & CO,210,212.35,44593.50,31400.00,Equity',
    'XOM,EXXON MOBIL CORP,260,109.80,28548.00,31900.00,Equity',
    'PFE,PFIZER INC,700,28.10,19670.00,27300.00,Equity',
    'BND,VANGUARD TOTAL BOND MARKET ETF,1400,73.10,102340.00,108200.00,ETF',
    'MUB,ISHARES NATIONAL MUNI BOND ETF,450,107.60,48420.00,49100.00,ETF',
    'TLT,ISHARES 20+ YEAR TREASURY BOND ETF,300,92.45,27735.00,34800.00,ETF',
    'VNQ,VANGUARD REAL ESTATE ETF,240,91.30,21912.00,20400.00,ETF',
    'GLD,SPDR GOLD SHARES,90,238.60,21474.00,15600.00,ETF',
    'SWVXX,SCHWAB VALUE ADVANTAGE MONEY FUND,38450,1.00,38450.00,38450.00,Money Market',
    'Account Total,,,,801282.50,,'
  ].join('\n');

  var drop = $('pa-drop'), input = $('pa-file');
  input.addEventListener('change', function(){ handleFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.style.borderColor = '#C5A572'; drop.style.background = 'rgba(197,165,114,0.06)'; });
  });
  ['dragleave', 'drop'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.style.borderColor = '#334155'; drop.style.background = '#0f172a'; });
  });
  drop.addEventListener('drop', function(e){ if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
  $('pa-sample').addEventListener('click', function(){ finish([parseRows(parseCSV(SAMPLE), 'Sample Portfolio.csv')]); });
  $('pa-clear').addEventListener('click', function(){
    state = { files: [], holdings: [], overrides: {}, reportHTML: '', reportName: '' };
    $('pa-results').style.display = 'none';
    $('pa-builder').style.display = 'none';
    $('pa-report-empty').style.display = 'block';
    $('pa-preview-wrap').style.display = 'none';
    $('pa-preview').innerHTML = '';
    status('');
  });

  // ---------- report ----------
  var TH = 'text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;padding:8px 10px;border-bottom:2px solid #0f172a;';
  var TD = 'padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;';
  var R = 'text-align:right;';

  function secHead(n, title){
    return '<div style="display:flex;align-items:baseline;gap:12px;margin:0 0 16px 0;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">' +
      '<span style="font-size:12px;font-weight:700;color:#C5A572;letter-spacing:1px;">' + (n < 10 ? '0' + n : n) + '</span>' +
      '<span style="font-size:18px;font-weight:700;color:#0f172a;">' + esc(title) + '</span></div>';
  }
  function kpi(label, value, sub){
    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #C5A572;border-radius:8px;padding:14px 16px;">' +
      '<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;">' + label + '</div>' +
      '<div style="font-size:20px;font-weight:700;color:#0f172a;margin-top:6px;">' + value + '</div>' +
      (sub ? '<div style="font-size:11px;color:#64748b;margin-top:3px;">' + sub + '</div>' : '') + '</div>';
  }
  function donut(al){
    var off = 25, c = '';
    al.forEach(function(a){
      var p = Math.max(a.w * 100, 0);
      if (p <= 0) return;
      c += '<circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="' + (CLASS_COLORS[a.cls] || '#64748b') + '" stroke-width="6" stroke-dasharray="' + p.toFixed(3) + ' ' + (100 - p).toFixed(3) + '" stroke-dashoffset="' + off.toFixed(3) + '"></circle>';
      off -= p;
    });
    return '<svg viewBox="0 0 42 42" width="200" height="200" style="display:block;"><circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#e2e8f0" stroke-width="6"></circle>' + c + '</svg>';
  }
  function glCell(n){ return '<span style="color:' + (n >= 0 ? '#15803d' : '#b91c1c') + ';font-weight:600;">' + money(n) + '</span>'; }

  function generate(){
    if (!state.holdings.length){ state.reportHTML = ''; return; }
    var o = {
      client: val('pa-client'),
      title: val('pa-title') || 'Portfolio Review',
      prep: val('pa-prep') || 'Elevatus Wealth Management',
      date: fmtDate($('pa-date').value),
      notes: $('pa-notes').value.trim(),
      thr: (parseFloat($('pa-thr').value) || 10) / 100
    };
    var on = function(id){ return !$(id) || $(id).checked; };
    var H = state.holdings.slice().sort(function(a, b){ return b.value - a.value; });
    var t = totals(H), total = t.value;
    H.forEach(function(h){ h.w = total ? h.value / total : 0; });
    var al = allocation(H, total);
    var agg = {}, P = [];
    H.forEach(function(h){
      var k = (h.symbol || h.name).toUpperCase();
      if (!agg[k]){ agg[k] = { symbol: h.symbol, name: h.name, cls: h.cls, value: 0, w: 0 }; P.push(agg[k]); }
      agg[k].value += h.value; agg[k].w += h.w;
    });
    P.sort(function(a, b){ return b.value - a.value; });
    var top10 = P.slice(0, 10), top10w = top10.reduce(function(s, h){ return s + h.w; }, 0);
    var top5w = P.slice(0, 5).reduce(function(s, h){ return s + h.w; }, 0);
    var hhi = P.reduce(function(s, h){ return s + h.w * h.w; }, 0);
    var hasAcct = H.some(function(h){ return h.account; });
    var n = 0, out = '';

    out += '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #C5A572;padding-bottom:16px;margin-bottom:28px;gap:20px;flex-wrap:wrap;">' +
      '<div><div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C5A572;">Prepared by</div>' +
      '<div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:4px;">' + esc(o.prep) + '</div></div>' +
      '<div style="text-align:right;"><div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C5A572;">As of</div>' +
      '<div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:4px;">' + esc(o.date) + '</div></div></div>' +
      '<div style="margin-bottom:32px;"><div style="font-size:30px;font-weight:700;color:#0f172a;line-height:1.2;">' + esc(o.title) + '</div>' +
      (o.client ? '<div style="font-size:16px;color:#475569;margin-top:6px;">' + esc(o.client) + '</div>' : '') + '</div>';

    if (on('pa-s-summary')){
      var mix = al.map(function(a){ return pct(a.w) + ' ' + a.cls; }).join(', ');
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Executive Summary') +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">' +
        kpi('Total Market Value', money(total)) +
        kpi('Positions', String(P.length)) +
        (t.hasCost ? kpi('Unrealized Gain / Loss', glCell(t.gl), t.cost ? pct(t.gl / t.cost) + ' on cost basis' : '') : kpi('Largest Class', esc(al[0] ? al[0].cls : '-'), al[0] ? pct(al[0].w) : '')) +
        kpi('Largest Position', esc(P[0].symbol || P[0].name), pct(P[0].w) + ' of portfolio') +
        kpi('Top 10 Weight', pct(top10w), 'of total assets') +
        kpi('Effective Positions', hhi ? (1 / hhi).toFixed(1) : '-', 'diversification measure') +
        '</div><p style="font-size:13px;line-height:1.7;color:#334155;margin:0;">As of ' + esc(o.date) + ', the portfolio' + (o.client ? ' for ' + esc(o.client) : '') +
        ' is valued at ' + money(total) + ' across ' + P.length + ' positions. The current allocation is ' + esc(mix) + '. The ten largest positions represent ' + pct(top10w) + ' of assets' +
        (t.hasCost ? ', and the portfolio carries a net unrealized ' + (t.gl >= 0 ? 'gain' : 'loss') + ' of ' + money(Math.abs(t.gl)) + '.' : '.') + '</p></div>';
    }

    if (on('pa-s-alloc')){
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Asset Allocation') +
        '<div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;"><div style="flex:0 0 auto;">' + donut(al) + '</div>' +
        '<div style="flex:1 1 320px;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="' + TH + '">Asset Class</th><th style="' + TH + R + '">Market Value</th><th style="' + TH + R + '">Weight</th></tr></thead><tbody>' +
        al.map(function(a){
          return '<tr><td style="' + TD + '"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + (CLASS_COLORS[a.cls] || '#64748b') + ';margin-right:8px;vertical-align:middle;"></span>' + esc(a.cls) + '</td>' +
            '<td style="' + TD + R + '">' + money(a.value) + '</td><td style="' + TD + R + 'font-weight:600;">' + pct(a.w) + '</td></tr>';
        }).join('') +
        '<tr><td style="' + TD + 'font-weight:700;border-bottom:none;">Total</td><td style="' + TD + R + 'font-weight:700;border-bottom:none;">' + money(total) + '</td><td style="' + TD + R + 'font-weight:700;border-bottom:none;">100.0%</td></tr>' +
        '</tbody></table></div></div></div>';
    }

    if (on('pa-s-top')){
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Top 10 Holdings') +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="' + TH + '">Symbol</th><th style="' + TH + '">Description</th><th style="' + TH + '">Class</th><th style="' + TH + R + '">Market Value</th><th style="' + TH + R + 'width:160px;">Weight</th></tr></thead><tbody>' +
        top10.map(function(h){
          var bw = top10[0].w ? Math.round(h.w / top10[0].w * 80) : 0;
          return '<tr><td style="' + TD + 'font-weight:700;">' + esc(h.symbol || '-') + '</td><td style="' + TD + '">' + esc(h.name) + '</td><td style="' + TD + 'color:#64748b;">' + esc(h.cls) + '</td>' +
            '<td style="' + TD + R + '">' + money(h.value) + '</td>' +
            '<td style="' + TD + R + '"><span style="display:inline-block;height:8px;width:' + bw + 'px;background:#C5A572;border-radius:4px;vertical-align:middle;margin-right:8px;"></span>' + pct(h.w) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    if (on('pa-s-conc')){
      var over = P.filter(function(h){ return h.w >= o.thr; });
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Concentration Analysis') +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">' +
        kpi('Top 5 Weight', pct(top5w)) + kpi('Top 10 Weight', pct(top10w)) + kpi('Positions Over ' + pct(o.thr, 0), String(over.length)) + '</div>';
      if (over.length){
        out += '<div style="background:#fffbeb;border-left:3px solid #C5A572;padding:12px 16px;font-size:13px;color:#78350f;margin-bottom:14px;border-radius:0 6px 6px 0;">' +
          over.length + ' position' + (over.length > 1 ? 's exceed' : ' exceeds') + ' the ' + pct(o.thr, 0) + ' single position threshold.</div>' +
          '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="' + TH + '">Symbol</th><th style="' + TH + '">Description</th><th style="' + TH + R + '">Market Value</th><th style="' + TH + R + '">Weight</th></tr></thead><tbody>' +
          over.map(function(h){ return '<tr><td style="' + TD + 'font-weight:700;">' + esc(h.symbol || '-') + '</td><td style="' + TD + '">' + esc(h.name) + '</td><td style="' + TD + R + '">' + money(h.value) + '</td><td style="' + TD + R + 'font-weight:700;color:#b45309;">' + pct(h.w) + '</td></tr>'; }).join('') +
          '</tbody></table>';
      } else {
        out += '<div style="background:#f0fdf4;border-left:3px solid #15803d;padding:12px 16px;font-size:13px;color:#14532d;border-radius:0 6px 6px 0;">No single position exceeds ' + pct(o.thr, 0) + ' of the portfolio.</div>';
      }
      out += '<p style="font-size:11px;color:#64748b;margin:12px 0 0 0;line-height:1.6;">Weights are measured at the position level. Diversified funds and ETFs may hold broad underlying exposure. Effective positions (' + (hhi ? (1 / hhi).toFixed(1) : '-') + ') reflects how many equally weighted holdings would produce the same concentration.</p></div>';
    }

    if (on('pa-s-gl')){
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Unrealized Gain / Loss');
      var wc = H.filter(function(h){ return !isNaN(h.cost); }).map(function(h){ return { h: h, gl: h.value - h.cost }; });
      if (!wc.length){
        out += '<p style="font-size:13px;color:#64748b;margin:0;">Cost basis was not provided in the uploaded file.</p></div>';
      } else {
        var gains = wc.filter(function(x){ return x.gl > 0; }).sort(function(a, b){ return b.gl - a.gl; });
        var losses = wc.filter(function(x){ return x.gl < 0; }).sort(function(a, b){ return a.gl - b.gl; });
        var sg = gains.reduce(function(s, x){ return s + x.gl; }, 0), sl = losses.reduce(function(s, x){ return s + x.gl; }, 0);
        var glTable = function(list, title){
          if (!list.length) return '<div style="flex:1 1 300px;"><div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">' + title + '</div><div style="font-size:12px;color:#64748b;">None</div></div>';
          return '<div style="flex:1 1 300px;"><div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">' + title + '</div>' +
            '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="' + TH + '">Symbol</th><th style="' + TH + R + '">Cost</th><th style="' + TH + R + '">Gain / Loss</th><th style="' + TH + R + '">%</th></tr></thead><tbody>' +
            list.slice(0, 5).map(function(x){ return '<tr><td style="' + TD + 'font-weight:700;">' + esc(x.h.symbol || x.h.name) + '</td><td style="' + TD + R + '">' + money(x.h.cost) + '</td><td style="' + TD + R + '">' + glCell(x.gl) + '</td><td style="' + TD + R + '">' + (x.h.cost ? pct(x.gl / x.h.cost) : '-') + '</td></tr>'; }).join('') +
            '</tbody></table></div>';
        };
        out += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">' +
          kpi('Unrealized Gains', glCell(sg), gains.length + ' positions') + kpi('Unrealized Losses', glCell(sl), losses.length + ' positions') + kpi('Net', glCell(sg + sl), t.cost ? pct((sg + sl) / t.cost) + ' on cost' : '') + '</div>' +
          '<div style="display:flex;gap:24px;flex-wrap:wrap;">' + glTable(gains, 'Largest Unrealized Gains') + glTable(losses, 'Largest Unrealized Losses') + '</div>' +
          (losses.length ? '<p style="font-size:11px;color:#64748b;margin:12px 0 0 0;line-height:1.6;">Positions with unrealized losses may warrant review for tax management opportunities, subject to wash sale rules and the client\'s overall tax situation.</p>' : '') +
          '</div>';
      }
    }

    if (on('pa-s-notes') && o.notes){
      out += '<div style="margin-bottom:36px;page-break-inside:avoid;">' + secHead(++n, 'Advisor Commentary') +
        '<div style="font-size:13px;line-height:1.8;color:#334155;">' + esc(o.notes).replace(/\n/g, '<br>') + '</div></div>';
    }

    if (on('pa-s-full')){
      out += '<div style="margin-bottom:36px;">' + secHead(++n, 'Holdings Detail') +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr>' + (hasAcct ? '<th style="' + TH + '">Account</th>' : '') +
        '<th style="' + TH + '">Symbol</th><th style="' + TH + '">Description</th><th style="' + TH + '">Class</th><th style="' + TH + R + '">Quantity</th><th style="' + TH + R + '">Price</th><th style="' + TH + R + '">Market Value</th>' +
        (t.hasCost ? '<th style="' + TH + R + '">Cost Basis</th>' : '') + '<th style="' + TH + R + '">Weight</th></tr></thead><tbody>' +
        H.map(function(h){
          return '<tr>' + (hasAcct ? '<td style="' + TD + 'color:#64748b;">' + esc(h.account) + '</td>' : '') +
            '<td style="' + TD + 'font-weight:700;">' + esc(h.symbol || '-') + '</td><td style="' + TD + '">' + esc(h.name) + '</td><td style="' + TD + 'color:#64748b;">' + esc(h.cls) + '</td>' +
            '<td style="' + TD + R + '">' + qtyFmt(h.qty) + '</td><td style="' + TD + R + '">' + money(h.price, 2) + '</td><td style="' + TD + R + '">' + money(h.value) + '</td>' +
            (t.hasCost ? '<td style="' + TD + R + '">' + money(h.cost) + '</td>' : '') + '<td style="' + TD + R + '">' + pct(h.w) + '</td></tr>';
        }).join('') +
        '<tr><td colspan="' + (hasAcct ? 6 : 5) + '" style="' + TD + 'font-weight:700;border-bottom:none;">Total</td><td style="' + TD + R + 'font-weight:700;border-bottom:none;">' + money(total) + '</td>' +
        (t.hasCost ? '<td style="' + TD + R + 'font-weight:700;border-bottom:none;">' + money(t.cost) + '</td>' : '') + '<td style="' + TD + R + 'font-weight:700;border-bottom:none;">100.0%</td></tr>' +
        '</tbody></table></div>';
    }

    out += '<div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:12px;font-size:10px;line-height:1.6;color:#94a3b8;">' +
      'This report was prepared by ' + esc(o.prep) + ' for informational purposes using holdings data supplied at the time of preparation. It is not an official account statement. Please refer to statements from your custodian for official records. Values are shown as provided and have not been independently verified.</div>';

    state.reportHTML = '<div style="background:#ffffff;color:#0f172a;max-width:880px;margin:0 auto;padding:48px 52px;box-sizing:border-box;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">' + out + '</div>';
    state.reportName = (o.title + (o.client ? ' ' + o.client : '') + ' ' + ($('pa-date').value || '')).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    $('pa-preview').innerHTML = state.reportHTML;
    $('pa-preview-wrap').style.display = 'block';
  }

  function fullDoc(){
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(state.reportName || 'Portfolio Report') + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
      '<style>@page{size:letter;margin:0.5in}body{margin:0;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{page-break-inside:avoid}thead{display:table-header-group}@media print{body>div{padding:0 !important;max-width:none !important}' + '}</style>' +
      '</head><body>' + state.reportHTML + '</body></html>';
  }
  function printReport(){
    if (!state.reportHTML) generate();
    if (!state.reportHTML) return;
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write(fullDoc()); d.close();
    setTimeout(function(){
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 60000);
    }, 700);
  }
  function downloadReport(){
    if (!state.reportHTML) generate();
    if (!state.reportHTML) return;
    var blob = new Blob([fullDoc()], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.reportName || 'Portfolio_Report') + '.html';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
  }

  var d0 = new Date();
  $('pa-date').value = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
  var timer = null;
  ['pa-client', 'pa-title', 'pa-prep', 'pa-date', 'pa-notes', 'pa-thr'].forEach(function(id){
    var el = $(id);
    if (!el) return;
    var ev = function(){ clearTimeout(timer); timer = setTimeout(generate, 250); };
    el.addEventListener('input', ev);
    el.addEventListener('change', ev);
  });
  $('pa-print').addEventListener('click', printReport);
  $('pa-download').addEventListener('click', downloadReport);
})();
