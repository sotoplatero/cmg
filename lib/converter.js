import sharp from 'sharp';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export async function convertImages(options) {
  const { files, outputDir, format, quality, width } = options;

  // Create output directory if it doesn't exist
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.blue(`Created output directory: ${outputDir}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error creating output directory: ${error.message}`));
    process.exit(1);
  }

  console.log(chalk.blue(`\nProcessing ${files.length} image files...`));

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Converting |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} images',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  progressBar.start(files.length, 0);
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [index, file] of files.entries()) {
    const fileExt = path.parse(file).ext.toLowerCase().replace('.', '');
    
    // Use path.relative for cross-platform compatibility
    const relativePath = path.relative(process.cwd(), path.dirname(file));
    const outputPath = path.join(outputDir, relativePath);
    
    // Create subdirectories if they don't exist
    try {
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
    } catch (error) {
      console.error(chalk.red(`Error creating directory ${outputPath}: ${error.message}`));
      errorCount++;
      progressBar.update(index + 1);
      continue;
    }
    
    const outputFilename = path.join(outputPath, `${path.parse(file).name}.${format}`);
    
    // Skip if file is already in target format and same directory
    if ((fileExt === format || (fileExt === 'jpg' && format === 'jpeg')) && 
        path.dirname(file) === path.dirname(outputFilename)) {
      skipCount++;
      progressBar.update(index + 1);
      continue;
    }
    
    try {
      let pipeline = sharp(file);

      // Resize if width is specified
      if (width) {
        pipeline = pipeline.resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert and optimize
      if (format === 'jpeg' || format === 'jpg') {
        await pipeline.jpeg({
          quality,
          mozjpeg: true,
        }).toFile(outputFilename);
      } else if (format === 'png') {
        await pipeline.png({
          quality,
          effort: 6,
        }).toFile(outputFilename);
      } else if (format === 'webp') {
        await pipeline.webp({
          quality,
          effort: 6,
        }).toFile(outputFilename);
      }

      successCount++;
    } catch (error) {
      errorCount++;
      // Use path.relative for shorter, cleaner error messages
      const relativeFile = path.relative(process.cwd(), file);
      console.error(chalk.red(`\nError converting ${relativeFile}: ${error.message}`));
    }

    progressBar.update(index + 1);
  }

  progressBar.stop();
  
  // Show summary
  console.log(chalk.green('\n✨ Conversion completed!'));
  console.log(chalk.blue('Summary:'));
  console.log(chalk.green(`  ✓ Successfully converted: ${successCount}`));
  if (skipCount > 0) console.log(chalk.yellow(`  ⚠ Skipped (already converted): ${skipCount}`));
  if (errorCount > 0) console.log(chalk.red(`  ✗ Failed to convert: ${errorCount}`));
}
