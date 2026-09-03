const fs = require('fs');
const vm = require('vm');

function checkFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0, ok = 0, fail = 0;
  while ((m = re.exec(src)) !== null) {
    i++;
    const attrs = m[1];
    const code = m[2];
    const isModule = /type\s*=\s*["']module["']/i.test(attrs);
    try {
      if (isModule) {
        const mod = new vm.SourceTextModule(code, { identifier: file + '#module' + i });
        mod;
      } else {
        new vm.Script(code, { filename: file + '#script' + i });
      }
      ok++;
    } catch (e) {
      fail++;
      console.log('FAIL script#' + i + (isModule ? ' (module)' : '') + ' in ' + file + ': ' + e.message);
    }
  }
  console.log(file + ': ' + i + ' script blocks, ' + ok + ' OK, ' + fail + ' failed');
  return fail;
}

let fails = 0;
const files = process.argv.slice(2);
if (!files.length) files.push('admin.html');
for (const f of files) fails += checkFile(f);
process.exit(fails ? 1 : 0);
