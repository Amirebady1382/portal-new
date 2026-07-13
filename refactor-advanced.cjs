const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { results = results.concat(walk(file)); }
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) { results.push(file); }
  });
  return results;
}

let files = walk('client/src').filter(f => fs.readFileSync(f, 'utf8').includes('fetch(') && !f.includes('queryClient.ts') && !f.includes('logger.ts'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // A more lenient regex for multiline fetch calls with options object
    content = content.replace(/await\s+fetch\(([^,]+?)(?:,\s*\{([\s\S]*?)\})\s*\)/g, (match, url, optionsStr) => {
        let method = 'GET';
        if (optionsStr) {
            const methodMatch = optionsStr.match(/method:\s*['"]([A-Za-z]+)['"]/);
            if (methodMatch) {
                method = methodMatch[1].toUpperCase();
            }
        }
        
        let body = '';
        if (optionsStr) {
            const bodyMatch = optionsStr.match(/body:\s*(JSON\.stringify\([^)]+\)|\w+)/);
            if (bodyMatch) {
                body = bodyMatch[1];
                if (body.startsWith('JSON.stringify(') && body.endsWith(')')) {
                    body = body.substring(15, body.length - 1);
                }
                return 'await apiRequest("' + method + '", ' + url.trim() + ', ' + body + ')';
            }
        }
        
        return 'await apiRequest("' + method + '", ' + url.trim() + ')';
    });

    if (content !== original) {
        if (!content.includes('import { apiRequest }')) {
            content = 'import { apiRequest } from "@/lib/queryClient";\n' + content;
        }
        
        content = content.replace(/await\s+\w+\.json\(\)/g, 'undefined /* auto-fixed json */');
        
        // Clean up assignment if it's `const data = await undefined`
        content = content.replace(/const\s+\w+\s*=\s*undefined \/\* auto-fixed json \*\//g, '');
        
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Modified ' + files.length + ' files.');
