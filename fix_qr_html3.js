const fs = require('fs');

let serverCode = fs.readFileSync('backend/src/server.ts', 'utf8');
let evalHtml = fs.readFileSync('evaluated_signup.html', 'utf8');

// modify evalHtml to use dynamic variables
evalHtml = evalHtml.replace('      Banner\r\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner\n', '      ${roomBanner}\n');
evalHtml = evalHtml.replace('      Banner', '      ${roomBanner}');
evalHtml = evalHtml.replace('/api/public/qr-signup?hostelId=1', '${postUrl}');
evalHtml = evalHtml.replace('<title>Tenant Registration</title>', '<title>Tenant Registration</title>');

// inject real-time validation
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
            if (!/^[6-9]\\\\d{9}$/.test(val)) {
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

// Find the template string boundaries in serverCode
const startMarker = '  const html = `';
const endMarker = '</html>\n`;';
const endMarker2 = '</html>\r\n`;';

const startIdx = serverCode.indexOf(startMarker);
let endIdx = serverCode.indexOf(endMarker);
let length = endMarker.length;
if(endIdx === -1) {
  endIdx = serverCode.indexOf(endMarker2);
  length = endMarker2.length;
}

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find template string boundaries!');
  process.exit(1);
}

// Ensure evalHtml escapes properly for backticks in JS template
evalHtml = evalHtml.replace(/`/g, '\\`');

const finalCode = serverCode.substring(0, startIdx) + startMarker + evalHtml + '`;' + serverCode.substring(endIdx + length);

fs.writeFileSync('backend/src/server.ts', finalCode);
console.log('Successfully replaced HTML in server.ts');
