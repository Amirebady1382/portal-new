import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    for (const call of fetchCalls) {
        const args = call.getArguments();
        if (args.length > 0) {
            const urlNode = args[0];
            let urlText = urlNode.getText();
            
            // Skip .blob() or similar manual logic by checking if it's in a specific pattern?
            // Actually, we'll just check if the URL has '/api/'.
            if (urlText.includes('/api/')) {
                 // Check if it's a download. E.g. URL includes 'download'
                 if (urlText.includes('download')) {
                     console.log('Skipping download endpoint:', urlText);
                     continue;
                 }
                 
                 // If the expression has await and .json(), etc.
                 // ts-morph is powerful but complicated for full refactoring without deep logic.
                 console.log('Would replace fetch to:', urlText);
            }
        }
    }
}
