const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { getCommandNames } = require('./commandFinder');

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
          let entries;
          try {
            entries = fs.readdirSync(source, { withFileTypes: true });
          } catch (e) {
            console.error(chalk.red(`Error reading backup directory ${source}: ${e.message}`));
            return;
          }

          entries.forEach(entry => {
            const sourcePath = path.join(source, entry.name);
            const destinationPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
              try {
                if (!fs.existsSync(destinationPath)) {
                  fs.mkdirSync(destinationPath, { recursive: true });
                }
              } catch (e) {
                console.error(chalk.red(`Error creating directory ${destinationPath}: ${e.message}`));
                return; // Skip this directory if it can't be created
              }
              mergeDirectories(sourcePath, destinationPath);
            } else {
              try {
                fs.copyFileSync(sourcePath, destinationPath); // Overwrites if exists, copies if new
              } catch (e) {
                console.error(chalk.red(`Error copying file ${sourcePath} to ${destinationPath}: ${e.message}`));
              }
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

    allBackupCommands.push(...getCommandNames(backupDir));

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
    try {
      if (!fs.existsSync(commandActiveDirectory)) {
        fs.mkdirSync(commandActiveDirectory, { recursive: true });
      }
    } catch (e) {
      console.log(chalk.red(`Error creating directory for command '${commandToRestore}': ${e.message}`));
      return;
    }

    if (fs.existsSync(fullActiveFilePath)) {
      const conflictAnswers = await inquirer.prompt([{
        name: 'CONFLICT_RESOLUTION',
        type: 'list',
        message: `Command '${commandToRestore}' already exists. What would you like to do?`,
        choices: ['Overwrite', 'Skip', 'Go Back'],
      },]);

      if (conflictAnswers.CONFLICT_RESOLUTION === 'Overwrite') {
        try {
          fs.copyFileSync(fullBackupFilePath, fullActiveFilePath);
          console.log(chalk.green(`Successfully restored and overwrote command: ${commandToRestore}`));
        } catch (e) {
          console.log(chalk.red(`Error overwriting command '${commandToRestore}': ${e.message}`));
        }
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Skip') {
        console.log(chalk.yellow(`Skipped restoring command: ${commandToRestore}`));
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Go Back') {
        console.log(chalk.yellow('Restore cancelled.'));
        return;
      }
    } else {
      try {
        fs.copyFileSync(fullBackupFilePath, fullActiveFilePath);
        console.log(chalk.green(`Successfully restored command: ${commandToRestore}`));
      } catch (e) {
        console.log(chalk.red(`Error restoring command '${commandToRestore}': ${e.message}`));
      }
    }
  }
};

module.exports = restoreCommands