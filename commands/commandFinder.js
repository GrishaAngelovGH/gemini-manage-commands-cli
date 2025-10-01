const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

const getCommandNames = (baseDir, currentPath = '', allNames = []) => {
  if (!fs.existsSync(baseDir) || !fs.lstatSync(baseDir).isDirectory()) {
    return allNames;
  }

  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch (e) {
    console.error(`Error reading directory ${baseDir}: ${e.message}`);
    return allNames;
  }

  entries.forEach(entry => {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      getCommandNames(fullPath, `${currentPath}${entry.name}/`, allNames);
    } else if (entry.name.endsWith('.toml')) {
      const commandName = entry.name.replace('.toml', '');
      allNames.push(`${currentPath}${commandName}`);
    }
  });
  return allNames;
};

const getParsedCommands = (baseDir, currentPath = '', allCommands = []) => {
  if (!fs.existsSync(baseDir) || !fs.lstatSync(baseDir).isDirectory()) {
    return allCommands;
  }

  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch (e) {
    console.error(`Error reading directory ${baseDir}: ${e.message}`);
    return allCommands;
  }

  entries.forEach(entry => {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      getParsedCommands(fullPath, `${currentPath}${entry.name}/`, allCommands);
    } else if (entry.name.endsWith('.toml')) {
      const commandName = entry.name.replace('.toml', '');
      let commandContent;
      try {
        commandContent = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
        console.error(`Error reading file ${fullPath}: ${e.message}`);
        return; // Skip this file if it can't be read
      }
      try {
        const parsedCommand = toml.parse(commandContent);
        allCommands.push({
          name: `${currentPath}${commandName}`,
          description: parsedCommand.description || '',
          prompt: (parsedCommand.prompt || '').trim(),
        });
      } catch (e) {
        console.error(`Error parsing ${fullPath}: ${e.message}`);
      }
    }
  });
  return allCommands;
};

module.exports = {
  getCommandNames,
  getParsedCommands,
};