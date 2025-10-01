const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { getCommandNames } = require('./commandFinder');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const deleteCommand = async () => {
  const allCommands = [];

  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    allCommands.push(...getCommandNames(COMMANDS_FILE));

    if (allCommands.length === 0) {
      console.log(chalk.yellow('No commands to delete.'));
      return;
    }

    const answers = await inquirer.prompt([{
      name: 'COMMAND_TO_DELETE',
      type: 'list',
      message: 'Which command would you like to delete?',
      choices: [...allCommands, new inquirer.Separator(), 'Go Back'],
    },]);

    if (answers.COMMAND_TO_DELETE === 'Go Back') {
      console.log(chalk.yellow('Returning to main menu.'));
      return;
    }

    const confirmAnswer = await inquirer.prompt([{
      name: 'CONFIRM_DELETE',
      type: 'confirm',
      message: `Are you sure you want to delete ${answers.COMMAND_TO_DELETE}?`,
      default: false,
    },]);

    if (confirmAnswer.CONFIRM_DELETE) {
      const commandToDelete = answers.COMMAND_TO_DELETE;
      const commandPathParts = commandToDelete.split('/');
      const commandFileName = `${commandPathParts.pop()}.toml`;
      const commandDirectory = path.join(COMMANDS_FILE, commandPathParts.join('/'));
      const fullFilePath = path.join(commandDirectory, commandFileName);

      try {
        fs.unlinkSync(fullFilePath);
        console.log(chalk.green(`Successfully deleted command: ${commandToDelete}`));

        // Clean up empty directories
        let currentDir = commandDirectory;
        while (currentDir !== COMMANDS_FILE && fs.readdirSync(currentDir).length === 0) {
          fs.rmdirSync(currentDir);
          currentDir = path.dirname(currentDir);
        }

      } catch (e) {
        console.log(chalk.red(`Error deleting command ${commandToDelete}: ${e.message}`));
      }
    } else {
      console.log(chalk.yellow('Deletion cancelled.'));
    }

  } else {
    console.log(chalk.yellow('No commands directory found.'));
  }
};

module.exports = deleteCommand