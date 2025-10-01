import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

const backupCommands = () => {
  const backupDir = path.join(GEMINI_DIR, 'commands_backup');
  const tmpBackupDir = path.join(GEMINI_DIR, 'commands_backup_tmp');

  if (!fs.existsSync(COMMANDS_FILE)) {
    console.log(chalk.yellow('No commands directory to backup.'));
    return;
  }

  try {
    // 1. Create new backup in a temporary location for safety.
    fs.cpSync(COMMANDS_FILE, tmpBackupDir, { recursive: true });

    // 2. If old backup exists, remove it.
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }

    // 3. Move new backup into place.
    fs.renameSync(tmpBackupDir, backupDir);

    console.log(chalk.green(`Successfully created backup at: ${backupDir}`));

  } catch (e) {
    console.log(chalk.red(`Error creating backup: ${e.message}`));
    // If any step fails, attempt to clean up the temporary directory.
    if (fs.existsSync(tmpBackupDir)) {
      fs.rmSync(tmpBackupDir, { recursive: true, force: true });
    }
  }
};

export default backupCommands;