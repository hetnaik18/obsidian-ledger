/**
 * File Parser Service
 * Recursively reads a local directory and extracts file snippets
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ParsedFile {
  path: string;
  name: string;
  extension: string;
  content: string;
  snippet: string;
}

export interface FileParserResult {
  files: ParsedFile[];
  rootPath: string;
  totalFiles: number;
}

/**
 * Recursively read a directory and return file contents
 * @param dirPath - Path to the directory to read
 * @param extensions - Optional array of file extensions to filter (e.g., ['.ts', '.js'])
 * @param maxSnippetLength - Maximum characters to extract from each file (default: 500)
 */
export async function parseDirectory(
  dirPath: string, 
  extensions: string[] = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.md', '.json'],
  maxSnippetLength: number = 500
): Promise<FileParserResult> {
  
  const files: ParsedFile[] = [];

  async function walkDirectory(currentPath: string): Promise<void> {
    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules, .git, and other hidden directories
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build' ||
            entry.name === '__pycache__') {
          continue;
        }
        await walkDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        // Filter by extensions if provided
        if (extensions.length > 0 && !extensions.includes(ext)) {
          continue;
        }

        try {
          // Read file content
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          
          // Create snippet (first N characters)
          const snippet = content.slice(0, maxSnippetLength);

          files.push({
            path: fullPath,
            name: entry.name,
            extension: ext,
            content: content,
            snippet: snippet
          });
        } catch (error) {
          console.warn(`Failed to read file: ${fullPath}`, error);
        }
      }
    }
  }

  // Verify the directory exists
  try {
    await fs.promises.access(dirPath, fs.constants.R_OK);
  } catch {
    throw new Error(`Directory not accessible: ${dirPath}`);
  }

  await walkDirectory(dirPath);

  return {
    files,
    rootPath: dirPath,
    totalFiles: files.length
  };
}

/**
 * Get a summary of the parsed files for debugging/logging
 */
export function getFileSummary(result: FileParserResult): string {
  const extensionCounts: Record<string, number> = {};
  
  for (const file of result.files) {
    extensionCounts[file.extension] = (extensionCounts[file.extension] || 0) + 1;
  }

  return `
Parsed ${result.totalFiles} files from ${result.rootPath}
Breakdown: ${Object.entries(extensionCounts).map(([ext, count]) => `${ext}: ${count}`).join(', ')}
  `.trim();
}
