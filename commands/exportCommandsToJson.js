const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const toml = require('@iarna/toml');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const exportCommandsToJson = async () => {
  const allCommands = [];
  const collectCommandsForExport = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectCommandsForExport(fullPath, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.toml')) {
        const commandName = entry.name.replace('.toml', '');
        const commandContent = fs.readFileSync(fullPath, 'utf8');
        try {
          const parsedCommand = toml.parse(commandContent);
          allCommands.push({
            name: `${prefix}${commandName}`,
            description: parsedCommand.description || '',
            prompt: (parsedCommand.prompt || '').trim()
          });
        } catch (e) {
          console.log(chalk.red(`Error parsing ${fullPath} for export: ${e.message}`));
        }
      }
    });
  };

  if (!fs.existsSync(COMMANDS_FILE) || !fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    console.log(chalk.yellow('No commands directory found to export.'));
    return;
  }

  collectCommandsForExport(COMMANDS_FILE);

  if (allCommands.length === 0) {
    console.log(chalk.yellow('No commands found to export.'));
    return;
  }

  const answers = await inquirer.prompt([{
    name: 'FILENAME',
    type: 'input',
    message: 'Enter the filename for the JSON export (e.g., my_commands.json):',
    default: 'commands_export.json',
  },
  {
    name: 'LOCATION',
    type: 'input',
    message: 'Enter the directory to save the JSON file (default: current directory):',
    default: '.',
  },
  ]);

  let exportFileName = answers.FILENAME;
  if (!exportFileName.endsWith('.json')) {
    exportFileName += '.json';
  }

  const exportFilePath = path.join(answers.LOCATION, exportFileName);

  try {
    fs.writeFileSync(exportFilePath, JSON.stringify(allCommands, null, 2));
    console.log(chalk.green(`Successfully exported ${allCommands.length} commands to ${exportFilePath}`));
  } catch (e) {
    console.log(chalk.red(`Error exporting commands to JSON: ${e.message}`));
  }
};

module.exports = exportCommandsToJson