import { jest } from '@jest/globals';

// Mock dependencies at the top level
jest.unstable_mockModule('open', () => ({
  default: jest.fn(),
}));
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
}));

// Await imports after mocks are defined
const open = (await import('open')).default;
const fs = await import('node:fs');
const { default: openCommandsFolder } = await import('./openCommandsFolder.js');
const path = await import('node:path');
const { homedir } = await import('node:os');
const logSymbols = (await import('log-symbols')).default;

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');

describe('openCommandsFolder', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should open the folder if it exists', async () => {
    fs.existsSync.mockReturnValue(true);
    await openCommandsFolder();

    expect(open).toHaveBeenCalledWith(COMMANDS_FILE);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Opened the commands directory'));
  });

  it('should show a warning if the folder does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    await openCommandsFolder();

    expect(open).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('directory does not exist yet'));
  });

  it('should handle errors when trying to open the directory', async () => {
    const errorMessage = 'Test error';
    fs.existsSync.mockReturnValue(true);
    open.mockRejectedValue(new Error(errorMessage));

    await openCommandsFolder();

    expect(open).toHaveBeenCalledWith(COMMANDS_FILE);
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining(`Error opening directory: ${errorMessage}`));
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.info, expect.stringContaining('You may need to open it manually.'));
  });
});
