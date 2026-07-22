const t = require('./tenant-mobile/package.json').dependencies;
const m = require('./mobile/package.json').dependencies;
const missing = Object.keys(t).filter(k => !m[k]).map(k => k + '@' + t[k]);
console.log(missing.join(' '));
