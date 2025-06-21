const fs = require("fs");
const path = require("path");

// --- Configuration ---
const OUTPUT_FILENAME = "combined_content.txt";
const TEXT_EXTENSIONS = new Set([
  // Plain Text & Data
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".ini",
  ".log",
  ".rtf",
  ".srt",
  // Code Files
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".go",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".kts",
  ".sh",
  ".bash",
  ".ps1",
  ".sql",
  ".pl",
  ".lua",
  ".r",
  ".dart",
  ".gd",
  ".env",
  ".config",
  ".conf",
  ".gitignore",
  ".gitattributes",
  // Add any other extensions you consider text-based
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "target",
  "__pycache__",
  "venv",
  ".env",
  "docs", // Common build/cache/env dirs
  // Add any other directories you want to ignore
]);

const IGNORE_FILES = new Set([
  "package-lock.json",
  "yarn.lock", // Large lock files
  ".DS_Store",
  "Thumbs.db", // OS-specific files
  // Add any specific files you want to ignore by name
]);

const MAX_FILE_SIZE_MB = 10; // Max file size in MB to process (prevents hanging on huge files)
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

let combinedContent = "";
let filesProcessed = 0;
let filesSkipped = 0;

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function processFile(filePath) {
  const absoluteFilePath = path.resolve(filePath);
  const filename = path.basename(filePath);

  if (IGNORE_FILES.has(filename)) {
    console.log(`Skipping ignored file: ${absoluteFilePath}`);
    filesSkipped++;
    return;
  }

  if (!isTextFile(absoluteFilePath)) {
    console.log(`Skipping non-text/code file (extension): ${absoluteFilePath}`);
    filesSkipped++;
    return;
  }

  try {
    const stats = fs.statSync(absoluteFilePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      console.log(
        `Skipping large file (${(stats.size / 1024 / 1024).toFixed(
          2
        )}MB): ${absoluteFilePath}`
      );
      filesSkipped++;
      return;
    }

    const content = fs.readFileSync(absoluteFilePath, "utf8");

    // Basic check for binary content (looks for many null bytes - heuristic)
    let nullBytes = 0;
    for (let i = 0; i < Math.min(content.length, 1024); i++) {
      if (content.charCodeAt(i) === 0) {
        nullBytes++;
      }
    }
    if (nullBytes > 5) {
      // Arbitrary threshold
      console.log(
        `Skipping likely binary file (content check): ${absoluteFilePath}`
      );
      filesSkipped++;
      return;
    }

    combinedContent += `filepath: ${absoluteFilePath}\n`;
    combinedContent += `filename: ${filename}\n\n`;
    combinedContent += `content:${content}\n\n`; // Added colon after content
    combinedContent += `break\n\n`; // Added extra newline for readability between entries

    filesProcessed++;
    console.log(`Processed: ${absoluteFilePath}`);
  } catch (error) {
    console.error(`Error reading file ${absoluteFilePath}: ${error.message}`);
    filesSkipped++;
  }
}

function traverseDirectory(dirPath) {
  const absoluteDirPath = path.resolve(dirPath);
  const dirName = path.basename(absoluteDirPath);

  if (IGNORE_DIRS.has(dirName)) {
    console.log(`Skipping ignored directory: ${absoluteDirPath}`);
    return;
  }

  console.log(`Traversing directory: ${absoluteDirPath}`);

  try {
    const items = fs.readdirSync(absoluteDirPath);
    for (const item of items) {
      const itemPath = path.join(absoluteDirPath, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          traverseDirectory(itemPath);
        } else if (stat.isFile()) {
          processFile(itemPath);
        }
      } catch (statError) {
        console.error(`Error stating item ${itemPath}: ${statError.message}`);
        filesSkipped++;
      }
    }
  } catch (readDirError) {
    console.error(
      `Error reading directory ${absoluteDirPath}: ${readDirError.message}`
    );
  }
}

function main() {
  // const inputPaths = process.argv.slice(2);
  const inputPaths = ["/home/project/supabase"];
  if (inputPaths.length === 0) {
    console.log(
      "Usage: node combine_text_files.js <path1> <path2> ... <fileN>"
    );
    console.log("Paths can be to files or directories.");
    return;
  }

  inputPaths.forEach((inputPath) => {
    try {
      if (!fs.existsSync(inputPath)) {
        console.warn(`Path does not exist: ${inputPath}. Skipping.`);
        return;
      }
      const stat = fs.statSync(inputPath);
      if (stat.isDirectory()) {
        traverseDirectory(inputPath);
      } else if (stat.isFile()) {
        processFile(inputPath);
      } else {
        console.warn(
          `Path is not a file or directory: ${inputPath}. Skipping.`
        );
      }
    } catch (error) {
      console.error(
        `Error processing input path ${inputPath}: ${error.message}`
      );
    }
  });

  if (combinedContent) {
    try {
      fs.writeFileSync(OUTPUT_FILENAME, combinedContent.trim(), "utf8");
      console.log(`\nSuccessfully combined content into ${OUTPUT_FILENAME}`);
      console.log(`Files processed: ${filesProcessed}`);
      console.log(`Files skipped: ${filesSkipped}`);
    } catch (error) {
      console.error(
        `Error writing to output file ${OUTPUT_FILENAME}: ${error.message}`
      );
    }
  } else {
    console.log("\nNo text files found or processed.");
  }
}

main();
