import sharp from 'sharp';
import { glob } from 'glob';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export async function convertImages(options) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
    console.log(chalk.blue(`Created output directory: ${options.outputDir}`));
  }

  // Use absolute path for glob pattern
  const pattern = options.recursive ? path.join(process.cwd(), '**/*.{jpg,jpeg,png,webp,gif}') : path.join(process.cwd(), '*.{jpg,jpeg,png,webp,gif}');
  const imageFiles = await glob(pattern);
  
  if (imageFiles.length === 0) {
    console.log(chalk.yellow('No image files found'));
    return;
  }

  // Check read permissions for input directory
  try {
    imageFiles.forEach(file => fs.accessSync(file, fs.constants.R_OK));
    console.log(chalk.green('Read permissions verified for input files.'));
  } catch (error) {
    console.error(chalk.red('Error: Read permission denied for input files.')); 
    return;
  }

  // Check write permissions for output directory
  try {
    fs.accessSync(options.outputDir, fs.constants.W_OK);
    console.log(chalk.green('Write permissions verified for output directory.'));
  } catch (error) {
    console.error(chalk.red('Error: Write permission denied for output directory.'));
    return;
  }

  console.log(chalk.blue('Searching for image files...'));

  // Debug message to show found image files
  console.log(chalk.blue(`Found ${imageFiles.length} image files.`));

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Converting |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} images',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  progressBar.start(imageFiles.length, 0);

  for (const [index, file] of imageFiles.entries()) {
    const fileExt = path.parse(file).ext.toLowerCase().replace('.', '');
    
    // Maintain directory structure in output
    const relativePath = path.dirname(file);
    const outputPath = relativePath === '.' ? options.outputDir : path.join(options.outputDir, relativePath);
    
    // Create subdirectories if they don't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    const outputFilename = path.join(outputPath, `${path.parse(file).name}.${options.format}`);
    
    // Silently skip if file is already in target format
    if ((fileExt === options.format) || (fileExt === 'jpg' && options.format === 'jpeg')) {
      progressBar.update(index + 1);
      continue;
    }
    
    try {
      let pipeline = sharp(file);

      // Resize if width is specified
      if (options.width) {
        pipeline = pipeline.resize(options.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert and optimize
      if (options.format === 'jpeg' || options.format === 'jpg') {
        await pipeline.jpeg({
          quality: options.quality,
          mozjpeg: true,
        }).toFile(outputFilename);
      } else if (options.format === 'png') {
        await pipeline.png({
          quality: options.quality,
          effort: 6,
        }).toFile(outputFilename);
      } else if (options.format === 'webp') {
        await pipeline.webp({
          quality: options.quality,
          effort: 6,
        }).toFile(outputFilename);
      }

      // Debug message for each file being processed
      console.log(chalk.blue(`Processing file: ${file}`));

      // Debug message before attempting to convert
      console.log(chalk.blue(`Attempting to convert ${file} to ${options.format} format.`));

      // Debug message after successful conversion
      console.log(chalk.green(`Successfully converted ${file} to ${outputFilename}.`));

      progressBar.update(index + 1);
    } catch (error) {
      // Debug message if conversion fails
      console.error(chalk.red(`Failed to convert ${file}:`, error));
    }
  }

  progressBar.stop();
  console.log(chalk.green('\n✨ Conversion completed successfully!'));
}
