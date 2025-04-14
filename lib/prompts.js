import inquirer from 'inquirer';

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
