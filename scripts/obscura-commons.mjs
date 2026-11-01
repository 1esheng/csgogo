
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const OBSCURA = process.env.OBSCURA_BIN ?? '.tools/obscura/obscura.exe';
const dir = 'src/assets/avatars';
const creditsPath = dir + '/credits.json';
const credits = JSON.parse(fs.readFileSync(creditsPath, 'utf8'));
const missing = JSON.parse(fs.readFileSync('.tmp/missing.json', 'utf8'));
const UA = 'CS2Dynasty/1.0 (offline game; CC-licensed images only)';
const sig = (b) => (b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b[0] === 0x89 && b[1] === 0x50 ? 'png' : b.slice(0, 4).toString() === 'RIFF' ? 'webp' : null);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function query(term) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search', gsrsearch: term, gsrnamespace: '6', gsrlimit: '6',
    prop: 'imageinfo|categories', iiprop: 'url|extmetadata', iiurlwidth: '240', cllimit: '20',
  });
  try {
    const out = execFileSync(OBSCURA, ['--stealth', 'fetch', url, '--eval', 'document.body.innerText'], {
      encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024,
    });
    const start = out.indexOf('{');
    if (start < 0) return [];
    const json = JSON.parse(out.slice(start));
    const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
    return pages.map((p) => ({
      title: p.title,
      thumb: p.imageinfo?.[0]?.thumburl,
      license: p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value,
      cats: (p.categories ?? []).map((c) => c.title).join(' ').toLowerCase(),
    })).filter((p) => p.thumb && /\.(jpe?g|png|webp)$/i.test(p.title));
  } catch (e) {
    console.log('query failed', term, String(e).slice(0, 80));
    return [];
  }
}

const isCC = (lic) => !lic || /cc|public domain|attribution/i.test(lic);
let added = 0;
for (const p of missing) {
  let hit = null;
  for (const term of [p.nickname + ' Counter-Strike', p.realName + ' Counter-Strike', p.nickname + ' player']) {
    const hits = query(term);
    hit = hits.find((h) => isCC(h.license) && (/counter|esport|major|iem|cyber/.test(h.cats) || norm(h.title).includes(norm(p.nickname))));
    if (hit) break;
  }
  if (!hit) { console.log('no hit', p.nickname); continue; }
  try {
    const res = await fetch(hit.thumb, { headers: { 'User-Agent': UA } });
    if (res.status === 200) {
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = sig(buf);
      if (ext && buf.length > 2000) {
        fs.writeFileSync(dir + '/' + p.id + '.' + ext, buf);
        credits[p.id] = { file: p.id + '.' + ext, source: 'Wikimedia Commons', note: hit.title.replace('File:', '') };
        added += 1;
        console.log('saved', p.id, '|', hit.license ?? 'license?', '|', hit.title.slice(0, 60));
      }
    }
  } catch { /* skip */ }
  fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2));
}
console.log('DONE added', added, '| coverage', fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).length);
