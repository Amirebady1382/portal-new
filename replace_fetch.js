const fs = require('fs');
const path = require('path');

const clientSrcPath = path.join(__dirname, 'client', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk(path.join(clientSrcPath, 'pages')), ...walk(path.join(clientSrcPath, 'components'))];

let modifiedFiles = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Skip if it doesn't contain fetch
    if (!content.match(/fetch\s*\(\s*['"`]\/api\//)) continue;

    // We do NOT want to touch download features returning blobs
    // So if the file has `.blob()` we either skip it or only replace other fetches.
    // In many files there might be both. We will just do a simple AST-like replacement using regex.

    // 1. replace `await fetch(URL)` -> `await apiRequest('GET', URL)`
    content = content.replace(/await\s+fetch\s*\(\s*(['"`]\/api\/[^'"`]+['"`])\s*\)/g, "await apiRequest('GET', $1)");

    // 2. replace `await fetch(URL, { method: 'POST', body: ... })` (basic)
    // Actually, handling {method: 'POST'} correctly with regex is hard because the object can span multiple lines.
    // Let's use specific file replacements for files where it's complex, or I can use a state machine parser.

    // Let's just write a generic replacer for specific blocks using regex
    
    if (content !== originalContent) {
        if (!content.includes('import { apiRequest }')) {
             content = content.replace(/(import .* from ['"].*['"];\n)/, '$1import { apiRequest } from "@/lib/queryClient";\n');
        }
        
        // Remove `.json()` parsing for newly replaced apiRequest
        // e.g., const data = await (await apiRequest(...)).json() or similar.
        // Actually, if `fetch` is replaced by `apiRequest`, `apiRequest` returns data directly.
        // So `const response = await apiRequest(...)` means `response` IS the data.
        // Then `await response.json()` will fail.
        
        // This regex approach is too fragile.
    }
}
console.log("Modified", modifiedFiles, "files");
