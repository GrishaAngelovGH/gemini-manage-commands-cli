#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import logSymbols from 'log-symbols';
import gradient from 'gradient-string';

import addCommand from './commands/addCommand.js';
import listCommands from './commands/listCommands.js';
import deleteCommand from './commands/deleteCommand.js';
import backupCommands from './commands/backupCommands.js';
import restoreCommands from './commands/restoreCommands.js';
import exportCommandsToJson from './commands/exportCommandsToJson.js';
import importCommandsFromJson from './commands/importCommandsFromJson.js';
import openCommandsFolder from './commands/openCommandsFolder.js';

const init = () => {
  console.log(
    gradient.retro(
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
    pageSize: 10,
    choices: ['Add New Command', 'List All Available Commands', 'Delete Command', 'Backup Commands', 'Restore Commands', 'Export Commands to JSON', 'Import Commands from JSON', 'Open Commands Folder', 'Clear Screen', 'Exit'],
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
      console.log(logSymbols.error, chalk.red(`Error during main menu prompt: ${e.message}`));
      continue; // Continue the loop to show the menu again
    }
    const { MENU_CHOICE } = answers;

    switch (MENU_CHOICE) {
      case 'Add New Command':
        await addCommand();
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
      case 'Open Commands Folder':
        await openCommandsFolder();
        break;
      case 'Clear Screen':
        console.clear();
        break;
      case 'Exit':
        running = false;
        console.log(logSymbols.success, chalk.green('Exiting Gemini Manage Commands CLI. Goodbye!'));
        break;
    }
  }
};

run();