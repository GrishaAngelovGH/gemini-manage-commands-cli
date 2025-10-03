import chalk from 'chalk';
import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import open from 'open';
import logSymbols from 'log-symbols';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const openCommandsFolder = async () => {
  if (!fs.existsSync(COMMANDS_FILE)) {
    console.log(logSymbols.warning, chalk.yellow('Commands directory does not exist yet. Add a command first to create it.'));
    return;
  }

  try {
    await open(COMMANDS_FILE);
    console.log(logSymbols.success, chalk.green(`Opened the commands directory at: ${COMMANDS_FILE}`));
  } catch (e) {
    console.log(logSymbols.error, chalk.red(`Error opening directory: ${e.message}`));
    console.log(logSymbols.info, chalk.yellow('You may need to open it manually.'));
  }
};

export default openCommandsFolder;
