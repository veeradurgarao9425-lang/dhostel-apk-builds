const fs = require('fs');
const content = fs.readFileSync('backend/src/server.ts', 'utf-8');
const start = content.indexOf('const html = `') + 14;
const end = content.indexOf('res.status(200).send(html);');
if (start > 13 && end > -1) {
    let html = content.substring(start, end).trim();
    if (html.endsWith('`')) {
        html = html.substring(0, html.length - 1);
    }
    // resolve any template literal escaping
    html = html.replace(/\\\\d/g, '\\d').replace(/\\\\s/g, '\\s');
    fs.writeFileSync('public_signup.html', html);
    console.log('Saved HTML to public_signup.html');
} else {
    console.log('Could not extract HTML');
}
