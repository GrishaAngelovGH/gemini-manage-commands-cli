const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const restoreCommands = async () => {
  const backupDir = path.join(GEMINI_DIR, 'commands_backup');

  if (!fs.existsSync(backupDir)) {
    console.log(chalk.yellow('No backup found to restore from.'));
    return;
  }

  const scopeAnswers = await inquirer.prompt([{
    name: 'RESTORE_SCOPE',
    type: 'list',
    message: 'What would you like to restore?',
    choices: ['All commands (merge with existing)', 'A single command (merge)', 'Go Back'],
  },]);

  if (scopeAnswers.RESTORE_SCOPE === 'Go Back') {
    console.log(chalk.yellow('Restore cancelled.'));
    return;
  }

  if (scopeAnswers.RESTORE_SCOPE === 'All commands (merge with existing)') {
    const confirmAnswers = await inquirer.prompt([{
      name: 'CONFIRM_RESTORE',
      type: 'confirm',
      message: 'Are you sure you want to merge ALL commands from backup? This will add new commands and overwrite existing ones.',
      default: false,
    },]);

    if (confirmAnswers.CONFIRM_RESTORE) {
      try {
        // Ensure commands directory exists
        if (!fs.existsSync(COMMANDS_FILE)) {
          fs.mkdirSync(COMMANDS_FILE, { recursive: true });
        }

        // Recursive merge function
        const mergeDirectories = (source, destination) => {
          const entries = fs.readdirSync(source, { withFileTypes: true });
          entries.forEach(entry => {
            const sourcePath = path.join(source, entry.name);
            const destinationPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
              if (!fs.existsSync(destinationPath)) {
                fs.mkdirSync(destinationPath, { recursive: true });
              }
              mergeDirectories(sourcePath, destinationPath);
            } else {
              fs.copyFileSync(sourcePath, destinationPath); // Overwrites if exists, copies if new
            }
          });
        };

        mergeDirectories(backupDir, COMMANDS_FILE);
        console.log(chalk.green('Successfully merged all commands from backup.'));
      } catch (e) {
        console.log(chalk.red(`Error merging commands: ${e.message}`));
      }
    } else {
      console.log(chalk.yellow('Restore cancelled.'));
    }
  } else if (scopeAnswers.RESTORE_SCOPE === 'A single command (merge)') {
    const allBackupCommands = [];
    const collectBackupCommands = (dir, prefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectBackupCommands(fullPath, `${prefix}${entry.name}/`);
        } else if (entry.name.endsWith('.toml')) {
          const commandName = entry.name.replace('.toml', '');
          allBackupCommands.push(`${prefix}${commandName}`);
        }
      });
    };

    collectBackupCommands(backupDir);

    if (allBackupCommands.length === 0) {
      console.log(chalk.yellow('No commands found in backup to restore.'));
      return;
    }

    const selectCommandAnswers = await inquirer.prompt([{
      name: 'COMMAND_TO_RESTORE',
      type: 'list',
      message: 'Which command would you like to restore from backup?',
      choices: [...allBackupCommands, new inquirer.Separator(), 'Go Back'],
    },]);

    if (selectCommandAnswers.COMMAND_TO_RESTORE === 'Go Back') {
      console.log(chalk.yellow('Restore cancelled.'));
      return;
    }

    const commandToRestore = selectCommandAnswers.COMMAND_TO_RESTORE;
    const commandPathParts = commandToRestore.split('/');
    const commandFileName = `${commandPathParts.pop()}.toml`;
    const commandBackupDirectory = path.join(backupDir, commandPathParts.join('/'));
    const fullBackupFilePath = path.join(commandBackupDirectory, commandFileName);

    const commandActiveDirectory = path.join(COMMANDS_FILE, commandPathParts.join('/'));
    const fullActiveFilePath = path.join(commandActiveDirectory, commandFileName);

    // Ensure active directory exists
    if (!fs.existsSync(commandActiveDirectory)) {
      fs.mkdirSync(commandActiveDirectory, { recursive: true });
    }

    if (fs.existsSync(fullActiveFilePath)) {
      const conflictAnswers = await inquirer.prompt([{
        name: 'CONFLICT_RESOLUTION',
        type: 'list',
        message: `Command '${commandToRestore}' already exists. What would you like to do?`,
        choices: ['Overwrite', 'Skip', 'Go Back'],
      },]);

      if (conflictAnswers.CONFLICT_RESOLUTION === 'Overwrite') {
        fs.copyFileSync(fullBackupFilePath, fullActiveFilePath);
        console.log(chalk.green(`Successfully restored and overwrote command: ${commandToRestore}`));
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Skip') {
        console.log(chalk.yellow(`Skipped restoring command: ${commandToRestore}`));
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Go Back') {
        console.log(chalk.yellow('Restore cancelled.'));
        return;
      }
    } else {
      fs.copyFileSync(fullBackupFilePath, fullActiveFilePath);
      console.log(chalk.green(`Successfully restored command: ${commandToRestore}`));
    }
  }
};

module.exports = restoreCommands