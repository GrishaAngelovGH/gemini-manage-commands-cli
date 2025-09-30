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
          name: 'COMMAND_NAME',
          type: 'input',
          message: 'What is the name of the command?',
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
      const { COMMAND_NAME, COMMAND_DESCRIPTION, COMMAND_PROMPT } = addCommandAnswers;

      // Create .gemini directory if it doesn't exist
      if (!fs.existsSync(GEMINI_DIR)) {
        fs.mkdirSync(GEMINI_DIR);
      }

      // Create commands directory if it doesn't exist
      if (!fs.existsSync(COMMANDS_FILE)) {
        fs.mkdirSync(COMMANDS_FILE);
      }

      // Write the command to a new file with .toml extension
      let tomlContent = `description = "${COMMAND_DESCRIPTION}"`;
      if (COMMAND_PROMPT) {
        tomlContent += `\nprompt = """\n${COMMAND_PROMPT}\n"""`;
      }
      fs.writeFileSync(path.join(COMMANDS_FILE, `${COMMAND_NAME}.toml`), tomlContent);

      console.log(
        chalk.green(
          `Successfully added the command: ${COMMAND_NAME}`
        )
      );
      break;
    case 'List all available commands':
      listCommands();
      break;
  }
};

run();
