const fs = require('fs');
const path = require('path');

function stripPng(filePath) {
    console.log(`Processing: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    
    // Check PNG signature
    if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
        console.error('Not a valid PNG file');
        return;
    }
    
    const outputChunks = [];
    // Keep signature
    outputChunks.push(buffer.subarray(0, 8));
    
    let offset = 8;
    while (offset < buffer.length) {
        if (offset + 8 > buffer.length) break;
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        
        // Critical chunks we MUST keep for the image to display:
        // IHDR (Header), PLTE (Palette), IDAT (Image Data), IEND (End)
        // We strip iCCP, tEXt, zTXt, iTXt, pHYs, gAMA, tIME, etc.
        const keep = ['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type);
        
        const chunkTotalLength = 12 + length;
        if (offset + chunkTotalLength > buffer.length) {
            console.error(`Malformed chunk ${type} at offset ${offset}`);
            break;
        }
        
        if (keep) {
            outputChunks.push(buffer.subarray(offset, offset + chunkTotalLength));
        } else {
            console.log(`Stripped chunk: ${type} (${length} bytes)`);
        }
        
        offset += chunkTotalLength;
        if (type === 'IEND') break;
    }
    
    const finalBuffer = Buffer.concat(outputChunks);
    fs.writeFileSync(filePath, finalBuffer);
    console.log(`Saved clean PNG: ${filePath} (Size reduced from ${buffer.length} to ${finalBuffer.length} bytes)\n`);
}

const files = [
    path.join(__dirname, '../assets/growth/cooking_disaster.png'),
    path.join(__dirname, '../assets/growth/missed_bus.png'),
    path.join(__dirname, '../assets/growth/general_cover.png'),
    path.join(__dirname, '../assets/tenant_3d.png'),
];

files.forEach(f => {
    try {
        stripPng(f);
    } catch (err) {
        console.error(`Error processing ${f}:`, err);
    }
});
