import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { getCommandNames } from './commandFinder.js';
import logSymbols from 'log-symbols';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const deleteCommand = async () => {
  const allCommands = [];

  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    allCommands.push(...getCommandNames(COMMANDS_FILE));

    if (allCommands.length === 0) {
      console.log(logSymbols.warning, chalk.yellow('No commands to delete.'));
      return;
    }

    let answers;
    try {
      answers = await inquirer.prompt([{
        name: 'COMMAND_TO_DELETE',
        type: 'list',
        message: 'Which command would you like to delete?',
        choices: [...allCommands, new inquirer.Separator(), 'Go Back'],
      },]);
    } catch (e) {
      console.log(logSymbols.error, chalk.red(`Error during command selection prompt: ${e.message}`));
      return;
    }

    if (answers.COMMAND_TO_DELETE === 'Go Back') {
      console.log(logSymbols.info, chalk.yellow('Returning to main menu.'));
      return;
    }

    let confirmAnswer;
    try {
      confirmAnswer = await inquirer.prompt([{
        name: 'CONFIRM_DELETE',
        type: 'confirm',
        message: `Are you sure you want to delete ${answers.COMMAND_TO_DELETE}?`,
        default: false,
      },]);
    } catch (e) {
      console.log(logSymbols.error, chalk.red(`Error during delete confirmation prompt: ${e.message}`));
      return;
    }

    if (confirmAnswer.CONFIRM_DELETE) {
      const commandToDelete = answers.COMMAND_TO_DELETE;
      const commandPathParts = commandToDelete.split('/');
      const commandFileName = `${commandPathParts.pop()}.toml`;
      const commandDirectory = path.join(COMMANDS_FILE, commandPathParts.join('/'));
      const fullFilePath = path.join(commandDirectory, commandFileName);

      // Security: Prevent path traversal.
      const resolvedCommandsDir = path.resolve(COMMANDS_FILE);
      const resolvedFilePath = path.resolve(fullFilePath);

      if (!resolvedFilePath.startsWith(resolvedCommandsDir)) {
        console.log(logSymbols.error, chalk.red(`Error: Command '${commandToDelete}' has a malicious path. Deletion aborted.`));
        return;
      }

      try {
        fs.unlinkSync(fullFilePath);
        console.log(logSymbols.success, chalk.green(`Successfully deleted command: ${commandToDelete}`));

        // Clean up empty directories
        let currentDir = commandDirectory;
        while (currentDir !== COMMANDS_FILE && fs.readdirSync(currentDir).length === 0) {
          fs.rmdirSync(currentDir);
          currentDir = path.dirname(currentDir);
        }

      } catch (e) {
        console.log(logSymbols.error, chalk.red(`Error deleting command ${commandToDelete}: ${e.message}`));
      }
    } else {
      console.log(logSymbols.info, chalk.yellow('Deletion cancelled.'));
    }

  } else {
    console.log(logSymbols.warning, chalk.yellow('No commands directory found.'));
  }
};

export default deleteCommand;