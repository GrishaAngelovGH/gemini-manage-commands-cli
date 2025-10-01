const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const toml = require('@iarna/toml');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const listCommands = () => {
  const listFiles = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        listFiles(fullPath, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.toml')) {
        const commandName = entry.name.replace('.toml', '');
        const commandContent = fs.readFileSync(fullPath, 'utf8');
        try {
          const parsedCommand = toml.parse(commandContent);
          console.log(chalk.yellow(`Command: ${prefix}${commandName}`));
          if (parsedCommand.description) {
            console.log(chalk.cyan(`  Description: ${parsedCommand.description}`));
          }
          if (parsedCommand.prompt) {
            console.log(chalk.magenta(`  Prompt:${parsedCommand.prompt}`));
          }
          console.log(chalk.gray('────────────────────────────────────────')); // Separator
        } catch (e) {
          console.log(chalk.red(`Error parsing ${fullPath}: ${e.message}`));
        }
      }
    });
  };

  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    console.log(chalk.green('Available commands:'));
    listFiles(COMMANDS_FILE);
  } else {
    console.log(chalk.yellow('No commands found.'));
  }
};

module.exports = listCommands