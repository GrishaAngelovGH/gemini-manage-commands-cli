const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const backupCommands = () => {
  const backupDir = path.join(GEMINI_DIR, 'commands_backup');

  if (!fs.existsSync(COMMANDS_FILE)) {
    console.log(chalk.yellow('No commands directory to backup.'));
    return;
  }

  if (fs.existsSync(backupDir)) {
    console.log(chalk.yellow('Existing backup found. Deleting old backup...'));
    fs.rmSync(backupDir, { recursive: true, force: true });
  }

  try {
    fs.cpSync(COMMANDS_FILE, backupDir, { recursive: true });
    console.log(chalk.green(`Successfully created backup at: ${backupDir}`));
  } catch (e) {
    console.log(chalk.red(`Error creating backup: ${e.message}`));
  }
};

module.exports = backupCommands