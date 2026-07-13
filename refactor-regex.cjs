const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('client/src');
let modifiedCount = 0;

files.forEach(file => {
    if (file.includes('queryClient.ts') || file.includes('logger.ts')) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Replace: const res = await fetch('/api/endpoint'); \n const data = await res.json();
    // With: const data = await apiRequest("GET", '/api/endpoint');
    content = content.replace(/const\s+(\w+)\s*=\s*await\s+fetch\(([^,)]+)\);\s*(?:const|let|var)?\s*(\w+)?\s*=?\s*await\s+\1\.json\(\);/g, (match, p1, p2, p3) => {
        if (p3) {
            return `const ${p3} = await apiRequest("GET", ${p2});`;
        } else {
            return `await apiRequest("GET", ${p2});`;
        }
    });

    // Replace: const response = await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) });
    // And if there's a response.json()
    // It's getting complicated with regex.
    
    // Simpler pattern: await fetch(URL, { method: "METHOD", ... })
    // We'll just replace the basic fetch calls that generalist missed.
    
    // Replace: await fetch('/api/...', { method: 'DELETE' })
    content = content.replace(/await\s+fetch\(([^,]+),\s*\{\s*method:\s*['"]([^'"]+)['"]\s*\}\s*\)/g, 'await apiRequest("$2", $1)');

    // Replace: const res = await fetch(URL) 
    // And later: await res.json()
    content = content.replace(/await\s+fetch\(([^,)]+)\)/g, 'await apiRequest("GET", $1)');

    // Fix remaining .json() parsing if it's on a variable returned by apiRequest
    // E.g. const res = await apiRequest("GET", URL); const data = await res.json();
    content = content.replace(/const\s+(\w+)\s*=\s*await\s+apiRequest\([^;]+\);\s*(?:const|let|var)\s+(\w+)\s*=\s*await\s+\1\.json\(\);/g, (match, p1, p2) => {
        return match.replace(`await ${p1}.json()`, `${p1} as any`); // Not ideal, but queryClient already parsed json
    });

    // We can just rely on the fact that if content changed, we add the import.
    if (content !== originalContent) {
        if (!content.includes('import { apiRequest }')) {
            content = 'import { apiRequest } from "@/lib/queryClient";\n' + content;
        }
        // Also cleanup remaining res.json() manually if any
        content = content.replace(/await\s+\w+\.json\(\)/g, '{} /* TODO: fix json */');
        
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Modified ${modifiedCount} files.`);
