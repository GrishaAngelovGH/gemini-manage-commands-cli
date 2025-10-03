import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('./commandFinder.js', () => ({
  getCommandNames: jest.fn(),
}));
jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: jest.fn(),
    Separator: jest.fn(),
  }
}));
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Await imports
const { getCommandNames } = await import('./commandFinder.js');
const inquirer = (await import('inquirer')).default;
const fs = await import('node:fs');
const { default: restoreCommands } = await import('./restoreCommands.js');
const logSymbols = (await import('log-symbols')).default;

describe('restoreCommands', () => {
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.clearAllMocks();
    // Default mock for fs.existsSync to assume backup dir exists
    fs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should show a message if no backup is found', async () => {
    fs.existsSync.mockReturnValue(false);
    await restoreCommands();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No backup found'));
  });

  describe('All commands', () => {
    it('should merge all commands from backup', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'All commands (merge with existing)' })
        .mockResolvedValueOnce({ CONFIRM_RESTORE: true });

      fs.readdirSync.mockReturnValue([
        { name: 'test.toml', isDirectory: () => false },
      ]);

      await restoreCommands();

      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Successfully merged all commands'));
    });

    it('should handle errors when readdirSync fails during all commands merge', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'All commands (merge with existing)' })
        .mockResolvedValueOnce({ CONFIRM_RESTORE: true });

      const errorMessage = 'Permission denied';
      fs.readdirSync.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await restoreCommands();

      expect(consoleErrorSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining(`Error reading backup directory`));
      expect(consoleErrorSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining(errorMessage));
    });

    it('should block path traversal when merging all commands', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'All commands (merge with existing)' })
        .mockResolvedValueOnce({ CONFIRM_RESTORE: true });

      fs.readdirSync.mockReturnValue([
        { name: '../../something.toml', isDirectory: () => false },
      ]);

      await restoreCommands();

      expect(fs.copyFileSync).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining('Malicious path detected'));
    });
  });

  describe('Single command', () => {
    const commandToRestore = 'my/command';

    it('should restore a single command', async () => {
      getCommandNames.mockReturnValue([commandToRestore]);
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'A single command (merge)' })
        .mockResolvedValueOnce({ COMMAND_TO_RESTORE: commandToRestore });

      // Mock that the active command does not exist, but the backup dir does
      fs.existsSync.mockImplementation(p => !p.includes(commandToRestore));

      await restoreCommands();

      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Successfully restored command'));
    });

    it('should overwrite an existing single command', async () => {
      getCommandNames.mockReturnValue([commandToRestore]);
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'A single command (merge)' })
        .mockResolvedValueOnce({ COMMAND_TO_RESTORE: commandToRestore })
        .mockResolvedValueOnce({ CONFLICT_RESOLUTION: 'Overwrite' });

      // Mock that the active command DOES exist
      fs.existsSync.mockReturnValue(true);

      await restoreCommands();

      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Successfully restored and overwrote command'));
    });

    it('should block path traversal for a single command', async () => {
      const maliciousCommand = '../../something';
      getCommandNames.mockReturnValue([maliciousCommand]);
      inquirer.prompt
        .mockResolvedValueOnce({ RESTORE_SCOPE: 'A single command (merge)' })
        .mockResolvedValueOnce({ COMMAND_TO_RESTORE: maliciousCommand });

      await restoreCommands();

      expect(fs.copyFileSync).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining('malicious path. Restore aborted'));
    });
  });
});
