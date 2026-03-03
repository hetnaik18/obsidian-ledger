const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'agents', 'SageAgent.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== SAGEAGENT FILE (first 4000 chars) ===');
console.log(content.substring(0, 4000));
console.log('\n=== END OF PREVIEW ===');
