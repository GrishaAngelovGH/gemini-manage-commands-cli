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
    pageSize: 9,
    choices: ['Add New Command', 'List All Available Commands', 'Delete Command', 'Backup Commands', 'Restore Commands', 'Export Commands to JSON', 'Import Commands from JSON', 'Clear Screen', 'Exit'],
  },];
  return inquirer.prompt(questions);
};

const run = async () => {
  // show script introduction
  init();

  let running = true;
  while (running) {
    // ask questions
    let answers;
    try {
      answers = await askQuestions();
    } catch (e) {
      console.log(chalk.red(`Error during main menu prompt: ${e.message}`));
      continue; // Continue the loop to show the menu again
    }
    const { MENU_CHOICE } = answers;

    switch (MENU_CHOICE) {
      case 'Add New Command':
        let addCommandAnswers;
        try {
          addCommandAnswers = await inquirer.prompt([
            {
              name: 'COMMAND_PATH',
              type: 'input',
              message: 'Enter the command path (e.g., git/commit or mycommand):',
              validate: function (value) {
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
              validate: function (value) {
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
              validate: function (value) {
                if (value && value.trim().length > 0) {
                  return true;
                }
                return 'Command prompt cannot be empty.';
              }
            },
          ]);
        } catch (e) {
          console.log(chalk.red(`Error during add command prompt: ${e.message}`));
          break; // Exit this case and return to main menu
        }
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
          let overwriteAnswer;
          try {
            overwriteAnswer = await inquirer.prompt([{
              name: 'CONFIRM_OVERWRITE',
              type: 'confirm',
              message: `Command '${COMMAND_PATH}' already exists. Do you want to overwrite it?`,
              default: false,
            }]);
          } catch (e) {
            console.log(chalk.red(`Error during overwrite confirmation prompt: ${e.message}`));
            break; // Exit this case and return to main menu
          }

          if (!overwriteAnswer.CONFIRM_OVERWRITE) {
            console.log(chalk.yellow('Overwrite cancelled. Command not added.'));
            break;
          }
        }

        // Create .gemini directory if it doesn't exist
        try {
          if (!fs.existsSync(GEMINI_DIR)) {
            fs.mkdirSync(GEMINI_DIR);
          }
        } catch (e) {
          console.log(chalk.red(`Error creating Gemini directory: ${e.message}`));
          break;
        }

        // Create full command path (including subdirectories) if it doesn't exist
        try {
          if (!fs.existsSync(fullCommandsPath)) {
            fs.mkdirSync(fullCommandsPath, { recursive: true });
          }
        } catch (e) {
          console.log(chalk.red(`Error creating command directory: ${e.message}`));
          break;
        }

        // Write the command to a new file with .toml extension
        try {
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
        } catch (e) {
          console.log(chalk.red(`Error writing command file: ${e.message}`));
        }
        break;
      case 'List All Available Commands':
        listCommands();
        break;
      case 'Delete Command':
        await deleteCommand();
        break;
      case 'Backup Commands':
        backupCommands();
        break;
      case 'Restore Commands':
        await restoreCommands();
        break;
      case 'Export Commands to JSON':
        await exportCommandsToJson();
        break;
      case 'Import Commands from JSON':
        await importCommandsFromJson();
        break;
      case 'Clear Screen':
        console.clear();
        break;
      case 'Exit':
        running = false;
        console.log(chalk.green('Exiting Gemini Manage Commands CLI. Goodbye!'));
        break;
    }
  }
};

run();