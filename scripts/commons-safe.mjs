
import fs from 'node:fs';
const UA = 'CS2Dynasty/1.0 (offline game; CC-licensed images only)';
const dir = 'src/assets/avatars';
const creditsPath = dir + '/credits.json';
const credits = JSON.parse(fs.readFileSync(creditsPath, 'utf8'));
const missing = JSON.parse(fs.readFileSync('.tmp/missing.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sig = (b) => (b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b[0] === 0x89 && b[1] === 0x50 ? 'png' : b.slice(0, 4).toString() === 'RIFF' ? 'webp' : null);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function commons(search) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search', gsrsearch: search, gsrnamespace: '6', gsrlimit: '6',
    prop: 'imageinfo|categories', iiprop: 'url|extmetadata', iiurlwidth: '240', cllimit: '20',
  });
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { await sleep(4000 + i * 4000); continue; }
    if (res.status !== 200) return [];
    const j = await res.json();
    const pages = j?.query?.pages ? Object.values(j.query.pages) : [];
    return pages.map((p) => ({
      title: p.title,
      thumb: p.imageinfo?.[0]?.thumburl,
      license: p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value,
      cats: (p.categories ?? []).map((c) => c.title).join(' ').toLowerCase(),
    })).filter((p) => p.thumb && /\.(jpe?g|png|webp)$/i.test(p.title));
  }
  return [];
}

const isCC = (lic) => !lic || /cc|public domain|pd|attribution/i.test(lic);
let added = 0;
for (const p of missing) {
  const terms = [p.nickname + ' Counter-Strike', p.realName + ' Counter-Strike'];
  let hit = null;
  for (const term of terms) {
    const hits = await commons(term);
    hit = hits.find((h) => {
      const t = norm(h.title);
      return isCC(h.license) && (/counter|esport|major|iem/.test(h.cats) || t.includes(norm(p.nickname)) || t.includes(norm(p.realName)));
    });
    if (hit) break;
    await sleep(1200);
  }
  if (hit) {
    try {
      const img = await fetch(hit.thumb, { headers: { 'User-Agent': UA } });
      if (img.status === 200) {
        const buf = Buffer.from(await img.arrayBuffer());
        const ext = sig(buf);
        if (ext && buf.length > 2000) {
          fs.writeFileSync(dir + '/' + p.id + '.' + ext, buf);
          credits[p.id] = { file: p.id + '.' + ext, source: 'Wikimedia Commons', note: hit.title.replace('File:', '') };
          added += 1;
          console.log('saved', p.id, '|', hit.license ?? 'license?');
        }
      }
    } catch { /* skip */ }
  }
  await sleep(1100);
  fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2));
}
console.log('DONE added', added, '| photos now', fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).length);
