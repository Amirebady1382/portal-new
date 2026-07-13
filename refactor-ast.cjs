const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths("client/src/**/*.ts");
project.addSourceFilesAtPaths("client/src/**/*.tsx");

const files = project.getSourceFiles();
let modifiedFiles = [];

files.forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    if (filePath.includes('queryClient.ts') || filePath.includes('logger.ts')) return;

    let modified = false;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    const fetchCalls = callExpressions.filter(c => c.getExpression().getText() === 'fetch').reverse();
    
    fetchCalls.forEach(callExpr => {
        const args = callExpr.getArguments();
        if (args.length === 0) return;

        const urlArg = args[0].getText();
        let method = '"GET"';
        let bodyText = null;

        if (args.length === 2) {
            const optionsArg = args[1];
            if (optionsArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const methodProp = optionsArg.getProperty('method');
                if (methodProp && methodProp.getKind() === SyntaxKind.PropertyAssignment) {
                    method = methodProp.getInitializer().getText();
                    if (!method.startsWith('"') && !method.startsWith("'")) {
                        method = `"${method.toUpperCase()}"`;
                    } else {
                        method = method.toUpperCase();
                    }
                }
                
                const bodyProp = optionsArg.getProperty('body');
                if (bodyProp && bodyProp.getKind() === SyntaxKind.PropertyAssignment) {
                    bodyText = bodyProp.getInitializer().getText();
                    if (bodyText.startsWith('JSON.stringify(') && bodyText.endsWith(')')) {
                        bodyText = bodyText.substring(15, bodyText.length - 1);
                    }
                }
            }
        }

        let newCall = `apiRequest(${method}, ${urlArg}`;
        if (bodyText) {
            newCall += `, ${bodyText}`;
        }
        newCall += `)`;

        callExpr.replaceWithText(newCall);
        modified = true;
    });

    if (modified) {
        let text = sourceFile.getFullText();
        
        // Auto-fix some common `.json()` leftover issues via string replace
        // E.g., const res = await apiRequest(...); const data = await res.json();
        text = text.replace(/(const|let|var)\s+(\w+)\s*=\s*await\s+apiRequest\b[^;]+;\s*(?:const|let|var)?\s*(\w+)?\s*=?\s*await\s+\2\.json\(\);/g, (match, letType, varName, resultVar) => {
            if (resultVar) {
                return match.replace(`await ${varName}.json()`, `${varName} as any`);
            } else {
                return match.replace(`await ${varName}.json()`, `${varName}`);
            }
        });
        
        // Remove standalone `await response.json()` that might be unassigned or assigned later
        text = text.replace(/await\s+\w+\.json\(\)/g, 'undefined /* auto-replaced */');

        if (!text.includes('import { apiRequest }')) {
            text = 'import { apiRequest } from "@/lib/queryClient";\n' + text;
        }

        fs.writeFileSync(filePath, text, 'utf8');
        modifiedFiles.push(filePath);
    }
});

console.log('Modified via AST:', modifiedFiles.length);
