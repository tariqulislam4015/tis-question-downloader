/*
 * UMS Word merger: joins several question .docx files into one .docx
 * without changing their content. Works in the browser (window.UmsMerger)
 * and in Node (module.exports) — needs JSZip.
 *
 * What it does to each source file:
 *  - takes everything inside <w:body> except the body-level <w:sectPr>
 *  - copies images / charts / embedded objects it refers to (new unique names)
 *  - only fixes XML element ORDER where the source breaks the Word schema
 *    (tblPr children, tblCellMar children, trPr position, duplicate empty pPr)
 *    so that MS Word opens the file without a repair prompt. Text is untouched.
 */
(function (root) {
  'use strict';

  var W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var EXT_TYPES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
    tif: 'image/tiff', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', svg: 'image/svg+xml',
    wdp: 'image/vnd.ms-photo', bin: 'application/vnd.openxmlformats-officedocument.oleObject',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rels: 'application/vnd.openxmlformats-package.relationships+xml', xml: 'application/xml'
  };

  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stripBom(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }
  function dirname(p) { var i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); }
  function basename(p) { return p.slice(p.lastIndexOf('/') + 1); }
  function extOf(p) { var b = basename(p), i = b.lastIndexOf('.'); return i < 0 ? '' : b.slice(i + 1).toLowerCase(); }
  function normPath(p) {
    var out = [];
    p.split('/').forEach(function (seg) {
      if (!seg || seg === '.') return;
      if (seg === '..') out.pop(); else out.push(seg);
    });
    return out.join('/');
  }
  function resolveTarget(fromPart, target) {
    if (target.charAt(0) === '/') return normPath(target);
    return normPath(dirname(fromPart) + '/' + target);
  }
  function relsPathFor(part) { return (dirname(part) ? dirname(part) + '/' : '') + '_rels/' + basename(part) + '.rels'; }
  function relativeTo(fromPart, toPart) {
    var a = dirname(fromPart).split('/').filter(Boolean), b = toPart.split('/');
    var i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    var ups = [];
    for (var j = i; j < a.length; j++) ups.push('..');
    return ups.concat(b.slice(i)).join('/');
  }

  /* ---------- tiny XML helpers (string based, keeps source bytes) ---------- */

  function parseAttrs(tag) {
    var attrs = {}, re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, m;
    while ((m = re.exec(tag))) attrs[m[1]] = m[3] !== undefined ? m[3] : m[4];
    return attrs;
  }

  // Split the top-level child elements of an XML fragment.
  function topChildren(xml) {
    var out = [], depth = 0, start = -1, re = /<(\/?)([\w:.-]+)[^>]*?(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g, m;
    while ((m = re.exec(xml))) {
      if (m[2] === undefined) continue;
      var closing = m[1] === '/', selfClose = m[3] === '/';
      if (!closing) {
        if (depth === 0) start = m.index;
        if (selfClose) { if (depth === 0) out.push({ name: m[2], xml: xml.slice(start, re.lastIndex) }); }
        else depth++;
      } else {
        depth--;
        if (depth === 0) out.push({ name: m[2], xml: xml.slice(start, re.lastIndex) });
      }
    }
    return out;
  }

  function reorderChildren(inner, order) {
    var kids = topChildren(inner);
    if (kids.length < 2) return inner;
    var idx = function (k) { var i = order.indexOf(k.name.replace(/^\w+:/, '')); return i < 0 ? 999 : i; };
    var sorted = kids.map(function (k, i) { return { k: k, i: i }; })
      .sort(function (a, b) { return (idx(a.k) - idx(b.k)) || (a.i - b.i); })
      .map(function (x) { return x.k.xml; });
    return sorted.join('');
  }

  var TBLPR_ORDER = ['tblStyle', 'tblpPr', 'tblOverlap', 'bidiVisual', 'tblStyleRowBandSize', 'tblStyleColBandSize',
    'tblW', 'jc', 'tblCellSpacing', 'tblInd', 'tblBorders', 'shd', 'tblLayout', 'tblCellMar', 'tblLook',
    'tblCaption', 'tblDescription', 'tblPrChange'];
  var CELLMAR_ORDER = ['top', 'start', 'left', 'bottom', 'end', 'right'];

  function fixStructure(body) {
    // 1) duplicate empty pPr:  <w:pPr /><w:pPr>  ->  <w:pPr>
    body = body.replace(/<w:pPr\s*\/>\s*(?=<w:pPr[\s>])/g, '');
    // 2) tblPr / tblCellMar child order
    body = body.replace(/<w:tblPr>([\s\S]*?)<\/w:tblPr>/g, function (all, inner) {
      if (/<w:tblPr[\s>]/.test(inner)) return all; // nested oddity: leave alone
      inner = inner.replace(/<w:tblCellMar>([\s\S]*?)<\/w:tblCellMar>/g, function (a, ci) {
        return '<w:tblCellMar>' + reorderChildren(ci, CELLMAR_ORDER) + '</w:tblCellMar>';
      });
      return '<w:tblPr>' + reorderChildren(inner, TBLPR_ORDER) + '</w:tblPr>';
    });
    // 2b) inside an equation run, <m:rPr> must come before <w:rPr>
    body = body.replace(/<m:r>(\s*<w:rPr\b[^>]*?(?:\/>|>[\s\S]*?<\/w:rPr>))(\s*<m:rPr\b[^>]*?(?:\/>|>[\s\S]*?<\/m:rPr>))/g,
      function (all, wrpr, mrpr) { return '<m:r>' + mrpr + wrpr; });
    // 3) <w:trPr> must be the first child of <w:tr> (after tblPrEx)
    var re = /<w:trPr>[\s\S]*?<\/w:trPr>\s*<\/w:tr>/g, m, edits = [];
    while ((m = re.exec(body))) {
      var trPr = m[0].replace(/\s*<\/w:tr>$/, '');
      // walk back to the matching <w:tr ...> opening
      var depth = 0, pos = m.index, tagRe = /<(\/?)w:tr(?=[\s>\/])[^>]*?(\/?)>/g, opens = [], t;
      tagRe.lastIndex = 0;
      var before = body.slice(0, pos), stack = [];
      while ((t = tagRe.exec(before))) {
        if (t[2] === '/') continue;
        if (t[1] === '/') stack.pop(); else stack.push({ idx: t.index, end: tagRe.lastIndex });
      }
      var open = stack[stack.length - 1];
      if (!open) continue;
      // is trPr already first?
      var afterOpen = body.slice(open.end, m.index);
      if (!/<w:tc[\s>]/.test(afterOpen)) continue;
      edits.push({ open: open, start: m.index, len: trPr.length, trPr: trPr });
    }
    for (var i = edits.length - 1; i >= 0; i--) {
      var e = edits[i];
      body = body.slice(0, e.start) + body.slice(e.start + e.len);
      var insertAt = e.open.end;
      var rest = body.slice(insertAt);
      var ex = /^\s*<w:tblPrEx>[\s\S]*?<\/w:tblPrEx>/.exec(rest);
      if (ex) insertAt += ex[0].length;
      body = body.slice(0, insertAt) + e.trPr + body.slice(insertAt);
    }
    return body;
  }

  // Remove body-level sectPr (not the ones inside a paragraph's pPr). Returns {body, sectPr}.
  function takeBodySectPr(body) {
    var re = /<w:sectPr\b[\s\S]*?<\/w:sectPr>|<w:sectPr\b[^>]*\/>/g, m, found = null, out = '', last = 0;
    while ((m = re.exec(body))) {
      var before = body.slice(0, m.index);
      var openRe = /<w:pPr\b[^>]*?(\/?)>/g, o, lastOpen = -1, lastOpenSelf = false;
      while ((o = openRe.exec(before))) { lastOpen = o.index; lastOpenSelf = o[1] === '/'; }
      var lastClose = before.lastIndexOf('</w:pPr>');
      var insidePPr = lastOpen > lastClose && !lastOpenSelf;
      if (!insidePPr) {
        found = m[0];
        out += body.slice(last, m.index);
        last = re.lastIndex;
      }
    }
    out += body.slice(last);
    return { body: out.trim(), sectPr: found };
  }

  function relPrefixFromRoot(rootTag) {
    var attrs = parseAttrs(rootTag), p;
    for (p in attrs) if (p.indexOf('xmlns:') === 0 && attrs[p] === R_NS) return p.slice(6);
    return 'r';
  }

  /* ---------------- package helpers ---------------- */

  function ContentTypes(xml) {
    this.defaults = {}; this.overrides = {};
    var m, re = /<Default\b[^>]*>/g;
    while ((m = re.exec(xml))) { var a = parseAttrs(m[0]); this.defaults[(a.Extension || '').toLowerCase()] = a.ContentType; }
    re = /<Override\b[^>]*>/g;
    while ((m = re.exec(xml))) { var b = parseAttrs(m[0]); this.overrides[normPath(b.PartName || '')] = b.ContentType; }
  }
  ContentTypes.prototype.typeOf = function (part) {
    return this.overrides[normPath(part)] || this.defaults[extOf(part)] || null;
  };
  ContentTypes.prototype.toXml = function () {
    var s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', k;
    for (k in this.defaults) s += '<Default Extension="' + escXml(k) + '" ContentType="' + escXml(this.defaults[k]) + '"/>';
    for (k in this.overrides) s += '<Override PartName="/' + escXml(k) + '" ContentType="' + escXml(this.overrides[k]) + '"/>';
    return s + '</Types>';
  };

  function parseRels(xml) {
    var list = [], m, re = /<Relationship\b[^>]*>/g;
    while ((m = re.exec(xml || ''))) list.push(parseAttrs(m[0]));
    return list;
  }
  function relsXml(list) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      list.map(function (r) {
        return '<Relationship Id="' + escXml(r.Id) + '" Type="' + escXml(r.Type) + '" Target="' + escXml(r.Target) + '"' +
          (r.TargetMode ? ' TargetMode="' + escXml(r.TargetMode) + '"' : '') + '/>';
      }).join('') + '</Relationships>';
  }

  async function readText(zip, path) {
    var f = zip.file(path);
    return f ? stripBom(await f.async('string')) : null;
  }

  async function mainDocPath(zip) {
    var rels = parseRels(await readText(zip, '_rels/.rels'));
    for (var i = 0; i < rels.length; i++) {
      if (/\/officeDocument$/.test(rels[i].Type)) return resolveTarget('', rels[i].Target);
    }
    return 'word/document.xml';
  }

  function headerParagraph(text) {
    var rpr = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>';
    return '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>' + rpr + '</w:pPr>' +
      (text ? '<w:r>' + rpr + '<w:t xml:space="preserve">' + escXml(text) + '</w:t></w:r>' : '') + '</w:p>';
  }
  var GAP = '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>';

  /**
   * mergeDocx(buffers, options) -> Promise<Uint8Array|Blob|Buffer>
   *   buffers: array of ArrayBuffer/Uint8Array/Buffer (.docx files, in order)
   *   options.headerLines: array of strings put centered/bold at the top (optional)
   *   options.dedupe: skip a file whose body is identical to one already added (default true)
   *   options.outputType: JSZip output type (default 'blob' in browser, 'nodebuffer' in Node)
   * Returns { data, used, skipped }
   */
  async function mergeDocx(buffers, options) {
    options = options || {};
    var JSZipLib = options.JSZip || root.JSZip;
    if (!JSZipLib) throw new Error('JSZip not loaded');
    var dedupe = options.dedupe !== false;

    var zips = [];
    for (var i = 0; i < buffers.length; i++) zips.push(await JSZipLib.loadAsync(buffers[i]));
    if (!zips.length) throw new Error('No files to merge');

    var base = zips[0];
    var basePart = await mainDocPath(base);
    var baseXml = await readText(base, basePart);
    var out = new JSZipLib();

    // copy base package as-is (except the main document, its rels and content types)
    var baseRelsPath = relsPathFor(basePart);
    var names = Object.keys(base.files);
    for (i = 0; i < names.length; i++) {
      var n = names[i];
      if (base.files[n].dir) continue;
      if (n === basePart || n === baseRelsPath || n === '[Content_Types].xml') continue;
      out.file(n, await base.file(n).async('uint8array'), { createFolders: false });
    }
    var ct = new ContentTypes(await readText(base, '[Content_Types].xml') || '');
    var outRels = parseRels(await readText(base, baseRelsPath));
    var usedIds = {};
    outRels.forEach(function (r) { usedIds[r.Id] = true; });
    var usedParts = {};
    Object.keys(out.files).forEach(function (n) { usedParts[n] = true; });
    usedParts[basePart] = true;

    var relSeq = 0, partSeq = 0;
    function newRelId() { var id; do { id = 'rIdM' + (++relSeq); } while (usedIds[id]); usedIds[id] = true; return id; }
    function uniquePart(dir, name) {
      var p = dir + '/' + name;
      while (usedParts[p]) p = dir + '/m' + (++partSeq) + '_' + name;
      usedParts[p] = true;
      return p;
    }

    // recursively copy a part (and its own rels) from a source package
    async function copyPart(srcZip, srcCt, srcPath, copied) {
      if (copied[srcPath]) return copied[srcPath];
      var file = srcZip.file(srcPath);
      if (!file) return null;
      var newPath = uniquePart(dirname(srcPath) || 'word', basename(srcPath));
      copied[srcPath] = newPath;
      out.file(newPath, await file.async('uint8array'), { createFolders: false });
      var t = srcCt.typeOf(srcPath), e = extOf(newPath);
      if (srcCt.overrides[normPath(srcPath)]) ct.overrides[newPath] = t;
      else if (!ct.defaults[e]) ct.defaults[e] = t || EXT_TYPES[e] || 'application/octet-stream';
      var subRelsXml = await readText(srcZip, relsPathFor(srcPath));
      if (subRelsXml) {
        var subRels = parseRels(subRelsXml);
        for (var k = 0; k < subRels.length; k++) {
          var r = subRels[k];
          if (r.TargetMode === 'External') continue;
          var target = await copyPart(srcZip, srcCt, resolveTarget(srcPath, r.Target), copied);
          if (target) r.Target = relativeTo(newPath, target);
        }
        out.file(relsPathFor(newPath), relsXml(subRels), { createFolders: false });
      }
      return newPath;
    }

    // root element: union of namespace declarations
    var rootTagRe = /<w:document\b[^>]*>/;
    var nsDecl = {}, ignorable = {};
    function collectRoot(xml) {
      var tag = (rootTagRe.exec(xml) || [''])[0], a = parseAttrs(tag), k;
      for (k in a) {
        if (k.indexOf('xmlns') === 0 && !(k in nsDecl)) nsDecl[k] = a[k];
        if (/:Ignorable$/.test(k)) a[k].split(/\s+/).forEach(function (p) { if (p) ignorable[p] = true; });
      }
    }

    var parts = [], seen = {}, used = [], skipped = [], finalSect = null;
    for (i = 0; i < zips.length; i++) {
      var z = zips[i];
      var part = i === 0 ? basePart : await mainDocPath(z);
      var xml = i === 0 ? baseXml : await readText(z, part);
      if (!xml) { skipped.push({ index: i, reason: 'document.xml missing' }); continue; }
      var bm = /<w:body>([\s\S]*)<\/w:body>/.exec(xml);
      if (!bm) { skipped.push({ index: i, reason: 'no body' }); continue; }
      var taken = takeBodySectPr(bm[1]);
      var body = taken.body;
      if (dedupe) {
        var key = body.replace(/\s(w14:paraId|w14:textId|w:rsid\w*)="[^"]*"/g, '');
        if (seen[key]) { skipped.push({ index: i, reason: 'duplicate', sameAs: seen[key] - 1 }); continue; }
        seen[key] = i + 1;
      }
      collectRoot(xml);
      if (!finalSect && taken.sectPr) finalSect = taken.sectPr;

      if (i > 0) {
        // remap relationship ids used in the body
        var srcCt = new ContentTypes(await readText(z, '[Content_Types].xml') || '');
        var srcRels = parseRels(await readText(z, relsPathFor(part)));
        var relById = {};
        srcRels.forEach(function (r) { relById[r.Id] = r; });
        var rp = relPrefixFromRoot((rootTagRe.exec(xml) || [''])[0]);
        var attrRe = new RegExp('(\\s' + rp + ':(?:id|embed|link|pict|dm|lo|qs|cs|href))="([^"]+)"', 'g');
        var ids = {}, mm;
        while ((mm = attrRe.exec(body))) ids[mm[2]] = true;
        var map = {}, copied = {};
        for (var id in ids) {
          var rel = relById[id];
          if (!rel) continue;
          var nid = newRelId();
          if (rel.TargetMode === 'External') {
            outRels.push({ Id: nid, Type: rel.Type, Target: rel.Target, TargetMode: 'External' });
          } else {
            var newPath = await copyPart(z, srcCt, resolveTarget(part, rel.Target), copied);
            if (!newPath) continue;
            outRels.push({ Id: nid, Type: rel.Type, Target: relativeTo(basePart, newPath) });
          }
          map[id] = nid;
        }
        body = body.replace(attrRe, function (all, attr, val) { return map[val] ? attr + '="' + map[val] + '"' : all; });
      }
      // keep bookmark ids unique between files
      body = body.replace(/(<w:bookmark(?:Start|End)\b[^>]*\sw:id=")(\d+)"/g, function (a, pre, num) {
        return pre + (Number(num) + i * 100000) + '"';
      });
      parts.push(fixStructure(body));
      used.push(i);
    }
    if (!parts.length) throw new Error('Nothing to merge');

    // renumber drawing ids (wp:docPr id) so they are unique
    var docPrId = 1;
    var joined = parts.join(GAP).replace(/(<wp:docPr\b[^>]*\sid=")(\d+)"/g, function (a, pre) { return pre + (docPrId++) + '"'; });
    // paraId / textId must be unique: drop them (optional attributes)
    joined = joined.replace(/\s(w14:paraId|w14:textId)="[^"]*"/g, '');

    var header = '';
    var lines = (options.headerLines || []).filter(function (s) { return s && String(s).trim(); });
    if (lines.length) header = lines.map(headerParagraph).join('') + headerParagraph('');

    if (!nsDecl['xmlns:w']) nsDecl['xmlns:w'] = W_NS;
    var rootTag = '<w:document';
    for (var nk in nsDecl) rootTag += ' ' + nk + '="' + escXml(nsDecl[nk]) + '"';
    var mcPrefix = null;
    for (nk in nsDecl) if (nsDecl[nk] === 'http://schemas.openxmlformats.org/markup-compatibility/2006') mcPrefix = nk.slice(6);
    if (mcPrefix) {
      var ign = Object.keys(ignorable).filter(function (p) { return ('xmlns:' + p) in nsDecl; });
      if (ign.length) rootTag += ' ' + mcPrefix + ':Ignorable="' + ign.join(' ') + '"';
    }
    rootTag += '>';

    var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + rootTag + '<w:body>' +
      header + joined + GAP + (finalSect || '') + '</w:body></w:document>';

    out.file(basePart, docXml, { createFolders: false });
    out.file(baseRelsPath, relsXml(outRels), { createFolders: false });
    ct.overrides[basePart] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
    out.file('[Content_Types].xml', ct.toXml(), { createFolders: false });

    var type = options.outputType || (typeof Blob !== 'undefined' ? 'blob' : 'nodebuffer');
    var data = await out.generateAsync({
      type: type, compression: 'DEFLATE',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    return { data: data, used: used, skipped: skipped };
  }

  var api = { mergeDocx: mergeDocx, _fixStructure: fixStructure, _takeBodySectPr: takeBodySectPr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UmsMerger = api;
})(typeof window !== 'undefined' ? window : globalThis);
