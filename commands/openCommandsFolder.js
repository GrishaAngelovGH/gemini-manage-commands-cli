import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import open from 'open';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const openCommandsFolder = async () => {
  if (!fs.existsSync(COMMANDS_FILE)) {
    console.log(chalk.yellow('Commands directory does not exist yet. Add a command first to create it.'));
    return;
  }

  try {
    await open(COMMANDS_FILE);
    console.log(chalk.green(`Opened the commands directory at: ${COMMANDS_FILE}`));
  } catch (e) {
    console.log(chalk.red(`Error opening directory: ${e.message}`));
    console.log(chalk.yellow('You may need to open it manually.'));
  }
};

export default openCommandsFolder;
