import inquirer from 'inquirer';

const commonWebSizes = [
  { name: 'Original size', value: null },
  { name: 'Large (1920px) - Desktop', value: 1920 },
  { name: 'Medium (1280px) - Tablet', value: 1280 },
  { name: 'Small (768px) - Mobile', value: 768 },
  { name: 'Thumbnail (320px)', value: 320 },
  { name: 'Custom size...', value: 'custom' }
];

export async function askFormat(defaultFormat) {
  const { format } = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Select output format:',
      default: defaultFormat,
      choices: [
        { name: 'WebP (recommended for web)', value: 'webp' },
        { name: 'JPEG (best for photos)', value: 'jpeg' },
        { name: 'PNG (best for transparency)', value: 'png' }
      ]
    }
  ]);
  return format;
}

export async function askWidth(defaultWidth = null) {
  const { widthChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'widthChoice',
      message: 'Select image width:',
      default: defaultWidth,
      choices: commonWebSizes
    }
  ]);

  if (widthChoice === 'custom') {
    const { customWidth } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customWidth',
        message: 'Enter custom width in pixels:',
        validate: (input) => {
          const width = parseInt(input);
          if (isNaN(width) || width < 1) {
            return 'Please enter a valid number greater than 0';
          }
          return true;
        },
        filter: (input) => parseInt(input)
      }
    ]);
    return customWidth;
  }

  return widthChoice;
}

export async function askQuality(defaultQuality = 80) {
  const qualityPresets = [
    { name: 'Maximum (100) - Lossless', value: 100 },
    { name: 'High (90) - Photos', value: 90 },
    { name: 'Medium (80) - Web optimal', value: 80 },
    { name: 'Low (60) - Small file size', value: 60 },
    { name: 'Custom quality...', value: 'custom' }
  ];

  const { qualityChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'qualityChoice',
      message: 'Select image quality:',
      default: defaultQuality,
      choices: qualityPresets
    }
  ]);

  if (qualityChoice === 'custom') {
    const { customQuality } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customQuality',
        message: 'Enter custom quality (1-100):',
        default: defaultQuality.toString(),
        validate: (input) => {
          const quality = parseInt(input);
          if (isNaN(quality) || quality < 1 || quality > 100) {
            return 'Please enter a number between 1 and 100';
          }
          return true;
        },
        filter: (input) => parseInt(input)
      }
    ]);
    return customQuality;
  }

  return qualityChoice;
}

export async function askOutputDir(defaultDir) {
  const { outputDir } = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputDir',
      message: 'Enter output directory:',
      default: defaultDir,
      validate: (input) => {
        if (!input.trim()) return 'Directory name cannot be empty';
        if (input.includes('..')) return 'Directory name cannot contain ..';
        return true;
      }
    }
  ]);
  return outputDir;
}

export async function askRecursive() {
  const { recursive } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'recursive',
      message: 'Process images in subdirectories?',
      default: false
    }
  ]);
  return recursive;
}
