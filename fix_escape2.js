const fs = require('fs');
let code = fs.readFileSync('backend/src/server.ts', 'utf8');

const startIdx = code.indexOf('<script>');
const endIdx = code.indexOf('</script>');

if(startIdx !== -1 && endIdx !== -1) {
  let scriptBlock = code.substring(startIdx, endIdx);
  scriptBlock = scriptBlock.replace(/\\d/g, '\\\\d');
  scriptBlock = scriptBlock.replace(/\\s/g, '\\\\s');
  scriptBlock = scriptBlock.replace(/\\\./g, '\\\\.');
  
  code = code.substring(0, startIdx) + scriptBlock + code.substring(endIdx);
  fs.writeFileSync('backend/src/server.ts', code);
  console.log('Fixed escaping!');
} else {
  console.log('Could not find script block');
}
