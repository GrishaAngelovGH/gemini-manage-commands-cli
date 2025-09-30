#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const toml = require('@iarna/toml');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync('Gemini Add Custom Commands CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
};

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
          console.log(chalk.yellow(`
Command: ${prefix}${commandName}`));
          if (parsedCommand.description) {
            console.log(chalk.cyan(`  Description: ${parsedCommand.description}`));
          }
          if (parsedCommand.prompt) {
            console.log(chalk.magenta(`  Prompt:
${parsedCommand.prompt}`));
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

const restoreCommands = async () => {
  const backupDir = path.join(GEMINI_DIR, 'commands_backup');

  if (!fs.existsSync(backupDir)) {
    console.log(chalk.yellow('No backup found to restore from.'));
    return;
  }

  const scopeAnswers = await inquirer.prompt([
    {
      name: 'RESTORE_SCOPE',
      type: 'list',
      message: 'What would you like to restore?',
      choices: ['All commands (merge with existing)', 'A single command (merge)', 'Go Back'],
    },
  ]);

  if (scopeAnswers.RESTORE_SCOPE === 'Go Back') {
    console.log(chalk.yellow('Restore cancelled.'));
    return;
  }

  if (scopeAnswers.RESTORE_SCOPE === 'All commands (merge with existing)') {
    const confirmAnswers = await inquirer.prompt([
      {
        name: 'CONFIRM_RESTORE',
        type: 'confirm',
        message: 'Are you sure you want to merge ALL commands from backup? This will add new commands and overwrite existing ones.',
        default: false,
      },
    ]);

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
    console.log(chalk.yellow('Restoring a single command is not yet implemented. Returning to main menu.'));
  }
};

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

const deleteCommand = async () => {
  const allCommands = [];
  const collectCommands = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectCommands(fullPath, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.toml')) {
        const commandName = entry.name.replace('.toml', '');
        allCommands.push(`${prefix}${commandName}`);
      }
    });
  };

  if (fs.existsSync(COMMANDS_FILE) && fs.lstatSync(COMMANDS_FILE).isDirectory()) {
    collectCommands(COMMANDS_FILE);

    if (allCommands.length === 0) {
      console.log(chalk.yellow('No commands to delete.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        name: 'COMMAND_TO_DELETE',
        type: 'list',
        message: 'Which command would you like to delete?',
        choices: [...allCommands, new inquirer.Separator(), 'Go Back'],
      },
    ]);

    if (answers.COMMAND_TO_DELETE === 'Go Back') {
      console.log(chalk.yellow('Returning to main menu.'));
      return;
    }

    const confirmAnswer = await inquirer.prompt([
      {
        name: 'CONFIRM_DELETE',
        type: 'confirm',
        message: `Are you sure you want to delete ${answers.COMMAND_TO_DELETE}?`,
        default: false,
      },
    ]);

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

const askQuestions = () => {
  const questions = [
    {
      name: 'MENU_CHOICE',
      type: 'list',
      message: 'What would you like to do?',
      choices: ['Add new command', 'List all available commands', 'Delete command', 'Backup commands', 'Restore commands', 'Exit'],
    },
  ];
  return inquirer.prompt(questions);
};

const run = async () => {
  // show script introduction
  init();

  let running = true;
  while (running) {
    // ask questions
    const answers = await askQuestions();
    const { MENU_CHOICE } = answers;

    switch (MENU_CHOICE) {
      case 'Add new command':
        const addCommandAnswers = await inquirer.prompt([
          {
            name: 'COMMAND_PATH',
            type: 'input',
            message: 'Enter the command path (e.g., git/commit or mycommand):',
          },
          {
            name: 'COMMAND_DESCRIPTION',
            type: 'input',
            message: 'Enter a brief description for the command:',
          },
          {
            name: 'COMMAND_PROMPT',
            type: 'input',
            message: 'Enter the prompt content (optional):',
          },
        ]);
        const { COMMAND_PATH, COMMAND_DESCRIPTION, COMMAND_PROMPT } = addCommandAnswers;

        // Parse COMMAND_PATH to get the command name and subdirectory
        const pathParts = COMMAND_PATH.split('/');
        const commandName = pathParts.pop();
        const subDirectory = pathParts.join('/');

        const fullCommandsPath = path.join(COMMANDS_FILE, subDirectory);

        // Create .gemini directory if it doesn't exist
        if (!fs.existsSync(GEMINI_DIR)) {
          fs.mkdirSync(GEMINI_DIR);
        }

        // Create full command path (including subdirectories) if it doesn't exist
        if (!fs.existsSync(fullCommandsPath)) {
          fs.mkdirSync(fullCommandsPath, { recursive: true });
        }

        // Write the command to a new file with .toml extension
        let tomlContent = `description = "${COMMAND_DESCRIPTION}"`;
        if (COMMAND_PROMPT) {
          tomlContent += `\nprompt = """\n${COMMAND_PROMPT}\n"""`;
        }
        fs.writeFileSync(path.join(fullCommandsPath, `${commandName}.toml`), tomlContent);

        console.log(
          chalk.green(
            `Successfully added the command: ${COMMAND_PATH}`
          )
        );
        break;
      case 'List all available commands':
        listCommands();
        break;
      case 'Delete command':
        await deleteCommand();
        break;
      case 'Backup commands':
        backupCommands();
        break;
      case 'Restore commands':
        await restoreCommands();
        break;
      case 'Exit':
        running = false;
        console.log(chalk.green('Exiting Gemini Add Custom Commands CLI. Goodbye!'));
        break;
    }
  }
};

run();
