import fs from 'node:fs';
import pngToIco from 'png-to-ico';
import * as ResEdit from 'resedit';

const SRC = process.argv[2] ?? 'src/assets/brand/icon-light.png';
const EXE = process.argv[3] ?? 'CS2Dynasty.exe';

if (!fs.existsSync(EXE)) {
  console.error('找不到 exe:', EXE, '（先跑一次打包）');
  process.exit(1);
}

const ico = await pngToIco(SRC);
console.log('ico bytes:', ico.length);

const data = fs.readFileSync(EXE);
const exe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);

// 用 ICO 里最大的那张作为主图标
const iconFile = ResEdit.Data.IconFile.from(ico);
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  1,
  1033,
  iconFile.icons.map((i) => i.data),
);

res.outputResource(exe);
fs.writeFileSync(EXE, Buffer.from(exe.generate()));
console.log('icon applied to', EXE);
