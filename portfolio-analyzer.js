(function(){
  var $ = function(id){ return document.getElementById(id); };
  var root = $('pa-root');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');

  var files = [];   // { id, file, url }
  var nextId = 1;

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function size(n){
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function ext(name){ var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  function kind(f){
    var t = f.type || '', e = ext(f.name);
    if (/^image\//.test(t) || /^(png|jpe?g|gif|bmp|webp|svg)$/.test(e)) return 'image';
    if (t === 'application/pdf' || e === 'pdf') return 'pdf';
    if (/^video\//.test(t)) return 'video';
    if (/^audio\//.test(t)) return 'audio';
    if (/^text\//.test(t) || /^(txt|csv|tsv|json|xml|md|log|html?|js|css)$/.test(e)) return 'text';
    return 'other';
  }
  function status(msg, ok){
    var el = $('pa-status');
    if (!msg){ el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.color = ok ? '#4ade80' : '#94a3b8';
    el.style.borderColor = ok ? 'rgba(74,222,128,0.35)' : '#334155';
    el.textContent = msg;
  }

  function addFiles(list){
    var added = 0;
    Array.prototype.forEach.call(list || [], function(f){
      files.push({ id: nextId++, file: f, url: URL.createObjectURL(f) });
      added++;
    });
    if (!added) return;
    render();
    status(added + ' document' + (added > 1 ? 's' : '') + ' uploaded. ' + files.length + ' total.', true);
    preview(files[files.length - 1].id);
  }

  function render(){
    $('pa-empty').style.display = files.length ? 'none' : 'block';
    $('pa-output').style.display = files.length ? 'block' : 'none';
    $('pa-count').textContent = files.length + ' document' + (files.length === 1 ? '' : 's');
    $('pa-list').innerHTML = files.map(function(x){
      var f = x.file;
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px 16px;">' +
        '<div style="min-width:0;flex:1 1 240px;">' +
          '<div style="font-size:14px;font-weight:600;color:#C5A572;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(f.name) + '</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:3px;">' + esc((ext(f.name) || 'file').toUpperCase()) + ' &middot; ' + size(f.size) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button type="button" data-view="' + x.id + '" style="background:transparent;color:#e2e8f0;font-size:13px;font-weight:600;border:1px solid #475569;border-radius:8px;padding:8px 14px;cursor:pointer;font-family:inherit;">Preview</button>' +
          '<a href="' + x.url + '" download="' + esc(f.name) + '" style="display:inline-block;background:#C5A572;color:#0f172a;font-size:13px;font-weight:600;border-radius:8px;padding:8px 14px;text-decoration:none;">Download</a>' +
          '<button type="button" data-remove="' + x.id + '" style="background:transparent;color:#94a3b8;font-size:13px;font-weight:600;border:1px solid #334155;border-radius:8px;padding:8px 14px;cursor:pointer;font-family:inherit;">Remove</button>' +
        '</div></div>';
    }).join('');
  }

  function find(id){ for (var i = 0; i < files.length; i++){ if (files[i].id === id) return files[i]; } return null; }

  function preview(id){
    var x = find(id), box = $('pa-view');
    if (!x){ box.innerHTML = ''; $('pa-view-name').textContent = ''; return; }
    var f = x.file, k = kind(f);
    $('pa-view-name').textContent = f.name;
    var frame = 'width:100%;border:0;border-radius:10px;background:#ffffff;';
    if (k === 'image') box.innerHTML = '<div style="text-align:center;background:#0f172a;border-radius:10px;padding:16px;"><img src="' + x.url + '" alt="' + esc(f.name) + '" style="max-width:100%;height:auto;border-radius:6px;"></div>';
    else if (k === 'pdf') box.innerHTML = '<iframe src="' + x.url + '" title="' + esc(f.name) + '" style="' + frame + 'height:720px;"></iframe>';
    else if (k === 'video') box.innerHTML = '<video src="' + x.url + '" controls style="width:100%;border-radius:10px;"></video>';
    else if (k === 'audio') box.innerHTML = '<audio src="' + x.url + '" controls style="width:100%;"></audio>';
    else if (k === 'text'){
      box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px;">Loading...</div>';
      var r = new FileReader();
      r.onload = function(e){
        box.innerHTML = '<pre style="margin:0;max-height:620px;overflow:auto;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;font-size:12px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;font-family:Consolas,Menlo,monospace;">' + esc(e.target.result) + '</pre>';
      };
      r.readAsText(f);
    }
    else box.innerHTML = '<div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:32px;text-align:center;">' +
      '<div style="font-size:14px;font-weight:600;color:#C5A572;margin-bottom:6px;">Preview not available for this file type</div>' +
      '<div style="font-size:13px;color:#64748b;margin-bottom:16px;">Download it to open the original file.</div>' +
      '<a href="' + x.url + '" download="' + esc(f.name) + '" style="display:inline-block;background:#C5A572;color:#0f172a;font-size:13px;font-weight:600;border-radius:8px;padding:9px 16px;text-decoration:none;">Download ' + esc(f.name) + '</a></div>';
  }

  $('pa-list').addEventListener('click', function(e){
    var v = e.target.getAttribute('data-view'), r = e.target.getAttribute('data-remove');
    if (v){ preview(parseInt(v, 10)); $('pa-view-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (r){
      var id = parseInt(r, 10), x = find(id);
      if (x) URL.revokeObjectURL(x.url);
      files = files.filter(function(f){ return f.id !== id; });
      render();
      preview(files.length ? files[files.length - 1].id : 0);
      status(files.length ? files.length + ' document' + (files.length === 1 ? '' : 's') + ' uploaded.' : '', true);
    }
  });

  var drop = $('pa-drop'), input = $('pa-file');
  input.addEventListener('change', function(){ addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.style.borderColor = '#C5A572'; drop.style.background = 'rgba(197,165,114,0.06)'; });
  });
  ['dragleave', 'drop'].forEach(function(ev){
    drop.addEventListener(ev, function(e){ e.preventDefault(); drop.style.borderColor = '#334155'; drop.style.background = '#0f172a'; });
  });
  drop.addEventListener('drop', function(e){ if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  $('pa-clear').addEventListener('click', function(){
    files.forEach(function(x){ URL.revokeObjectURL(x.url); });
    files = [];
    render();
    preview(0);
    status('');
  });
})();
