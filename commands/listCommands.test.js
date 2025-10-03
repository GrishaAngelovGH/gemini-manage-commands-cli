
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('chalk', () => ({
  default: {
    yellow: jest.fn(msg => msg),
    green: jest.fn(msg => msg),
    cyan: jest.fn(msg => msg),
    magenta: jest.fn(msg => msg),
    gray: jest.fn(msg => msg),
  },
}));
jest.unstable_mockModule('./commandFinder.js', () => ({
  getParsedCommands: jest.fn(),
}));
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
}));

// Await imports
const { getParsedCommands } = await import('./commandFinder.js');
const fs = await import('node:fs');
const chalk = (await import('chalk')).default;
const { default: listCommands } = await import('./listCommands.js');
const logSymbols = (await import('log-symbols')).default;

describe('listCommands', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should show a warning if no commands directory exists', () => {
    fs.existsSync.mockReturnValue(false);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No commands found.'));
    expect(getParsedCommands).not.toHaveBeenCalled();
  });

  it('should show a warning if commands directory exists but is empty', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.info, expect.stringContaining('Available commands:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No commands found.'));
  });

  it('should list commands with name, description, and prompt', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([
      { name: 'test/command1', description: 'Description 1', prompt: 'Prompt 1' },
      { name: 'command2', description: 'Description 2', prompt: 'Prompt 2' },
    ]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.info, expect.stringContaining('Available commands:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('\n  Command: test/command1\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.cyan('  Description:\n  Description 1\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.magenta('  Prompt:\nPrompt 1\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('\n  Command: command2\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.cyan('  Description:\n  Description 2\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.magenta('  Prompt:\nPrompt 2\n'));
  });

  it('should list commands with only name', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([
      { name: 'command3' },
    ]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: command3'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Description:'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Prompt:'));
  });

  it('should list commands with name and description', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([
      { name: 'command4', description: 'Description 4' },
    ]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('\n  Command: command4\n'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.cyan('  Description:\n  Description 4\n'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Prompt:'));
  });

  it('should list commands with name and prompt', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([
      { name: 'command5', prompt: 'Prompt 5' },
    ]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('\n  Command: command5\n'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Description:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.magenta('  Prompt:\nPrompt 5\n'));
  });
});
