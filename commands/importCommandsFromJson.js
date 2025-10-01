const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const processImport = async (importFilePath) => {
  if (!fs.existsSync(importFilePath)) {
    console.log(chalk.red(`Error: File not found at ${importFilePath}`));
    return;
  }

  let importedCommands;
  try {
    const fileContent = fs.readFileSync(importFilePath, 'utf8');
    importedCommands = JSON.parse(fileContent);

    if (!Array.isArray(importedCommands)) {
      console.log(chalk.red('Error: JSON file does not contain an array of commands.'));
      return;
    }
  } catch (e) {
    console.log(chalk.red(`Error reading or parsing JSON file: ${e.message}`));
    return;
  }

  if (importedCommands.length === 0) {
    console.log(chalk.yellow('No commands found in the JSON file to import.'));
    return;
  }

  let importedCount = 0;
  for (const cmd of importedCommands) {
    const commandName = cmd.name.split('/').pop();
    const subDirectory = cmd.name.split('/').slice(0, -1).join('/');

    const fullCommandsPath = path.join(COMMANDS_FILE, subDirectory);
    const fullActiveFilePath = path.join(fullCommandsPath, `${commandName}.toml`);

    // Security: Prevent path traversal from malicious JSON files.
    const resolvedCommandsDir = path.resolve(COMMANDS_FILE);
    const resolvedFilePath = path.resolve(fullActiveFilePath);

    if (!resolvedFilePath.startsWith(resolvedCommandsDir)) {
      console.log(chalk.red(`  Error: Command '${cmd.name}' has a malicious path and will be skipped.`));
      continue;
    }

    // Ensure commands directory exists
    if (!fs.existsSync(fullCommandsPath)) {
      fs.mkdirSync(fullCommandsPath, { recursive: true });
    }

    let tomlContent = `description = "${cmd.description || ''}"`;
    if (cmd.prompt) {
      tomlContent += `\nprompt = """\n${cmd.prompt}\n"""`;
    }

    if (fs.existsSync(fullActiveFilePath)) {
      const conflictAnswers = await inquirer.prompt([{
        name: 'CONFLICT_RESOLUTION',
        type: 'list',
        message: `Command '${cmd.name}' already exists. What would you like to do?`,
        choices: ['Overwrite', 'Skip', 'Rename'],
      },]);

      if (conflictAnswers.CONFLICT_RESOLUTION === 'Overwrite') {
        fs.writeFileSync(fullActiveFilePath, tomlContent);
        console.log(chalk.green(`  Overwrote command: ${cmd.name}`));
        importedCount++;
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Rename') {
        const renameAnswers = await inquirer.prompt([{
          name: 'NEW_NAME',
          type: 'input',
          message: `Enter new name for '${cmd.name}':`,
          default: `${cmd.name}_imported`,
        },]);
        const newCommandName = renameAnswers.NEW_NAME.split('/').pop();
        const newSubDirectory = renameAnswers.NEW_NAME.split('/').slice(0, -1).join('/');
        const newFullCommandsPath = path.join(COMMANDS_FILE, newSubDirectory);
        if (!fs.existsSync(newFullCommandsPath)) {
          fs.mkdirSync(newFullCommandsPath, { recursive: true });
        }
        fs.writeFileSync(path.join(newFullCommandsPath, `${newCommandName}.toml`), tomlContent);
        console.log(chalk.green(`  Imported command as: ${renameAnswers.NEW_NAME}`));
        importedCount++;
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Skip') {
        console.log(chalk.yellow(`  Skipped command: ${cmd.name}`));
      }
    } else {
      fs.writeFileSync(fullActiveFilePath, tomlContent);
      console.log(chalk.green(`  Imported new command: ${cmd.name}`));
      importedCount++;
    }
  }
  console.log(chalk.green(`Successfully imported ${importedCount} commands.`));
};

const importCommandsFromJson = async () => {
  const importDirectory = '.'; // Always use the current directory

  const jsonFiles = fs.readdirSync(importDirectory).filter(file => file.endsWith('.json') && file !== 'package.json' && file !== 'package-lock.json');

  if (jsonFiles.length === 0) {
    console.log(chalk.yellow('No JSON files found.'));
    console.log(chalk.yellow('Import cancelled. No JSON files found in the current directory.'));
    return;
  }

  const fileAnswers = await inquirer.prompt([{
    name: 'SELECTED_FILE',
    type: 'list',
    message: 'Select the JSON file to import:',
    choices: [...jsonFiles, new inquirer.Separator(), 'Go Back'],
  },]);

  if (fileAnswers.SELECTED_FILE === 'Go Back') {
    console.log(chalk.yellow('Import cancelled.'));
    return;
  }
  await processImport(path.join(importDirectory, fileAnswers.SELECTED_FILE));
};

module.exports = importCommandsFromJson