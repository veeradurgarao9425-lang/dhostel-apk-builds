const fs = require('fs');
const serverPath = 'backend/src/server.ts';
const evalPath = 'evaluated_signup.html';

let serverCode = fs.readFileSync(serverPath, 'utf8');
let evalHtml = fs.readFileSync(evalPath, 'utf8');

// The dynamic parts in evaluated_signup.html that need to be changed:
evalHtml = evalHtml.replace('      Banner\r\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner', '      ${roomBanner}');

evalHtml = evalHtml.replace('/api/public/qr-signup?hostelId=1', '${postUrl}');
evalHtml = evalHtml.replace('<title>Tenant Registration</title>', '<title>${hostelName}</title>');

const startStr = 'const html = `';
const startIdx = serverCode.indexOf(startStr);
const endIdx = serverCode.indexOf('`;\n\n  res.setHeader(\'Content-Type\'');
const endIdx2 = serverCode.indexOf('`;\r\n\r\n  res.setHeader(\'Content-Type\'');

let finalEndIdx = endIdx !== -1 ? endIdx : endIdx2;

if (startIdx === -1 || finalEndIdx === -1) {
  console.log('Could not find html block. Start: ' + startIdx + ' End: ' + finalEndIdx);
  process.exit(1);
}

const oldJs = `    // Digits only
    ['phone','gphone','aadhaar'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.addEventListener('input',function(){ this.value=this.value.replace(/[^0-9]/g,''); });
    });`;
const newJs = `    // Digits only and real-time validation
    ['phone','gphone','aadhaar'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.addEventListener('input',function(){
        var val = this.value.replace(/[^0-9]/g,'');
        this.value = val;
        if (id === 'phone' || id === 'gphone') {
          if (val.length === 10) {
            if (!/^[6-9]\\d{9}$/.test(val)) {
              setErr(id === 'phone' ? 'e2' : 'e5', id, 'Must start with 6, 7, 8, or 9');
            } else {
              setErr(id === 'phone' ? 'e2' : 'e5', id, '');
            }
          } else {
            if (val.length > 0 && /^[1-5]/.test(val)) {
              setErr(id === 'phone' ? 'e2' : 'e5', id, 'Must start with 6, 7, 8, or 9');
            } else {
              setErr(id === 'phone' ? 'e2' : 'e5', id, '');
            }
          }
        }
      });
    });`;

evalHtml = evalHtml.replace(oldJs, newJs);

// Remove <!DOCTYPE html> because it is part of startStr if we kept it, but startStr here is just const html = `
// Actually in serverCode, it's const html = `<!DOCTYPE html>\n<html...
// Let's just replace from startIdx to finalEndIdx.
const newServerCode = serverCode.substring(0, startIdx) + 'const html = `' + evalHtml + serverCode.substring(finalEndIdx);

fs.writeFileSync(serverPath, newServerCode);
console.log('Successfully replaced HTML in server.ts');
