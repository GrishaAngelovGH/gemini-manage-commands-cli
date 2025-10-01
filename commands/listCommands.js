const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { getParsedCommands } = require('./commandFinder');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const listCommands = () => {
  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    console.log(chalk.green('Available commands:'));
    const commands = getParsedCommands(COMMANDS_FILE);

    if (commands.length === 0) {
      console.log(chalk.yellow('No commands found.'));
      return;
    }

    commands.forEach(command => {
      console.log(chalk.yellow(`Command: ${command.name}`));
      if (command.description) {
        console.log(chalk.cyan(`  Description: ${command.description}`));
      }
      if (command.prompt) {
        console.log(chalk.magenta(`  Prompt:${command.prompt}`));
      }
      console.log(chalk.gray('────────────────────────────────────────'));
    });
  } else {
    console.log(chalk.yellow('No commands found.'));
  }
};

module.exports = listCommands