import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { getParsedCommands } from './commandFinder.js';

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

  let answers;
  try {
    answers = await inquirer.prompt([{
      name: 'FILENAME',
      type: 'input',
      message: 'Enter the filename for the JSON export (e.g., my_commands.json):',
      default: 'commands_export.json',
    },
    ]);
  } catch (e) {
    console.log(chalk.red(`Error during filename prompt: ${e.message}`));
    return;
  }

  let exportFileName = answers.FILENAME;
  if (!exportFileName.endsWith('.json')) {
    exportFileName += '.json';
  }

  const exportFilePath = path.join('.', exportFileName);

  // Security: Prevent path traversal
  const resolvedExportPath = path.resolve(exportFilePath);
  const resolvedCurrentDir = path.resolve('.');

  if (!resolvedExportPath.startsWith(resolvedCurrentDir)) {
    console.log(chalk.red('Error: Export path is outside the current directory. Aborting.'));
    return;
  }

  try {
    fs.writeFileSync(exportFilePath, JSON.stringify(allCommands, null, 2));
    console.log(chalk.green(`Successfully exported ${allCommands.length} commands to ${exportFilePath}`));
  } catch (e) {
    console.log(chalk.red(`Error exporting commands to JSON: ${e.message}`));
  }
};

export default exportCommandsToJson;