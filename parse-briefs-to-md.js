// Parse all DOCX briefs to markdown files
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const briefsFolder = path.join(__dirname, 'BRIEF_EMAIL-20260113T191518Z-1-001', 'BRIEF_EMAIL');
const outputFolder = path.join(__dirname, 'tests', 'fixtures', 'briefs');

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

async function parseDocxToMarkdown(docxPath) {
    try {
        const result = await mammoth.convertToHtml({ path: docxPath });
        const html = result.value;
        
        // Convert HTML to Markdown
        let markdown = turndownService.turndown(html);
        
        // Clean up markdown
        markdown = markdown
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        return markdown;
    } catch (error) {
        throw new Error(`Failed to parse ${docxPath}: ${error.message}`);
    }
}

async function main() {
    try {
        // Ensure output directory exists
        await fs.mkdir(outputFolder, { recursive: true });
        
        // Get all BRIEF_PARSED_EMAIL files
        const files = await fs.readdir(briefsFolder);
        const parsedFiles = files.filter(f => f.startsWith('BRIEF_PARSED_EMAIL_') && f.endsWith('.docx'));
        
        console.log(`Found ${parsedFiles.length} briefs to parse:\n`);
        
        for (const file of parsedFiles) {
            const docxPath = path.join(briefsFolder, file);
            const baseName = file.replace('BRIEF_PARSED_EMAIL_', '').replace('.docx', '');
            const mdPath = path.join(outputFolder, `${baseName}.md`);
            
            console.log(`Parsing: ${file}`);
            
            const markdown = await parseDocxToMarkdown(docxPath);
            await fs.writeFile(mdPath, markdown, 'utf-8');
            
            console.log(`  ✓ Saved to: ${path.relative(process.cwd(), mdPath)}`);
            console.log(`  Length: ${markdown.length} characters\n`);
        }
        
        console.log(`\n✅ Successfully parsed ${parsedFiles.length} briefs!`);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
