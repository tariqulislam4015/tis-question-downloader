/*
 * Merger tests — run with:  node tests/merge.test.js
 * No npm install needed (uses the bundled extension/jszip.min.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const JSZip = require('../extension/jszip.min.js');
const { mergeDocx, _fixStructure } = require('../extension/merger.js');

const S = (f) => fs.readFileSync(path.join(__dirname, '..', 'demo', 'samples', f));
const text = (xml) => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('');

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { console.error('  ✖ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; }
}

(async () => {
  console.log('merger.js');

  await test('keeps every source text, in order', async () => {
    const files = ['mcq-101.docx', 'mcq-102.docx', 'mcq-103.docx'].map(S);
    const r = await mergeDocx(files, { JSZip, outputType: 'nodebuffer' });
    const out = await JSZip.loadAsync(r.data);
    const merged = text(await out.file('word/document.xml').async('string'));
    let expected = '';
    for (const f of files) expected += text(await (await JSZip.loadAsync(f)).file('word/document.xml').async('string'));
    assert.strictEqual(merged, expected);
  });

  await test('adds optional header lines at the top', async () => {
    const r = await mergeDocx([S('mcq-101.docx')], { JSZip, outputType: 'nodebuffer', headerLines: ['Line A', 'Line B'] });
    const xml = await (await JSZip.loadAsync(r.data)).file('word/document.xml').async('string');
    assert.ok(text(xml).startsWith('Line ALine B'));
  });

  await test('skips a duplicate file (shared stem) once', async () => {
    const r = await mergeDocx([S('mcq-103.docx'), S('mcq-103.docx')], { JSZip, outputType: 'nodebuffer' });
    assert.deepStrictEqual(r.used, [0]);
    assert.strictEqual(r.skipped[0].reason, 'duplicate');
  });

  await test('copies images from every file and every r:embed resolves', async () => {
    const r = await mergeDocx([S('mcq-103.docx'), S('written-201.docx')], { JSZip, outputType: 'nodebuffer' });
    const z = await JSZip.loadAsync(r.data);
    const xml = await z.file('word/document.xml').async('string');
    const rels = await z.file('word/_rels/document.xml.rels').async('string');
    const ids = new Set([...rels.matchAll(/Id="([^"]+)"/g)].map((m) => m[1]));
    const used = [...xml.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(used.length >= 3, 'expected images');
    used.forEach((id) => assert.ok(ids.has(id), 'missing relationship ' + id));
    const media = Object.keys(z.files).filter((n) => n.startsWith('word/media/'));
    assert.ok(media.length >= 2);
    assert.ok(!Object.keys(z.files).some((n) => n.endsWith('/')), 'no folder entries');
  });

  await test('keeps equations (OMML)', async () => {
    const r = await mergeDocx([S('written-201.docx'), S('written-202.docx')], { JSZip, outputType: 'nodebuffer' });
    const xml = await (await JSZip.loadAsync(r.data)).file('word/document.xml').async('string');
    assert.ok((xml.match(/<m:oMath>/g) || []).length >= 4);
  });

  await test('fixes element order only (tblPr, trPr, math rPr)', () => {
    const src = '<w:tbl><w:tblPr><w:tblW w:w="0"/><w:tblStyle w:val="T"/></w:tblPr><w:tr><w:tc><w:p/></w:tc><w:trPr><w:cantSplit/></w:trPr></w:tr></w:tbl>' +
      '<m:r><w:rPr><w:b/></w:rPr><m:rPr><m:sty m:val="p"/></m:rPr><m:t>x</m:t></m:r><w:pPr /><w:pPr><w:jc w:val="left"/></w:pPr>';
    const out = _fixStructure(src);
    assert.ok(out.includes('<w:tblPr><w:tblStyle w:val="T"/><w:tblW w:w="0"/></w:tblPr>'));
    assert.ok(out.includes('<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc>'));
    assert.ok(out.includes('<m:r><m:rPr><m:sty m:val="p"/></m:rPr><w:rPr><w:b/></w:rPr>'));
    assert.ok(!out.includes('<w:pPr /><w:pPr>'));
  });

  console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
})();
