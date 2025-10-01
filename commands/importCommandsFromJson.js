import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const importCommandsFromJson = async () => {
  const importDirectory = '.'; // Always use the current directory

  let jsonFiles;
  try {
    jsonFiles = fs.readdirSync(importDirectory).filter(file => file.endsWith('.json') && file !== 'package.json' && file !== 'package-lock.json');
  } catch (e) {
    console.log(chalk.red(`Error reading current directory for JSON files: ${e.message}`));
    console.log(chalk.yellow('Import cancelled.'));
    return;
  }

  if (jsonFiles.length === 0) {
    console.log(chalk.yellow('No JSON files found.'));
    console.log(chalk.yellow('Import cancelled. No JSON files found in the current directory.'));
    return;
  }

  let fileAnswers;
  try {
    fileAnswers = await inquirer.prompt([{
      name: 'SELECTED_FILE',
      type: 'list',
      message: 'Select the JSON file to import:',
      choices: [...jsonFiles, new inquirer.Separator(), 'Go Back'],
    },]);
  } catch (e) {
    console.log(chalk.red(`Error during file selection prompt: ${e.message}`));
    console.log(chalk.yellow('Import cancelled.'));
    return;
  }

  if (fileAnswers.SELECTED_FILE === 'Go Back') {
    console.log(chalk.yellow('Import cancelled.'));
    return;
  }
  await processImport(path.join(importDirectory, fileAnswers.SELECTED_FILE));
};

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
    try {
      if (!fs.existsSync(fullCommandsPath)) {
        fs.mkdirSync(fullCommandsPath, { recursive: true });
      }
    } catch (e) {
      console.log(chalk.red(`  Error creating directory for command '${cmd.name}': ${e.message}`));
      continue;
    }

    let tomlContent = `description = "${cmd.description || ''}"`;
    if (cmd.prompt) {
      tomlContent += `\nprompt = """\n${cmd.prompt}\n"""`;
    }

    if (fs.existsSync(fullActiveFilePath)) {
      let conflictAnswers;
      try {
        conflictAnswers = await inquirer.prompt([{
          name: 'CONFLICT_RESOLUTION',
          type: 'list',
          message: `Command '${cmd.name}' already exists. What would you like to do?`,
          choices: ['Overwrite', 'Skip', 'Rename'],
        },]);
      } catch (e) {
        console.log(chalk.red(`  Error during conflict resolution prompt for '${cmd.name}': ${e.message}`));
        continue; // Skip this command and proceed to the next
      }

      if (conflictAnswers.CONFLICT_RESOLUTION === 'Overwrite') {
        try {
          fs.writeFileSync(fullActiveFilePath, tomlContent);
          console.log(chalk.green(`  Overwrote command: ${cmd.name}`));
          importedCount++;
        } catch (e) {
          console.log(chalk.red(`  Error overwriting command '${cmd.name}': ${e.message}`));
        }
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Rename') {
        let renameAnswers;
        try {
          renameAnswers = await inquirer.prompt([{
            name: 'NEW_NAME',
            type: 'input',
            message: `Enter new name for '${cmd.name}':`,
            default: `${cmd.name}_imported`,
          },]);
        } catch (e) {
          console.log(chalk.red(`  Error during rename prompt for '${cmd.name}': ${e.message}`));
          continue; // Skip this command and proceed to the next
        }
        const newName = renameAnswers.NEW_NAME;
        const newCommandName = newName.split('/').pop();
        const newSubDirectory = newName.split('/').slice(0, -1).join('/');
        const newFullCommandsPath = path.join(COMMANDS_FILE, newSubDirectory);
        const newFullFilePath = path.join(newFullCommandsPath, `${newCommandName}.toml`);

        // Security: Prevent path traversal.
        const resolvedCommandsDir = path.resolve(COMMANDS_FILE);
        const resolvedFilePath = path.resolve(newFullFilePath);

        if (!resolvedFilePath.startsWith(resolvedCommandsDir)) {
          console.log(chalk.red(`  Error: New command name '${newName}' has a malicious path. Aborting.`));
          continue;
        }

        try {
          if (!fs.existsSync(newFullCommandsPath)) {
            fs.mkdirSync(newFullCommandsPath, { recursive: true });
          }
          fs.writeFileSync(newFullFilePath, tomlContent);
          console.log(chalk.green(`  Imported command as: ${newName}`));
          importedCount++;
        } catch (e) {
          console.log(chalk.red(`  Error renaming and importing command '${cmd.name}': ${e.message}`));
        }
      } else if (conflictAnswers.CONFLICT_RESOLUTION === 'Skip') {
        console.log(chalk.yellow(`  Skipped command: ${cmd.name}`));
      }
    } else {
      try {
        fs.writeFileSync(fullActiveFilePath, tomlContent);
        console.log(chalk.green(`  Imported new command: ${cmd.name}`));
        importedCount++;
      } catch (e) {
        console.log(chalk.red(`  Error importing new command '${cmd.name}': ${e.message}`));
      }
    }
  }
  console.log(chalk.green(`Successfully imported ${importedCount} commands.`));
};

export default importCommandsFromJson;