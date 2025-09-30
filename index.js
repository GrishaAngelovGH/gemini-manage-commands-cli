#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

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
  const listFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        listFiles(fullPath);
      } else {
        const commandContent = fs.readFileSync(fullPath, 'utf8');
        console.log(`${entry.name}=${commandContent}`);
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

const askQuestions = () => {
  const questions = [
    {
      name: 'MENU_CHOICE',
      type: 'list',
      message: 'What would you like to do?',
      choices: ['Add new command', 'List all available commands'],
    },
  ];
  return inquirer.prompt(questions);
};

const run = async () => {
  // show script introduction
  init();

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
          message: 'Enter the prompt content:',
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
  }
};

run();
