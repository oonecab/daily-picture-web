import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const files=['server.mjs','public/app.js','public/sw.js'];
for(const dir of ['lib','tools'])for(const name of await readdir(dir))if(name.endsWith('.mjs'))files.push(`${dir}/${name}`);
for(const file of files) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.error || result.status!==0)process.exit(1);
}
console.log(`Syntax checked: ${files.length} files`);
