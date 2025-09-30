# Gemini Manage Commands CLI

This is the Gemini Manage Commands CLI, a powerful command-line interface tool designed to help users efficiently manage their custom Gemini commands. It allows users to add, list, delete, backup, restore, export, and import their personalized commands, ensuring a streamlined workflow for their Gemini environment.

## Features

The Gemini Manage Commands CLI provides the following functionalities:

*   **Add New Command**: Create and save new custom commands to the user's Gemini environment.
*   **List All Available Commands**: View a comprehensive list of all saved custom commands, including their descriptions and prompts.
*   **Delete Command**: Remove unwanted custom commands from the user's Gemini environment.
*   **Backup Commands**: Create a backup of all custom commands.
*   **Restore Commands**: Restore custom commands from a previously created backup, with options to merge or overwrite.
*   **Export Commands to JSON**: Export custom commands to a JSON file for sharing or external management.
*   **Import Commands from JSON**: Import custom commands from a JSON file, allowing for easy integration of shared commands.


## Installation

To install the Gemini Manage Commands CLI globally and make it available from any directory, run the following command:

```bash
npm install -g
```

This command installs the CLI tool globally on the user's system, making the `gemini-manage-commands` executable available in their system's PATH. This allows the user to run the command from any directory in their terminal.



## Usage

To use the Gemini Manage Commands CLI, run the main command from the user's terminal:

```bash
gemini-manage-commands
```

This will present the user with an interactive menu of options. Below are details on each functionality:

### Add New Command

This option allows the user to create a new custom command. The user will be prompted to enter:

*   **Command Path**: The hierarchical name for the command (e.g., `git/commit` or `mycommand`).
*   **Command Description**: A brief explanation of what the command does.
*   **Prompt Content**: The actual prompt or instructions that Gemini will use when this command is invoked.

### List All Available Commands

Select this option to display a formatted list of all custom commands currently saved in the user's Gemini environment, including their paths, descriptions, and prompt content.

### Delete Command

Choose this to remove an existing custom command. The user will be presented with a list of their commands to select from, followed by a confirmation prompt.

### Backup Commands

This functionality creates a backup of all custom commands. The backup is stored in the `~/.gemini/commands_backup` directory within the user's Gemini configuration.

### Restore Commands

Use this to restore commands from a backup. The user will have options to:

*   **Restore All Commands**: Merge all commands from the backup with the user's existing commands, overwriting any conflicts.
*   **Restore a Single Command**: Select a specific command from the backup to restore, with options to overwrite or skip if a conflict exists.

### Export Commands to JSON

This allows the user to export all custom commands into a single JSON file. The user will be asked for a filename and a directory to save the export. This is useful for sharing commands or for version control.

### Import Commands from JSON

This option facilitates importing commands from a JSON file. The CLI will first look for `commands_export.json` in the specified directory, but also provides an option to manually enter the path to any other JSON export file. The CLI will then guide the user through selecting the file and handling any potential conflicts with existing commands.

### Exit

Exits the Gemini Manage Commands CLI.
