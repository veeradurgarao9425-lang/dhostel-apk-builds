const fs = require('fs');
let content = fs.readFileSync('backend/src/server.ts', 'utf8');

// 1. Make the handler async
content = content.replace("app.get('/api/public/qr-signup', (req, res) => {", "app.get('/api/public/qr-signup', async (req, res) => {");

// 2. Fetch hostel name from db - use indexOf to be perfectly exact
const targetString = "  if (!hostelId) {\n    return res.status(400).send('<h2 style=\"font-family:sans-serif;color:#7f1d1d;\">Missing hostelId</h2>');\n  }";
const replacementString = `  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>');
  }
  const numHostelId = parseInt(hostelId, 10);
  const hostel = await db('hostel_master').where('hostel_id', numHostelId).first();
  const hostelName = hostel ? hostel.hostel_name : 'Tenant Registration';`;

content = content.replace(targetString, replacementString);

// 3. Update the logo and title in HTML
const oldHeader = `<div style="text-align:center;margin-bottom:16px;"><div class="logo"><i data-lucide="user-plus"></i></div></div>
    <h1>Tenant Registration</h1>`;
const newHeader = `<div style="text-align:center;margin-bottom:16px;"><div class="logo"><i data-lucide="building-2"></i></div></div>
    <h1>\${hostelName}</h1>`;
content = content.replace(oldHeader, newHeader);

// 4. Update the title tag
content = content.replace(`<title>Tenant Registration</title>`, `<title>\${hostelName}</title>`);

fs.writeFileSync('backend/src/server.ts', content);
console.log("Successfully updated server header");
