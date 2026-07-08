const fs = require('fs');
const serverPath = 'backend/src/server.ts';
const evalPath = 'evaluated_signup.html';

let serverCode = fs.readFileSync(serverPath, 'utf8');
let evalHtml = fs.readFileSync(evalPath, 'utf8');

// The dynamic parts in evaluated_signup.html that need to be changed:
// 1. "Banner" -> "${roomBanner}"
evalHtml = evalHtml.replace('      Banner\r\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner', '      ${roomBanner}');

// 2. "/api/public/qr-signup?hostelId=1" -> "${postUrl}"
evalHtml = evalHtml.replace('/api/public/qr-signup?hostelId=1', '${postUrl}');

// 3. "Tenant Registration" -> "${hostelName}" in <title>
evalHtml = evalHtml.replace('<title>Tenant Registration</title>', '<title>${hostelName}</title>');

// Extract the old html string from server.ts
const startIdx = serverCode.indexOf('const html = `<!DOCTYPE html>');
const endIdx = serverCode.indexOf('`;\n\n  res.setHeader(\'Content-Type\'');

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find html block in server.ts');
  process.exit(1);
}

// Ensure the real-time validation for phone is applied to evalHtml
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

// Replace
const newServerCode = serverCode.substring(0, startIdx) + 'const html = `' + evalHtml + serverCode.substring(endIdx);

fs.writeFileSync(serverPath, newServerCode);
console.log('Successfully replaced HTML in server.ts');
