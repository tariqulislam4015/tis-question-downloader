/*
 * Live Demo: simulates the UMS server inside the browser so the REAL extension
 * code (extension/content.js + merger.js) can run on GitHub Pages.
 * Must load BEFORE extension/content.js.
 * All sample questions are fictional demo data.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var MODE = params.get('mode') === 'written' ? 'written' : 'mcq';
  window.TIS_FORCE_MODE = MODE;            // tells content.js which page it is on
  window.TIS_ASSET_BASE = 'extension/';    // where content.js finds icon48.png / photo.jpg

  // question list per mode: [serial, sample file id]
  var DATA = {
    mcq: {
      examId: '9001', examText: '[294] Demo Daily Exam Science-01',
      rows: [[1, 'mcq-101'], [2, 'mcq-102'], [3, 'mcq-103'], [4, 'mcq-103']] // Q3 & Q4 share one stem file
    },
    written: {
      examId: '9002', examText: '[399] Demo Chapterwise Exam Mathematics-01',
      rows: [[1, 'written-201'], [2, 'written-202']]
    }
  };
  var cfg = DATA[MODE];
  var VERSIONS = { '1': ['Bangla'], '2': ['English'], '0': ['Bangla', 'English'] };

  var realFetch = window.fetch.bind(window);

  function json(obj) {
    return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  function html(text) {
    return new Response(text, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : input.url;

    // 1) question list (ManageQuestionResult / ManageOnlineWrittenQuestionResult)
    if (/Manage\w*Result/.test(url)) {
      await delay(350);
      var body = new URLSearchParams((init && init.body) ? String(init.body) : '');
      var vers = VERSIONS[body.get('examVersion') || '0'] || VERSIONS['0'];
      var rows = [];
      vers.forEach(function (v, vi) {
        cfg.rows.forEach(function (r) {
          var qid = (vi + 1) * 1000 + r[0];
          var base = MODE === 'written' ? '/Exam/OnlineWrittenQuestion' : '/Exam/ExamMcqWordOnlineQuestion';
          var action = "<div><a title='Edit' href='" + base + "/EditFromWord?Id=" + qid + "&file=" + r[1] +
            "' class='glyphicon glyphicon-pencil'></a></div>";
          rows.push([cfg.examText, '1', String(r[0]), v, 'No', 'Yes', 'Yes', '(question)', '', '', '', '', '', '', '', '', action]);
        });
      });
      return json({ draw: 1, recordsTotal: rows.length, recordsFiltered: rows.length, data: rows });
    }

    // 2) the Edit page: contains the ONLYOFFICE config with the original .docx URL
    var m = /EditFromWord\?Id=\d+&file=([\w-]+)/i.exec(url);
    if (m) {
      await delay(200);
      return html('<script>var docEditor = new DocsAPI.DocEditor("iframeEditor", { documentType: "word", ' +
        'document: { title: "q.docx", url: "demo/samples/' + m[1] + '.docx", fileType: "docx" } });</script>');
    }

    // 3) everything else (the sample .docx files themselves) is served normally
    return realFetch(input, init);
  };

  // --- fill the fake UMS form (called inline right after the form, before content.js) ---
  window.tisDemoInit = function () {
    var exam = document.getElementById('ExamId');
    exam.value = cfg.examText;
    exam.setAttribute('data-examid', cfg.examId);
    var vs = document.getElementById('ExamVersion');
    if (MODE === 'written') vs.id = 'QuestionVersion';
    document.querySelectorAll('[data-mode]').forEach(function (a) {
      if (a.getAttribute('data-mode') === MODE) a.classList.add('active');
    });
    var t = document.getElementById('demo-page-title');
    if (t) t.textContent = MODE === 'written' ? 'Manage Online Written Question' : 'Manage Question';
    var u = document.getElementById('demo-url');
    if (u) u.textContent = MODE === 'written' ? 'umsbd.net/Exam/OnlineWrittenQuestion/Index' : 'umsbd.net/Exam/Question/Index';
  };
})();
