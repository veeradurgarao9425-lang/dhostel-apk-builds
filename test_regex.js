const fs = require('fs');
const html = fs.readFileSync('public_signup.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (match) {
  try {
    new Function(match[1]);
    console.log('Valid JS');
  } catch (e) {
    console.error('JS Syntax Error:', e);
  }
}