import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import logSymbols from 'log-symbols';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const addCommand = async () => {
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
    console.log(logSymbols.error, chalk.red(`Error during add command prompt: ${e.message}`));
    return; // Exit the function
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
    console.log(logSymbols.error, chalk.red(`Error: Command path must be inside the allowed directory: ${resolvedCommandsDir}. Aborting.`));
    return;
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
      console.log(logSymbols.error, chalk.red(`Error during overwrite confirmation prompt: ${e.message}`));
      return; // Exit the function
    }

    if (!overwriteAnswer.CONFIRM_OVERWRITE) {
      console.log(logSymbols.warning, chalk.yellow('Overwrite cancelled. Command not added.'));
      return;
    }
  }

  // Create .gemini directory if it doesn't exist
  try {
    if (!fs.existsSync(GEMINI_DIR)) {
      fs.mkdirSync(GEMINI_DIR);
    }
  } catch (e) {
    console.log(logSymbols.error, chalk.red(`Error creating Gemini directory: ${e.message}`));
    return;
  }

  // Create full command path (including subdirectories) if it doesn't exist
  try {
    if (!fs.existsSync(fullCommandsPath)) {
      fs.mkdirSync(fullCommandsPath, { recursive: true });
    }
  } catch (e) {
    console.log(logSymbols.error, chalk.red(`Error creating command directory: ${e.message}`));
    return;
  }

  // Write the command to a new file with .toml extension
  try {
    let tomlContent = `description = "${COMMAND_DESCRIPTION}"`;
    if (COMMAND_PROMPT) {
      tomlContent += `\nprompt = """\n${COMMAND_PROMPT}\n"""`;
    }
    fs.writeFileSync(fullFilePath, tomlContent);

    console.log(
      logSymbols.success,
      chalk.green(
        `Successfully added the command: ${COMMAND_PATH}`
      )
    );
  } catch (e) {
    console.log(logSymbols.error, chalk.red(`Error writing command file: ${e.message}`));
    return;
  }
};

export default addCommand;
