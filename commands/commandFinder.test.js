import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.unstable_mockModule('@iarna/toml', () => ({
  parse: jest.fn(),
}));

// Await imports
const fs = await import('node:fs');
const toml = await import('@iarna/toml');
const { getCommandNames, getParsedCommands } = await import('./commandFinder.js');

const mockFileSystem = {
  '/commands': { type: 'dir', entries: ['git', 'test.toml', 'empty_dir'] },
  '/commands/git': { type: 'dir', entries: ['commit.toml', 'push.toml'] },
  '/commands/empty_dir': { type: 'dir', entries: [] },
  '/commands/test.toml': { type: 'file', content: `description = "Test desc"\nprompt = "Test prompt"` },
  '/commands/git/commit.toml': { type: 'file', content: 'description = "Commit desc"' },
  '/commands/git/push.toml': { type: 'file', content: 'prompt = "Push prompt"' },
};

describe('commandFinder', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();

    fs.existsSync.mockImplementation(p => mockFileSystem[p] !== undefined);
    fs.lstatSync.mockImplementation(p => ({
      isDirectory: () => mockFileSystem[p]?.type === 'dir',
    }));
    fs.readdirSync.mockImplementation(p => {
      const entryNames = mockFileSystem[p]?.entries || [];
      return entryNames.map(name => ({
          name,
          isDirectory: () => mockFileSystem[`${p}/${name}`]?.type === 'dir',
      }));
    });
    fs.readFileSync.mockImplementation(p => mockFileSystem[p]?.content || '');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getCommandNames', () => {
    it('should return all command names recursively', () => {
      const names = getCommandNames('/commands');
      expect(names).toEqual(expect.arrayContaining(['git/commit', 'git/push', 'test']));
      expect(names.length).toBe(3);
    });

    it('should return an empty array if base directory does not exist', () => {
      const names = getCommandNames('/nonexistent');
      expect(names).toEqual([]);
    });
  });

  describe('getParsedCommands', () => {
    it('should return parsed commands recursively', () => {
      toml.parse.mockImplementation(content => {
        if (content.includes('Test desc')) return { description: 'Test desc', prompt: 'Test prompt' };
        if (content.includes('Commit desc')) return { description: 'Commit desc' };
        if (content.includes('Push prompt')) return { prompt: 'Push prompt' };
        return {};
      });

      const commands = getParsedCommands('/commands');

      expect(commands).toEqual(expect.arrayContaining([
        { name: 'test', description: 'Test desc', prompt: 'Test prompt' },
        { name: 'git/commit', description: 'Commit desc', prompt: '' },
        { name: 'git/push', description: '', prompt: 'Push prompt' },
      ]));
      expect(commands.length).toBe(3);
    });

    it('should handle read errors gracefully', () => {
      const readError = new Error('Read failed');
      fs.readFileSync.mockImplementation(p => {
        if (p.endsWith('test.toml')) throw readError;
        return mockFileSystem[p]?.content;
      });

      getParsedCommands('/commands');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading file'));
    });

    it('should handle parse errors gracefully', () => {
      const parseError = new Error('Parse failed');
      toml.parse.mockImplementation(() => { throw parseError; });

      getParsedCommands('/commands');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing'));
    });
  });
});
