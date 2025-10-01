#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

const listCommands = require('./commands/listCommands')
const deleteCommand = require('./commands/deleteCommand')
const backupCommands = require('./commands/backupCommands')
const restoreCommands = require('./commands/restoreCommands')
const exportCommandsToJson = require('./commands/exportCommandsToJson')
const importCommandsFromJson = require('./commands/importCommandsFromJson')

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync('Gemini Manage Commands CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
};

const askQuestions = () => {
  const questions = [{
    name: 'MENU_CHOICE',
    type: 'list',
    message: 'What would you like to do?',
    choices: ['Add new command', 'List all available commands', 'Delete command', 'Backup commands', 'Restore commands', 'Export commands to JSON', 'Import commands from JSON', 'Exit'],
  },];
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
            validate: function(value) {
              if (value && value.trim().length > 0) {
                return true;
              }
              return 'Command path cannot be empty.';
            }
          },
          {
            name: 'COMMAND_DESCRIPTION',
            type: 'input',
            message: 'Enter a brief description for the command:',
            validate: function(value) {
              if (value && value.trim().length > 0) {
                return true;
              }
              return 'Command description cannot be empty.';
            }
          },
          {
            name: 'COMMAND_PROMPT',
            type: 'input',
            message: 'Enter the prompt content:',
            validate: function(value) {
              if (value && value.trim().length > 0) {
                return true;
              }
              return 'Command prompt cannot be empty.';
            }
          },
        ]);
        const { COMMAND_PATH, COMMAND_DESCRIPTION, COMMAND_PROMPT } = addCommandAnswers;

        // Parse COMMAND_PATH to get the command name and subdirectory
        const pathParts = COMMAND_PATH.split('/');
        const commandName = pathParts.pop();
        const subDirectory = pathParts.join('/');

        const fullCommandsPath = path.join(COMMANDS_FILE, subDirectory);
        const fullFilePath = path.join(fullCommandsPath, `${commandName}.toml`);

        // Security: Ensure path is within the commands directory.
        const resolvedCommandsDir = path.resolve(COMMANDS_FILE);
        const resolvedFilePath = path.resolve(fullFilePath);

        if (!resolvedFilePath.startsWith(resolvedCommandsDir)) {
          console.log(chalk.red(`Error: Command path must be inside the allowed directory: ${resolvedCommandsDir}. Aborting.`));
          break;
        }

        if (fs.existsSync(fullFilePath)) {
          const overwriteAnswer = await inquirer.prompt([{
            name: 'CONFIRM_OVERWRITE',
            type: 'confirm',
            message: `Command '${COMMAND_PATH}' already exists. Do you want to overwrite it?`,
            default: false,
          }]);

          if (!overwriteAnswer.CONFIRM_OVERWRITE) {
            console.log(chalk.yellow('Overwrite cancelled. Command not added.'));
            break;
          }
        }

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
        fs.writeFileSync(fullFilePath, tomlContent);

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
      case 'Export commands to JSON':
        await exportCommandsToJson();
        break;
      case 'Import commands from JSON':
        await importCommandsFromJson();
        break;
      case 'Exit':
        running = false;
        console.log(chalk.green('Exiting Gemini Add Custom Commands CLI. Goodbye!'));
        break;
    }
  }
};

run();