# Gemini Add Commands CLI

This is a CLI tool to create and write to the `~/.gemini/commands` the newly created custom commands.

## Installation

To install the dependencies, run the following command from the project's root directory:

```bash
npm install
```

## Development

To set up the project for local development, run the following command from the project's root directory. This will create a symbolic link to the package and make the `gemini-add-command` command available globally on your system.

```bash
npm link
```

The `npm link` command creates a symbolic link (a shortcut) from the user's system's global `node_modules` directory to the project directory. The global `node_modules` directory is typically located at:

*   **Linux/macOS:** `/usr/local/lib/node_modules/`
*   **Windows:** `%APPDATA%\npm\node_modules`

It also creates a symbolic link from the user's system's binary location to the executable script (`index.js`).

This allows the user to run command (`gemini-add-command`) from any directory on system and have it execute the code in the project directory. It's a way to work on the package locally as if it were installed globally from the npm registry.

## Usage

To use the CLI tool, you can run the following command from anywhere on your system and follow the prompts:

```bash
gemini-add-command
```
