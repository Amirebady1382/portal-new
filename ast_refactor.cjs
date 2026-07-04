const fs = require('fs');
const path = require('path');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
project.addSourceFilesAtPaths("client/src/pages/**/*.tsx");
project.addSourceFilesAtPaths("client/src/components/**/*.tsx");

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
    let changed = false;

    // Find all fetch calls
    const fetchCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(call => call.getExpression().getText() === 'fetch');

    if (fetchCalls.length === 0) continue;

    console.log(`Processing: ${sourceFile.getFilePath()}`);

    // We will collect manual string replacements to avoid destroying the AST sequentially
    // actually ts-morph handles sequential updates well if we do it right, but some things are complex.
    // Let's just print the exact text of fetch calls so we can see them.
    for (const call of fetchCalls) {
        const args = call.getArguments();
        if (args.length > 0) {
            const urlNode = args[0];
            const urlText = urlNode.getText();
            if (urlText.includes('/api/')) {
                console.log('Found fetch to:', urlText);
            }
        }
    }
}
