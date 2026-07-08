const fs = require('fs');
let content = fs.readFileSync('backend/src/server.ts', 'utf8');

const targetString = "  if (!hostelId) {\n    return res.status(400).send('<h2 style=\"font-family:sans-serif;color:#7f1d1d;\">Missing hostelId</h2>');\n  }";

const replacementString = `  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>');
  }
  const numHostelId = parseInt(hostelId, 10);
  const hostel = await db('hostel_master').where('hostel_id', numHostelId).first();
  const hostelName = hostel ? hostel.hostel_name : 'Tenant Registration';`;

// Let's find it exactly!
const idx = content.indexOf('return res.status(400).send(\'<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>\');');
if (idx !== -1) {
    const endIdx = content.indexOf('}', idx) + 1;
    content = content.substring(0, endIdx) + "\n  const numHostelId = parseInt(hostelId, 10);\n  const hostel = await db('hostel_master').where('hostel_id', numHostelId).first();\n  const hostelName = hostel ? hostel.hostel_name : 'Tenant Registration';" + content.substring(endIdx);
    fs.writeFileSync('backend/src/server.ts', content);
    console.log("Successfully fixed hostelName");
} else {
    console.log("Failed to find index");
}
