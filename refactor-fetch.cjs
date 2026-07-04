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

    // Find all CallExpressions to 'fetch'
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    callExpressions.forEach(callExpr => {
        const expression = callExpr.getExpression();
        if (expression.getText() === 'fetch') {
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
                        // ensure it's a string, if it's already a string, keep it, else quote it if it's not
                        if (!method.startsWith('"') && !method.startsWith("'")) {
                            method = `"${method.toUpperCase()}"`;
                        }
                    }
                    
                    const bodyProp = optionsArg.getProperty('body');
                    if (bodyProp && bodyProp.getKind() === SyntaxKind.PropertyAssignment) {
                        bodyText = bodyProp.getInitializer().getText();
                        // If it's JSON.stringify(X), just pass X
                        if (bodyText.startsWith('JSON.stringify(') && bodyText.endsWith(')')) {
                            bodyText = bodyText.substring(15, bodyText.length - 1);
                        }
                    }
                }
            }

            // Construct new apiRequest call
            let newCall = `apiRequest(${method.toUpperCase()}, ${urlArg}`;
            if (bodyText) {
                newCall += `, ${bodyText}`;
            }
            newCall += `)`;

            // Replace fetch(...) with apiRequest(...)
            callExpr.replaceWithText(newCall);
            modified = true;
        }
    });

    if (modified) {
        // Find variable declarations like `const res = await apiRequest(...)`
        // and see if the next statement is `await res.json()`
        const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
        varDecls.forEach(varDecl => {
            const initializer = varDecl.getInitializer();
            if (initializer && initializer.getText().includes('apiRequest')) {
                const varName = varDecl.getName();
                // look for `await varName.json()` in the same block
                const block = varDecl.getFirstAncestorByKind(SyntaxKind.Block);
                if (block) {
                    const awaitExprs = block.getDescendantsOfKind(SyntaxKind.AwaitExpression);
                    awaitExprs.forEach(awaitExpr => {
                        const expr = awaitExpr.getExpression();
                        if (expr.getKind() === SyntaxKind.CallExpression && expr.getText() === `${varName}.json()`) {
                            // Replace `await varName.json()` with `varName`
                            awaitExpr.replaceWithText(`${varName} as any`);
                        }
                    });
                }
            }
        });

        // Add import
        const hasImport = sourceFile.getImportDeclarations().some(imp => importClauseIncludes(imp, 'apiRequest'));
        if (!hasImport) {
            sourceFile.addImportDeclaration({
                namedImports: ['apiRequest'],
                moduleSpecifier: '@/lib/queryClient'
            });
        }
        
        sourceFile.saveSync();
        modifiedFiles.push(filePath);
    }
});

function importClauseIncludes(importDecl, name) {
    const namedBindings = importDecl.getImportClause()?.getNamedBindings();
    if (namedBindings && namedBindings.getKind() === SyntaxKind.NamedImports) {
        return namedBindings.getElements().some(el => el.getName() === name);
    }
    return false;
}

console.log(modifiedFiles.join('\n'));
