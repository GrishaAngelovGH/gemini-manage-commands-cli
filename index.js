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
      figlet.textSync('Gemini CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
};

const askQuestions = () => {
  const questions = [
    {
      name: 'COMMAND_NAME',
      type: 'input',
      message: 'What is the name of the command?',
    },
    {
      name: 'COMMAND_VALUE',
      type: 'input',
      message: 'What is the command to execute?',
    },
  ];
  return inquirer.prompt(questions);
};

const run = async () => {
  // show script introduction
  init();

  // ask questions
  const answers = await askQuestions();
  const { COMMAND_NAME, COMMAND_VALUE } = answers;

  // Create .gemini directory if it doesn't exist
  if (!fs.existsSync(GEMINI_DIR)) {
    fs.mkdirSync(GEMINI_DIR);
  }

  // Write the command to the commands file
  const command = `${COMMAND_NAME}=${COMMAND_VALUE}\n`;
  fs.appendFileSync(COMMANDS_FILE, command);

  console.log(
    chalk.green(
      `Successfully added the command: ${COMMAND_NAME}`
    )
  );
};

run();