const fs = require('fs');
const content = fs.readFileSync('backend/src/server.ts', 'utf8');
const match = content.match(/const html = `([\s\S]*?)`;/);
if (match) {
  // Use Function to evaluate the template literal with backticks to get the actual output
  const evaluatedHtml = new Function('roomId', 'bedName', 'postUrl', 'roomBanner', 'return `' + match[1] + '`;')('101', 'Bed 1', '/api/public/qr-signup?hostelId=1', 'Banner');
  fs.writeFileSync('evaluated_signup.html', evaluatedHtml);
  console.log('Saved to evaluated_signup.html');
} else {
  console.log('Not found');
}
