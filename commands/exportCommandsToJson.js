const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { getParsedCommands } = require('./commandFinder');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const exportCommandsToJson = async () => {
  const allCommands = [];

  if (!fs.existsSync(COMMANDS_FILE) || !fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    console.log(chalk.yellow('No commands directory found to export.'));
    return;
  }

  allCommands.push(...getParsedCommands(COMMANDS_FILE));

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
  ]);

  let exportFileName = answers.FILENAME;
  if (!exportFileName.endsWith('.json')) {
    exportFileName += '.json';
  }

  const exportFilePath = path.join('.', exportFileName);

  try {
    fs.writeFileSync(exportFilePath, JSON.stringify(allCommands, null, 2));
    console.log(chalk.green(`Successfully exported ${allCommands.length} commands to ${exportFilePath}`));
  } catch (e) {
    console.log(chalk.red(`Error exporting commands to JSON: ${e.message}`));
  }
};

module.exports = exportCommandsToJson