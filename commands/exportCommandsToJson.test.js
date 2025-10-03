import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('./commandFinder.js', () => ({
  getParsedCommands: jest.fn(),
}));
jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: jest.fn(),
  }
}));
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Await imports
const { getParsedCommands } = await import('./commandFinder.js');
const inquirer = (await import('inquirer')).default;
const fs = await import('node:fs');
const { default: exportCommandsToJson } = await import('./exportCommandsToJson.js');
const logSymbols = (await import('log-symbols')).default;

describe('exportCommandsToJson', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const mockCommands = [{ name: 'test', description: 'd', prompt: 'p' }];

  it('should export commands to a specified JSON file', async () => {
    getParsedCommands.mockReturnValue(mockCommands);
    inquirer.prompt.mockResolvedValue({ FILENAME: 'my_commands.json' });

    await exportCommandsToJson();

    const expectedFilePath = expect.stringMatching(/my_commands\.json$/);
    const expectedFileContent = JSON.stringify(mockCommands, null, 2);

    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, expectedFileContent);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Successfully exported'));
  });

  it('should add .json extension if not provided', async () => {
    getParsedCommands.mockReturnValue(mockCommands);
    inquirer.prompt.mockResolvedValue({ FILENAME: 'my_commands' });

    await exportCommandsToJson();

    const expectedFilePath = expect.stringMatching(/my_commands\.json$/);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, expect.any(String));
  });

  it('should show a message if no commands are found', async () => {
    getParsedCommands.mockReturnValue([]);

    await exportCommandsToJson();

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No commands found to export'));
  });

  it('should block path traversal attempts', async () => {
    getParsedCommands.mockReturnValue(mockCommands);
    inquirer.prompt.mockResolvedValue({ FILENAME: '../../malicious.json' });

    await exportCommandsToJson();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining('Export path is outside the current directory'));
  });
});
