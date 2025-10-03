import { jest } from '@jest/globals';
import path from 'node:path';
import { homedir } from 'node:os';

// Mock dependencies
jest.unstable_mockModule('chalk', () => ({
  default: {
    red: jest.fn(msg => msg),
    green: jest.fn(msg => msg),
    yellow: jest.fn(msg => msg),
  },
}));
jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.unstable_mockModule('log-symbols', () => ({
  default: {
    error: '✖',
    success: '✔',
    warning: '⚠',
  },
}));

// Await imports
const inquirer = (await import('inquirer')).default;
const fs = await import('node:fs');
const chalk = (await import('chalk')).default;
const logSymbols = (await import('log-symbols')).default;
const { default: addCommand } = await import('./addCommand.js');

describe('addCommand', () => {
  let consoleLogSpy;
  const GEMINI_DIR = path.join(homedir(), '.gemini');
  const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.clearAllMocks();

    // Default mocks for fs
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.writeFileSync.mockReturnValue(undefined);

    // Default mock for inquirer.prompt
    inquirer.prompt.mockResolvedValue({
      COMMAND_PATH: 'test/mycommand',
      COMMAND_DESCRIPTION: 'A test command',
      COMMAND_PROMPT: 'This is a test prompt.',
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should successfully add a new command', async () => {
    await addCommand();

    const expectedPath = path.join(COMMANDS_FILE, 'test', 'mycommand.toml');
    const expectedContent = `description = "A test command"\nprompt = """\nThis is a test prompt.\n"""`;

    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(COMMANDS_FILE, 'test'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, chalk.green('Successfully added the command: test/mycommand'));
  });

  it('should overwrite an existing command if confirmed', async () => {
    fs.existsSync.mockReturnValueOnce(true); // For the command file itself
    inquirer.prompt.mockResolvedValueOnce({
      COMMAND_PATH: 'test/mycommand',
      COMMAND_DESCRIPTION: 'A test command',
      COMMAND_PROMPT: 'This is a test prompt.',
    }).mockResolvedValueOnce({
      CONFIRM_OVERWRITE: true,
    });

    await addCommand();

    const expectedPath = path.join(COMMANDS_FILE, 'test', 'mycommand.toml');
    const expectedContent = `description = "A test command"
prompt = """
This is a test prompt.
"""`;

    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, chalk.green('Successfully added the command: test/mycommand'));
  });

  it('should not overwrite an existing command if cancelled', async () => {
    fs.existsSync.mockReturnValueOnce(true); // For the command file itself
    inquirer.prompt.mockResolvedValueOnce({
      COMMAND_PATH: 'test/mycommand',
      COMMAND_DESCRIPTION: 'A test command',
      COMMAND_PROMPT: 'This is a test prompt.',
    }).mockResolvedValueOnce({
      CONFIRM_OVERWRITE: false,
    });

    await addCommand();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, chalk.yellow('Overwrite cancelled. Command not added.'));
  });

  it('should handle error during initial prompt', async () => {
    inquirer.prompt.mockRejectedValueOnce(new Error('Prompt error'));

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red('Error during add command prompt: Prompt error'));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle error during overwrite confirmation prompt', async () => {
    fs.existsSync.mockReturnValueOnce(true); // For the command file itself
    inquirer.prompt.mockResolvedValueOnce({
      COMMAND_PATH: 'test/mycommand',
      COMMAND_DESCRIPTION: 'A test command',
      COMMAND_PROMPT: 'This is a test prompt.',
    }).mockRejectedValueOnce(new Error('Overwrite prompt error'));

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red('Error during overwrite confirmation prompt: Overwrite prompt error'));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle error during .gemini directory creation', async () => {
    fs.existsSync.mockReturnValueOnce(false); // .gemini does not exist
    fs.mkdirSync.mockImplementationOnce(() => {
      throw new Error('mkdir .gemini error');
    });

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red('Error creating Gemini directory: mkdir .gemini error'));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle error during command directory creation', async () => {
    // Mock fs.existsSync to ensure GEMINI_DIR exists and fullCommandsPath does not
    fs.existsSync.mockImplementation((p) => {
      if (p === GEMINI_DIR) return true; // GEMINI_DIR exists
      if (p.startsWith(COMMANDS_FILE)) return false; // command subdirectory does not exist
      return false;
    });

    // Mock fs.mkdirSync to throw an error only when creating the command subdirectory
    fs.mkdirSync.mockImplementation((p) => {
      if (p.startsWith(COMMANDS_FILE)) {
        throw new Error('mkdir command error');
      }
      // Allow other mkdirSync calls (e.g., for GEMINI_DIR if it were to be created) to succeed
    });

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red('Error creating command directory: mkdir command error'));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle error during file writing', async () => {
    const expectedFilePath = path.join(COMMANDS_FILE, 'test', 'mycommand.toml');
    fs.existsSync.mockImplementation((p) => {
      if (p === GEMINI_DIR || p === path.join(COMMANDS_FILE, 'test')) return true; // Directories exist
      if (p === expectedFilePath) return false; // The specific file does not exist
      return false;
    });
    fs.mkdirSync.mockReturnValue(undefined); // Ensure mkdirSync doesn't throw an error

    fs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Write file error');
    });

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red('Error writing command file: Write file error'));
  });

  it('should prevent adding a command outside the allowed directory', async () => {
    inquirer.prompt.mockResolvedValueOnce({
      COMMAND_PATH: '../../malicious/command',
      COMMAND_DESCRIPTION: 'A malicious command',
      COMMAND_PROMPT: 'This is a malicious prompt.',
    });

    await addCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, chalk.red(expect.stringContaining('Error: Command path must be inside the allowed directory:')));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should create .gemini directory if it does not exist', async () => {
    const expectedFilePath = path.join(COMMANDS_FILE, 'test', 'mycommand.toml');
    fs.existsSync.mockImplementation((p) => {
      if (p === GEMINI_DIR) return false; // GEMINI_DIR does not exist
      if (p === path.join(COMMANDS_FILE, 'test')) return true; // Command subdirectory exists
      if (p === expectedFilePath) return false; // File itself does not exist
      return false;
    });
    fs.mkdirSync.mockReturnValue(undefined); // Ensure mkdirSync succeeds
    fs.writeFileSync.mockReturnValue(undefined); // Explicitly ensure writeFileSync succeeds

    await addCommand();

    expect(fs.mkdirSync).toHaveBeenCalledWith(GEMINI_DIR);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.any(String));
  });

  it('should not create .gemini directory if it already exists', async () => {
    fs.existsSync.mockImplementation((p) => {
      if (p === GEMINI_DIR) return true;
      return false;
    });

    await addCommand();

    expect(fs.mkdirSync).not.toHaveBeenCalledWith(GEMINI_DIR);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.any(String));
  });
});
