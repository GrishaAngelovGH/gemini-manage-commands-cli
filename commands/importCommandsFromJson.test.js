import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: jest.fn(),
    Separator: jest.fn(),
  }
}));
jest.unstable_mockModule('node:fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const inquirer = (await import('inquirer')).default;
const fs = await import('node:fs');
const { default: importCommandsFromJson } = await import('./importCommandsFromJson.js');
const logSymbols = (await import('log-symbols')).default;

describe('importCommandsFromJson', () => {
  let consoleLogSpy;
  const mockCommands = [{ name: 'new/cmd', description: 'd', prompt: 'p' }];
  const mockJsonContent = JSON.stringify(mockCommands);

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.clearAllMocks();
    // Mock a file system with one json file
    fs.readdirSync.mockReturnValue(['import.json']);
    fs.readFileSync.mockReturnValue(mockJsonContent);
    fs.existsSync.mockImplementation(p => p.endsWith('.json'));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should import a new command successfully', async () => {
    inquirer.prompt.mockResolvedValue({ SELECTED_FILE: 'import.json' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('new/cmd.toml'),
      expect.any(String)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Imported new command: new/cmd'));
  });

  it('should overwrite an existing command', async () => {
    fs.existsSync.mockReturnValue(true); // Command already exists
    inquirer.prompt.mockResolvedValueOnce({ SELECTED_FILE: 'import.json' })
                     .mockResolvedValueOnce({ CONFLICT_RESOLUTION: 'Overwrite' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Overwrote command: new/cmd'));
  });

  it('should skip an existing command', async () => {
    fs.existsSync.mockReturnValue(true);
    inquirer.prompt.mockResolvedValueOnce({ SELECTED_FILE: 'import.json' })
                     .mockResolvedValueOnce({ CONFLICT_RESOLUTION: 'Skip' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.info, expect.stringContaining('Skipped command: new/cmd'));
  });

  it('should rename a command', async () => {
    fs.existsSync.mockReturnValue(true);
    inquirer.prompt.mockResolvedValueOnce({ SELECTED_FILE: 'import.json' })
                     .mockResolvedValueOnce({ CONFLICT_RESOLUTION: 'Rename' })
                     .mockResolvedValueOnce({ NEW_NAME: 'renamed/cmd' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('renamed/cmd.toml'),
      expect.any(String)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.success, expect.stringContaining('Imported command as: renamed/cmd'));
  });

  it('should block path traversal on initial import', async () => {
    const maliciousCommands = [{ name: '../../something', description: 'd', prompt: 'p' }];
    fs.readFileSync.mockReturnValue(JSON.stringify(maliciousCommands));
    inquirer.prompt.mockResolvedValue({ SELECTED_FILE: 'import.json' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining('malicious path and will be skipped'));
  });

  it('should block path traversal on rename', async () => {
    fs.existsSync.mockReturnValue(true);
    inquirer.prompt.mockResolvedValueOnce({ SELECTED_FILE: 'import.json' })
                     .mockResolvedValueOnce({ CONFLICT_RESOLUTION: 'Rename' })
                     .mockResolvedValueOnce({ NEW_NAME: '../../something' });

    await importCommandsFromJson();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.error, expect.stringContaining('malicious path. Aborting'));
  });

  it('should show a message if no JSON files are found', async () => {
    fs.readdirSync.mockReturnValue([]);
    await importCommandsFromJson();
    expect(consoleLogSpy).toHaveBeenCalledWith(logSymbols.warning, expect.stringContaining('No JSON files found'));
  });
});
