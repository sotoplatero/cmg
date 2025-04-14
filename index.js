#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { askFormat, askOutputDir, askRecursive } from './lib/prompts.js';
import { convertImages } from './lib/converter.js';
import fs from 'fs';
import { exec } from 'child_process';

console.log(chalk.green('Welcome to Imagino: a modern CLI tool for image conversion and optimization.'));

// Function to check and handle file system permissions
function checkPermissions(directory) {
    try {
        // Attempt to read the directory to verify permissions
        fs.readdirSync(directory);
        console.log(chalk.green('Read permissions verified successfully.'));
    } catch (error) {
        if (error.code === 'EACCES') {
            console.error(chalk.red('Error: You do not have permission to access the directory.'));
            process.exit(1);
        } else {
            console.error(chalk.red('Unexpected error:'), error);
            process.exit(1);
        }
    }
}

// Check permissions in the current directory
checkPermissions(process.cwd());

// Function to check controlled folder access
function checkControlledFolderAccess() {
    exec('powershell Get-MpPreference | Select-Object -ExpandProperty EnableControlledFolderAccess', (error, stdout, stderr) => {
        if (error) {
            console.error(chalk.red('Error checking controlled folder access:', error));
            return;
        }
        if (stdout.trim() === '1') {
            console.log(chalk.yellow('Controlled folder access is enabled. Please allow node.exe through controlled folder access.'));
            console.log(chalk.yellow('Go to Windows Security > Virus & threat protection > Manage settings > Controlled folder access > Allow an app through controlled folder access.'));
        }
    });
}

checkControlledFolderAccess();

program
  .name('imagino')
  .description('Modern CLI tool for image conversion and optimization')
  .version('1.0.0')
  .option('-f, --format <type>', 'output format (jpeg, png, webp)', 'webp')
  .option('-q, --quality <number>', 'output quality (1-100)', '80')
  .option('-w, --width <pixels>', 'resize image width maintaining aspect ratio')
  .option('-o, --output <directory>', 'output directory for converted images', 'converted')
  .option('-r, --recursive', 'process images in subdirectories', false)
  .action(async (options) => {
    const quality = parseInt(options.quality);
    const width = options.width ? parseInt(options.width) : undefined;

    if (quality < 1 || quality > 100) {
      console.error(chalk.red('Quality must be between 1 and 100'));
      process.exit(1);
    }

    // Ask for format if not specified in command line
    const format = options.format === 'webp' ? await askFormat('webp') : options.format;
    
    // Ask for output directory if using default
    const outputDir = options.output === 'converted' ? await askOutputDir('converted') : options.output;

    // Ask for recursive option if not specified
    const recursive = options.recursive || await askRecursive();

    await convertImages({
      format,
      quality,
      width,
      outputDir,
      recursive
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
