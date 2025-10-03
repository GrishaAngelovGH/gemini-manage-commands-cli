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
  lstatSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  rmdirSync: jest.fn(),
}));

// Await imports
const { getCommandNames } = await import('./commandFinder.js');
const inquirer = (await import('inquirer')).default;
const fs = await import('node:fs');
const { default: deleteCommand } = await import('./deleteCommand.js');

describe('deleteCommand', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    // Default mock for fs.existsSync to avoid breaking other tests
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should delete a command after confirmation', async () => {
    const commandToDelete = 'git/commit';
    getCommandNames.mockReturnValue([commandToDelete, 'other/command']);
    inquirer.prompt.mockResolvedValueOnce({ COMMAND_TO_DELETE: commandToDelete })
                     .mockResolvedValueOnce({ CONFIRM_DELETE: true });

    await deleteCommand();

    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('git/commit.toml'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully deleted command'));
  });

  it('should clean up empty directories after deletion', async () => {
    const commandToDelete = 'git/commit';
    getCommandNames.mockReturnValue([commandToDelete]);
    inquirer.prompt.mockResolvedValueOnce({ COMMAND_TO_DELETE: commandToDelete })
                     .mockResolvedValueOnce({ CONFIRM_DELETE: true });
    
    // After unlink, readdir for the parent dir is empty
    fs.readdirSync.mockReturnValue([]);

    await deleteCommand();

    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(fs.rmdirSync).toHaveBeenCalledWith(expect.stringContaining('git'));
  });

  it('should cancel deletion if user does not confirm', async () => {
    const commandToDelete = 'git/commit';
    getCommandNames.mockReturnValue([commandToDelete]);
    inquirer.prompt.mockResolvedValueOnce({ COMMAND_TO_DELETE: commandToDelete })
                     .mockResolvedValueOnce({ CONFIRM_DELETE: false });

    await deleteCommand();

    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Deletion cancelled'));
  });

  it('should return to menu if user selects \'Go Back\'', async () => {
    getCommandNames.mockReturnValue(['git/commit']);
    inquirer.prompt.mockResolvedValueOnce({ COMMAND_TO_DELETE: 'Go Back' });

    await deleteCommand();

    expect(inquirer.prompt).toHaveBeenCalledTimes(1); // Should not ask for confirmation
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Returning to main menu'));
  });

  it('should show a message if no commands exist', async () => {
    getCommandNames.mockReturnValue([]);

    await deleteCommand();

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No commands to delete'));
  });
});
