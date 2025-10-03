import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  cpSync: jest.fn(),
  rmSync: jest.fn(),
  renameSync: jest.fn(),
}));

// Await imports
const fs = await import('node:fs');
const path = await import('node:path');
const { homedir } = await import('node:os');
const { default: backupCommands } = await import('./backupCommands.js');

const GEMINI_DIR = path.join(homedir(), '.gemini');
const COMMANDS_FILE = path.join(GEMINI_DIR, 'commands');
const BACKUP_DIR = path.join(GEMINI_DIR, 'commands_backup');
const TMP_BACKUP_DIR = path.join(GEMINI_DIR, 'commands_backup_tmp');

describe('backupCommands', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should create a backup and remove the old one if it exists', () => {
    // Arrange: Source exists, old backup exists
    fs.existsSync.mockImplementation(p => p === COMMANDS_FILE || p === BACKUP_DIR);

    // Act
    backupCommands();

    // Assert
    expect(fs.cpSync).toHaveBeenCalledWith(COMMANDS_FILE, TMP_BACKUP_DIR, { recursive: true });
    expect(fs.rmSync).toHaveBeenCalledWith(BACKUP_DIR, { recursive: true, force: true });
    expect(fs.renameSync).toHaveBeenCalledWith(TMP_BACKUP_DIR, BACKUP_DIR);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully created backup'));
  });

  it('should create a backup when no old backup exists', () => {
    // Arrange: Source exists, old backup does not
    fs.existsSync.mockImplementation(p => p === COMMANDS_FILE);

    // Act
    backupCommands();

    // Assert
    expect(fs.cpSync).toHaveBeenCalledWith(COMMANDS_FILE, TMP_BACKUP_DIR, { recursive: true });
    expect(fs.rmSync).not.toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalledWith(TMP_BACKUP_DIR, BACKUP_DIR);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully created backup'));
  });

  it('should show a message if no commands directory exists', () => {
    // Arrange: Source does not exist
    fs.existsSync.mockReturnValue(false);

    // Act
    backupCommands();

    // Assert
    expect(fs.cpSync).not.toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No commands directory to backup'));
  });

  it('should handle errors during backup and clean up temp files', () => {
    const errorMessage = 'Copy failed';
    // Arrange: Source exists, cpSync will fail
    fs.existsSync.mockImplementation(p => p === COMMANDS_FILE || p === TMP_BACKUP_DIR);
    fs.cpSync.mockImplementation(() => { throw new Error(errorMessage); });

    // Act
    backupCommands();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Error creating backup: ${errorMessage}`));
    // Check that cleanup was attempted
    expect(fs.rmSync).toHaveBeenCalledWith(TMP_BACKUP_DIR, { recursive: true, force: true });
  });
});
