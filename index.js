#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { askFormat, askOutputDir, askRecursive, askQuality, askWidth } from './lib/prompts.js';
import { convertImages } from './lib/converter.js';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import {glob} from 'glob';

// Show welcome message
console.log(chalk.green('Welcome to CMG: a modern CLI tool for image conversion and optimization.'));

// Platform-specific configurations
const isWindows = process.platform === 'win32';

// Default output folder based on platform
const DEFAULT_OUTPUT = isWindows 
    ? path.join('C:', 'CMGOutput')
    : path.join(os.homedir(), 'CMGOutput');

// Protected folders configuration (Windows only)
const protectedFolders = isWindows ? [
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Pictures', 'Screenshots'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop')
] : [];

// Suggested safe folders in order of preference
const safeFolders = [
    DEFAULT_OUTPUT,
    path.join(os.homedir(), 'CMGOutput'),
    path.join(process.cwd(), 'converted')
];

function isProtectedPath(p) {
    if (!isWindows) return false;
    const normalized = path.resolve(p).toLowerCase();
    return protectedFolders.some(folder => normalized.startsWith(folder.toLowerCase()));
}

function getSafeFolderSuggestion() {
    return safeFolders.find(folder => !isProtectedPath(folder)) || DEFAULT_OUTPUT;
}

// Check if we're in a terminal
if (!process.stdout.isTTY) {
    console.error(chalk.red('Error: This program must be run in a terminal.'));
    process.exit(1);
}

// Check if Windows Controlled Folder Access is active
async function checkControlledFolderAccess() {
    if (!isWindows) return false;

    return new Promise((resolve) => {
        exec('powershell -Command "Get-MpPreference | Select-Object -ExpandProperty EnableControlledFolderAccess"', 
        (error, stdout, stderr) => {
            const isEnabled = !error && stdout.trim() === '1';
            if (isEnabled) {
                console.log(chalk.yellow('\n⚠ Windows Controlled Folder Access is enabled'));
            }
            resolve(isEnabled);
        });
    });
}

// Verify folder access permissions (cross-platform)
function verifyFolderAccess(folder) {
    try {
        // Try to create the folder if it doesn't exist
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        // Try to write a test file
        const testFile = path.join(folder, '.test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        return false;
    }
}

// Find image files in directory (cross-platform)
async function findImageFiles(directory, recursive = false) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp'];
    const pattern = path.join(
        directory,
        recursive ? '**' : '',
        `*.{${imageExtensions.join(',')}}`
    );
    
    console.log(chalk.cyan('\nSearching for images in:'), directory);
    
    try {
        const files = await glob(pattern, { 
            nocase: true, 
            windowsPathsNoEscape: true,
            posix: !isWindows 
        });
        console.log(chalk.cyan('Found files:'), files.length);
        return files;
    } catch (error) {
        console.error(chalk.red('Error searching for images:'), error);
        return [];
    }
}

program
  .name('imagino')
  .description('Modern CLI tool for image conversion and optimization')
  .version('1.0.0')
  .option('-f, --format <type>', 'output format (jpeg, png, webp)', 'webp')
  .option('-q, --quality <number>', 'output quality (1-100)', '80')
  .option('-w, --width <pixels>', 'resize image width maintaining aspect ratio')
  .option('-o, --output <directory>', 'output directory for converted images', DEFAULT_OUTPUT)
  .option('-r, --recursive', 'process images in subdirectories', false)
  .action(async (options) => {
    const isControlledAccessEnabled = await checkControlledFolderAccess();
    
    // Ask for format
    const format = options.format === 'webp' ? await askFormat('webp') : options.format;
    
    // Ask for quality if not specified or default
    const quality = options.quality === '80' ? 
      await askQuality(80) : 
      parseInt(options.quality);

    // Ask for width if not specified
    const width = options.width ? 
      parseInt(options.width) : 
      await askWidth(null);
    
    let outputDir = options.output;
    
    // Handle Windows-specific protected folders
    if (isWindows && isControlledAccessEnabled && isProtectedPath(outputDir)) {
        const safePath = getSafeFolderSuggestion();
        console.log(chalk.yellow(`\n⚠ The folder "${outputDir}" is protected by Windows.`));
        console.log(chalk.cyan('Using this alternative folder instead:'));
        console.log(chalk.green(safePath));
        outputDir = safePath;
    }
    
    outputDir = await askOutputDir(outputDir);
    const recursive = options.recursive || await askRecursive();

    // Use path.resolve for cross-platform absolute paths
    const resolvedOutput = path.resolve(outputDir);
    
    // Verify access to output folder
    if (!verifyFolderAccess(resolvedOutput)) {
        const errorMsg = isWindows 
            ? 'Please choose a different folder or run the program as administrator.'
            : 'Please choose a different folder or check folder permissions.';
        console.log(chalk.red(`\n⛔ Cannot access folder "${resolvedOutput}"`));
        console.log(chalk.yellow(errorMsg));
        process.exit(1);
    }

    // Find and process images
    const currentDir = process.cwd();
    const files = await findImageFiles(currentDir, recursive);
    
    if (files.length === 0) {
        console.log(chalk.yellow('\nNo image files found in:'), currentDir);
        console.log(chalk.cyan('Supported formats:'), '.jpg, .jpeg, .png, .gif, .webp, .tiff, .bmp');
        process.exit(0);
    }

    await convertImages({
        format,
        quality,
        width,
        outputDir: resolvedOutput,
        recursive,
        files
    });
  });

program.parse();

process.on('uncaughtException', (error) => {
    console.error(chalk.red('Unhandled exception:'), error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled rejection at:'), promise, 'reason:', reason);
    process.exit(1);
});
