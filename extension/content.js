/*
 * UMS Question Word Downloader — content script
 * Runs only on https://umsbd.net/Exam/Question/Index
 * READ-ONLY: it only reads the question list and opens each question's Edit page
 * to find the original Word file. It never clicks Update/Save and never posts edits.
 */
(function () {
  'use strict';
  if (window.__umsWordDownloaderLoaded) return;
  window.__umsWordDownloaderLoaded = true;

  var CONCURRENCY = 3;

  // Which UMS page are we on? (MCQ: /Exam/Question/Index, Written: /Exam/OnlineWrittenQuestion/Index)
  // (TIS_FORCE_MODE / TIS_ASSET_BASE are only set by the Live Demo page; the real extension never sees them)
  var IS_WRITTEN = window.TIS_FORCE_MODE ? window.TIS_FORCE_MODE === 'written'
    : /\/Exam\/OnlineWrittenQuestion\//i.test(location.pathname);
  var PAGE = IS_WRITTEN ? {
    kind: 'Written', label: 'Written (সৃজনশীল/লিখিত)',
    listUrl: '/Exam/OnlineWrittenQuestion/ManageOnlineWrittenQuestionResult',
    versionIds: ['QuestionVersion', 'ExamVersion'], uddipokParam: 'isUddipok', fileTag: '_Written'
  } : {
    kind: 'MCQ', label: 'MCQ',
    listUrl: '/Exam/Question/ManageQuestionResult',
    versionIds: ['ExamVersion', 'QuestionVersion'], uddipokParam: 'hasUddipok', fileTag: ''
  };
  function versionSelect() {
    for (var i = 0; i < PAGE.versionIds.length; i++) { var e = document.getElementById(PAGE.versionIds[i]); if (e) return e; }
    return null;
  }

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function selText(sel) {
    if (!sel || sel.selectedIndex < 0) return '';
    return (sel.options[sel.selectedIndex].text || '').trim();
  }
  function selVal(sel) { return sel ? (sel.value || '') : ''; }
  function safeName(s) {
    return String(s).replace(/[\\\/:*?"<>|\[\]]+/g, ' ').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 150);
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function readSelections() {
    var exam = document.querySelector('.examPin') || $('ExamId');
    var examId = exam ? (exam.getAttribute('data-examid') || exam.getAttribute('data-ExamId') || '0') : '0';
    return {
      orgId: selVal($('OrganizationId')), orgText: selText($('OrganizationId')),
      progId: selVal($('ProgramId')), progText: selText($('ProgramId')),
      sessId: selVal($('SessionId')), sessText: selText($('SessionId')),
      courseId: selVal($('CourseId')), courseText: selText($('CourseId')),
      examId: examId, examText: exam ? (exam.value || '').trim() : '',
      version: selVal(versionSelect()) || '0', versionText: selText(versionSelect()),
      keyword: $('KeyWord') ? $('KeyWord').value : '',
      uniqueSetNo: $('UniqueSetNo') ? $('UniqueSetNo').value : '',
      hasUddipok: selVal($('HasUddipok')),
      importFromWord: selVal($('ImportFromWord'))
    };
  }

  function validate(s) {
    var miss = [];
    if (!s.orgId || s.orgId === '0') miss.push('Organization');
    if (!s.progId || s.progId === '0') miss.push('Program');
    if (!s.sessId || s.sessId === '0') miss.push('Session');
    if (!s.courseId || s.courseId === '0') miss.push('Course');
    if (!s.examId || s.examId === '0') miss.push('Exam (Search Exam ঘরে code লিখে নিচের তালিকা থেকে click করে select করুন)');
    return miss;
  }

  function isLoginPage(resp, text) {
    return (resp && resp.url && /\/Account\/Login/i.test(resp.url)) ||
      (typeof text === 'string' && /<title>[^<]*Log in/i.test(text));
  }

  async function fetchQuestionList(s) {
    var body = new URLSearchParams({
      draw: '1', start: '0', length: '5000',
      organizationIds: s.orgId, programIds: s.progId, sessionIds: s.sessId, courseIds: s.courseId,
      examIds: s.examId, examVersion: s.version, keyword: s.keyword || '',
      uniqueSetNo: s.uniqueSetNo || '', importFromWord: s.importFromWord || ''
    });
    body.set(PAGE.uddipokParam, s.hasUddipok || '');
    var resp = await fetch(PAGE.listUrl, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: body
    });
    var text = await resp.text();
    if (isLoginPage(resp, text)) throw new Error('LOGIN');
    var json;
    try { json = JSON.parse(text); } catch (e) { throw new Error('প্রশ্নের তালিকা পড়া গেল না (server উত্তর JSON নয়)।'); }
    return (json.data || []).map(function (row) {
      var actions = row[row.length - 1] || '';
      var edit = /href=['"]([^'"]*EditFromWord\?Id=(\d+)[^'"]*)['"]/i.exec(actions);
      var anyEdit = /title=['"]Edit['"][^>]*href=['"]([^'"]+)['"]|href=['"]([^'"]+)['"][^>]*title=['"]Edit['"]/i.exec(actions);
      return {
        exam: row[0], set: String(row[1]).trim(), sl: parseInt(row[2], 10) || 0, version: String(row[3]).trim(),
        editUrl: edit ? edit[1] : null, id: edit ? edit[2] : null,
        otherEdit: !edit && anyEdit ? (anyEdit[1] || anyEdit[2]) : null
      };
    });
  }

  async function fetchOriginalDocx(q) {
    var resp = await fetch(q.editUrl, { credentials: 'same-origin' });
    var html = await resp.text();
    if (isLoginPage(resp, html)) throw new Error('LOGIN');
    var m = /document\s*:\s*\{[\s\S]*?url\s*:\s*["']([^"']+?\.docx?)["']/i.exec(html) ||
            /url\s*:\s*["'](https?:\/\/[^"']+?\.docx)["']/i.exec(html);
    if (!m) throw new Error('Edit পেজে Word file এর লিংক পাওয়া যায়নি');
    var r2 = await fetch(m[1], { credentials: 'same-origin' });
    if (!r2.ok) throw new Error('Word file download হয়নি (HTTP ' + r2.status + ')');
    var buf = await r2.arrayBuffer();
    var head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
    if (head[0] !== 0x50 || head[1] !== 0x4B) throw new Error('Download করা file টি Word (.docx) নয়');
    return buf;
  }

  async function runPool(items, worker, onDone) {
    var i = 0, results = new Array(items.length);
    async function next() {
      while (i < items.length) {
        var idx = i++;
        try { results[idx] = { ok: true, value: await worker(items[idx], idx) }; }
        catch (e) { results[idx] = { ok: false, error: e }; }
        onDone(idx, results[idx]);
      }
    }
    var runners = [];
    for (var k = 0; k < Math.min(CONCURRENCY, items.length); k++) runners.push(next());
    await Promise.all(runners);
    return results;
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  /* ---------------- panel UI ---------------- */
  var panel = document.createElement('div');
  panel.id = 'umswd-panel';
  panel.innerHTML =
    '<div class="umswd-head"><span class="umswd-title"><img class="umswd-logo" alt=""><span>TIS Question Downloader</span></span><button type="button" class="umswd-min" title="ছোট/বড় করুন">–</button></div>' +
    '<div class="umswd-body">' +
    '  <div class="umswd-mode">📝 এই পেজ: <b>' + PAGE.label + '</b> প্রশ্ন</div>' +
    '  <div class="umswd-help">১) উপরের ফর্মে Organization, Program, Session, Course, Exam আর Version select করুন।<br>২) তারপর নিচের বোতাম চাপুন।</div>' +
    '  <div class="umswd-sel"></div>' +
    '  <label class="umswd-opt"><input type="checkbox" class="umswd-header" checked> উপরে Heading (Course, Exam) দাও</label>' +
    '  <button type="button" class="umswd-go">⬇ Word File Download</button>' +
    '  <div class="umswd-bar"><div></div></div>' +
    '  <div class="umswd-log"></div>' +
    '  <div class="umswd-dev"></div>' +
    '</div>';
  document.body.appendChild(panel);

  function extUrl(p) {
    var base = window.TIS_ASSET_BASE || '';
    try { return (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : base + p; }
    catch (e) { return base + p; }
  }
  panel.querySelector('.umswd-logo').src = extUrl('icon48.png');
  if (window.TisProfile) {
    panel.querySelector('.umswd-dev').appendChild(window.TisProfile.build([extUrl('photo.jpg'), extUrl('photo.png')]));
  }

  var elSel = panel.querySelector('.umswd-sel'), elLog = panel.querySelector('.umswd-log'),
      elGo = panel.querySelector('.umswd-go'), elBar = panel.querySelector('.umswd-bar > div'),
      elHeader = panel.querySelector('.umswd-header');

  panel.querySelector('.umswd-min').addEventListener('click', function () {
    panel.classList.toggle('umswd-collapsed');
    this.textContent = panel.classList.contains('umswd-collapsed') ? '+' : '–';
  });

  function log(msg, kind) {
    var d = document.createElement('div');
    d.className = 'umswd-line' + (kind ? ' umswd-' + kind : '');
    d.textContent = msg;
    elLog.appendChild(d);
    elLog.scrollTop = elLog.scrollHeight;
  }
  function progress(done, total) { elBar.style.width = total ? Math.round(done * 100 / total) + '%' : '0'; }

  function renderSelections() {
    var s = readSelections();
    var rows = [['Organization', s.orgText], ['Program', s.progText], ['Session', s.sessText], ['Course', s.courseText],
      ['Exam', s.examId && s.examId !== '0' ? s.examText : ''], ['Version', s.versionText || 'Version(ALL)']];
    elSel.innerHTML = '';
    rows.forEach(function (r) {
      var ok = r[1] && !/^Select /i.test(r[1]);
      var line = document.createElement('div');
      line.className = ok ? 'umswd-ok' : 'umswd-miss';
      line.textContent = (ok ? '✔ ' : '✖ ') + r[0] + ': ' + (ok ? r[1] : '— select করা হয়নি');
      elSel.appendChild(line);
    });
  }
  renderSelections();
  document.addEventListener('change', function (e) { if (!panel.contains(e.target)) setTimeout(renderSelections, 300); }, true);
  document.addEventListener('click', function (e) { if (!panel.contains(e.target)) setTimeout(renderSelections, 600); }, true);
  document.addEventListener('keyup', function (e) { if (!panel.contains(e.target)) setTimeout(renderSelections, 800); }, true);

  var busy = false;
  elGo.addEventListener('click', async function () {
    if (busy) return;
    renderSelections();
    elLog.innerHTML = ''; progress(0, 0);
    var s = readSelections();
    var miss = validate(s);
    if (miss.length) { log('আগে select করুন: ' + miss.join(', '), 'err'); return; }

    busy = true; elGo.disabled = true; elGo.textContent = '⏳ কাজ চলছে...';
    try {
      log('প্রশ্নের তালিকা আনা হচ্ছে...');
      var list = await fetchQuestionList(s);
      if (!list.length) { log('এই Exam এ কোনো প্রশ্ন পাওয়া যায়নি (filter ঠিক আছে কি না দেখুন)।', 'err'); return; }

      var groups = {};
      list.forEach(function (q) {
        var key = q.set + '||' + q.version;
        (groups[key] = groups[key] || []).push(q);
      });
      var keys = Object.keys(groups).sort();
      var setCount = {};
      keys.forEach(function (k) { setCount[k.split('||')[0]] = 1; });
      var multiSet = Object.keys(setCount).length > 1;
      log('মোট ' + list.length + 'টি প্রশ্ন পাওয়া গেছে (' + keys.map(function (k) {
        var p = k.split('||'); return (multiSet ? 'Set-' + p[0] + ' ' : '') + p[1] + ': ' + groups[k].length;
      }).join(', ') + ')');

      var all = [];
      keys.forEach(function (k) { groups[k].sort(function (a, b) { return a.sl - b.sl; }); all = all.concat(groups[k].filter(function (q) { return q.editUrl; })); });
      var nonWord = list.filter(function (q) { return !q.editUrl; });
      if (nonWord.length) {
        log('⚠ ' + nonWord.length + 'টি প্রশ্ন Word থেকে Import করা নয় (Edit এ Word file নেই), সেগুলো বাদ: ' +
          nonWord.map(function (q) { return q.version + ' প্রশ্ন ' + q.sl; }).join(', '), 'warn');
      }
      if (!all.length) { log('Download করার মতো কোনো Word প্রশ্ন নেই।', 'err'); return; }

      var done = 0, loginLost = false;
      var results = await runPool(all, async function (q) {
        if (loginLost) throw new Error('LOGIN');
        return fetchOriginalDocx(q);
      }, function (idx, res) {
        done++; progress(done, all.length + keys.length);
        var q = all[idx];
        if (!res.ok) {
          if (res.error && res.error.message === 'LOGIN') loginLost = true;
          else log('✖ ' + q.version + ' প্রশ্ন ' + q.sl + ': ' + (res.error && res.error.message), 'err');
        }
      });
      if (loginLost) { log('Login session শেষ হয়ে গেছে। আবার login করে চেষ্টা করুন।', 'err'); return; }
      var byId = {};
      all.forEach(function (q, i) { byId[q.id + '|' + i] = results[i]; q._res = results[i]; });

      var files = 0;
      for (var gi = 0; gi < keys.length; gi++) {
        var parts = keys[gi].split('||'), set = parts[0], ver = parts[1];
        var qs = groups[keys[gi]].filter(function (q) { return q.editUrl && q._res && q._res.ok; });
        if (!qs.length) { log('✖ ' + ver + ': কোনো file পাওয়া যায়নি', 'err'); continue; }
        var headerLines = [];
        if (elHeader.checked) {
          headerLines = [s.courseText + ' - ' + s.sessText, s.examText + ' | ' + ver + ' Version' + (multiSet ? ' | Set-' + set : '')];
        }
        var merged = await window.UmsMerger.mergeDocx(qs.map(function (q) { return q._res.value; }), { headerLines: headerLines });
        var dup = merged.skipped.filter(function (x) { return x.reason === 'duplicate'; });
        dup.forEach(function (x) {
          log('ℹ ' + ver + ' প্রশ্ন ' + qs[x.index].sl + ' আর প্রশ্ন ' + qs[x.sameAs].sl + ' একই Word file (একই উদ্দীপক), তাই একবার রাখা হলো', 'info');
        });
        var code = (/\[(\d+)\]/.exec(s.examText) || [])[1] || s.examId;
        var fname = safeName(s.courseText) + PAGE.fileTag + '_Code-' + code + '_' + safeName(ver) + (multiSet ? '_Set-' + set : '') + '.docx';
        saveBlob(merged.data, fname);
        files++;
        progress(all.length + gi + 1, all.length + keys.length);
        log('✔ ' + fname + ' (' + qs.length + 'টি প্রশ্ন) download হয়েছে', 'ok');
        await sleep(400);
      }
      if (files) log('শেষ! মোট ' + files + 'টি Word file download হয়েছে। (সাইটে কিছু পরিবর্তন করা হয়নি)', 'ok');
    } catch (e) {
      if (e && e.message === 'LOGIN') log('Login session শেষ হয়ে গেছে। আবার login করে চেষ্টা করুন।', 'err');
      else log('সমস্যা: ' + (e && e.message ? e.message : e), 'err');
      console.error('[UMS Word Downloader]', e);
    } finally {
      busy = false; elGo.disabled = false; elGo.textContent = '⬇ Word File Download';
    }
  });
})();
