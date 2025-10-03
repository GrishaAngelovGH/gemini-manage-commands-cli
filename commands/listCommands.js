import chalk from 'chalk';
import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { getParsedCommands } from './commandFinder.js';
import logSymbols from 'log-symbols';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const listCommands = () => {
  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    console.log(logSymbols.info, chalk.green('Available commands:'));
    const commands = getParsedCommands(COMMANDS_FILE);

    if (commands.length === 0) {
      console.log(logSymbols.warning, chalk.yellow('No commands found.'));
      return;
    }

    commands.forEach(command => {
      console.log(chalk.yellow(`\n  Command: ${command.name}\n`));
      if (command.description) {
        console.log(chalk.cyan(`  Description:\n  ${command.description}\n`));
      }
      if (command.prompt) {
        console.log(chalk.magenta(`  Prompt:\n${command.prompt}\n`));
      }
      console.log(chalk.gray('────────────────────────────────────────'));
    });
  } else {
    console.log(logSymbols.warning, chalk.yellow('No commands found.'));
  }
};

export default listCommands;