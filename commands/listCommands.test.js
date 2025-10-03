import { jest } from '@jest/globals';

// Mock dependencies
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
const { default: listCommands } = await import('./listCommands.js');
const logSymbols = (await import('log-symbols')).default;

describe('listCommands', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should list all available commands', () => {
    const mockCommands = [
      {
        name: 'test1',
        description: 'This is test 1',
        prompt: 'Prompt for test 1',
      },
      {
        name: 'test2',
        description: 'This is test 2',
        prompt: 'Prompt for test 2',
      },
    ];
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue(mockCommands);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.info, expect.stringContaining('Available commands:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: test1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Description: This is test 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Prompt:Prompt for test 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: test2'));
  });

  it('should show a message when no commands are found', () => {
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
    getParsedCommands.mockReturnValue([]);

    listCommands();

    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No commands found.'));
  });

  it('should show a message when the commands directory does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    listCommands();

    expect(getParsedCommands).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No commands found.'));
  });
});
