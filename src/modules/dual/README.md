# Hybrid Commands

This directory contains hybrid commands that work with both **slash commands** and **prefix commands**.

## Todo Command Structure

### Database Model
- **Location**: `database/schemas/Todo.js`
- **Table**: `todos`
- **Fields**:
  - `id` - Auto-incrementing primary key
  - `userId` - Discord User ID
  - `guildId` - Discord Guild ID
  - `task` - Task description (max 500 characters)
  - `completed` - Boolean flag for task completion
  - `createdAt` - Timestamp
  - `updatedAt` - Timestamp

### Command Files
```
dual/
└── todo/
    ├── todo.js              # Main command (handles both slash & prefix)
    └── subcommands/
        ├── add.js           # Add a task
        ├── list.js          # List all tasks with pagination
        ├── remove.js        # Remove a task by ID
        └── clear.js         # Clear all tasks
```

## Usage

### Slash Commands
```
/todo add task: Complete project documentation
/todo list
/todo remove id: 5
/todo clear
```

### Prefix Commands
```
!todo add Complete project documentation
!todo list
!todo remove 5
!todo clear
```

## Design Features

### Components v2 Structure
All commands use Discord.js Components v2 with:
- `ContainerBuilder` - Main container wrapper
- `TextDisplayBuilder` - Text content display
- `SeparatorBuilder` - Visual dividers
- `ActionRowBuilder` - Button rows for pagination
- `ButtonBuilder` - Navigation buttons

### Consistent Design Pattern
Matching the Python bot's design but using JavaScript Components v2:
- **Headers**: `# Title` format
- **Separators**: Small spacing with dividers
- **List Items**: Using `-` instead of custom emoji
- **Error Messages**: Clear header + separator + helpful explanation
- **Success Messages**: Simple confirmation with ✅ emoji

### Pagination
The list command uses the **`utils/pagination.js`** utility with:
- 6 items per page
- 4 navigation buttons (home, back, next, last)
- UUID-based session management
- Auto-disabled buttons when not applicable
- Dynamic page fetching from database
- User-locked interactions
- 5-minute timeout with graceful cleanup

### Key Improvements
1. **Fixed task numbering** - Uses actual database ID instead of custom numbering
2. **Simplified bullet points** - Uses `-` instead of custom emoji for better compatibility
3. **Proper database integration** - Uses Sequelize models with proper caching
4. **Hybrid support** - Works seamlessly with both command types

## Loading System

Hybrid commands are automatically loaded by `index.js`:
- Scans `hybrid/` directory for subdirectories
- Loads main command file from each subdirectory
- Registers both slash and prefix command versions
- Handles subcommands dynamically

## Error Handling

All subcommands include:
- Input validation with helpful error messages
- Database error handling with user-friendly responses
- User permission checks for interactive components
- Proper try-catch blocks around all async operations

---

*Developed by Blame*
