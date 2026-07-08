const fs = require('fs');
const content = fs.readFileSync('backend/src/server.ts', 'utf8');
const match = content.match(/const html = `([\s\S]*?)`;/);
if (match) {
  fs.writeFileSync('public_signup.html', match[1]);
  console.log('Saved to public_signup.html');
} else {
  console.log('Not found');
}
