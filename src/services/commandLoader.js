/*
 * Developed by cashholy (carti)
 * File: services/commandLoader.js
 */

const fs = require('fs');
const path = require('path');
const { printLoading, printSuccess, printInfo, printWarn: printWarning, printError } = require('./consoleLogger');

function getAllJsFiles(dir, skipSubcommandsDirs = false) {
    const files = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (skipSubcommandsDirs && entry.name === 'subcommands') {
                continue;
            }
            
            if (entry.name === 'music') {
                continue;
            }
            files.push(...getAllJsFiles(fullPath, skipSubcommandsDirs));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

function loadSlashCommands(client, commandsPath) {

    printLoading('Command modules');

    const files = getAllJsFiles(commandsPath, true);
    let loaded = 0;
    let errors = [];

    for (const filePath of files) {
        try {
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                loaded++;
            }
        } catch (error) {
            const relativePath = path.relative(commandsPath, filePath);
            errors.push(`${relativePath}: ${error.message}`);
        }
    }

    printSuccess(`Command modules loaded (${loaded} commands)`);

    if (errors.length > 0) {
        printWarning(`Failed to load ${errors.length} command files`);
        errors.forEach(err => printError(err));
    }

    return { loaded, errors };
}

function loadPrefixCommands(client, pCommandsPath) {

    printLoading('Prefix command modules');

    const files = getAllJsFiles(pCommandsPath, false);
    let loaded = 0;
    let skipped = 0;
    let errors = [];

    for (const filePath of files) {
        const relativePath = path.relative(pCommandsPath, filePath);
        const pathParts = relativePath.split(path.sep);

        if (pathParts.length > 2) {
            continue;
        }

        if (pathParts.length === 2) {
            const [dirName, fileName] = pathParts;
            const fileNameWithoutExt = fileName.replace('.js', '');
            const mainCommandPath = path.join(pCommandsPath, dirName, `${dirName}.js`);

            if (fs.existsSync(mainCommandPath) && fileNameWithoutExt !== dirName) {
                continue;
            }
        }

        try {
            const command = require(filePath);

            if ('name' in command && 'execute' in command) {
                client.prefixCommands.set(command.name, command);

                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => {
                        client.prefixCommands.set(alias, command);
                    });
                }
                loaded++;
            } else {
                skipped++;
            }
        } catch (error) {
            errors.push(`${relativePath}: ${error.message}`);
        }
    }

    printSuccess(`Prefix command modules loaded (${loaded} commands)`);

    if (skipped > 0) {
        printInfo(`Skipped ${skipped} files (missing name or execute)`);
    }

    if (errors.length > 0) {
        printWarning(`Failed to load ${errors.length} prefix command files`);
        errors.forEach(err => printError(err));
    }

    return { loaded, skipped, errors };
}

function loadHybridCommands(client, hybridPath) {
    printLoading('Hybrid command modules');

    if (!fs.existsSync(hybridPath)) {
        printInfo('No hybrid directory found, skipping hybrid command loading');
        return { loaded: 0, errors: [] };
    }

    const dirs = fs.readdirSync(hybridPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory());

    let loaded = 0;
    let errors = [];

    for (const dir of dirs) {
        const commandPath = path.join(hybridPath, dir.name, `${dir.name}.js`);

        if (!fs.existsSync(commandPath)) {
            continue;
        }

        try {
            const command = require(commandPath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                loaded++;
            }

            if ('name' in command && 'execute' in command) {
                client.prefixCommands.set(command.name, command);

                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => {
                        client.prefixCommands.set(alias, command);
                    });
                }
            }
        } catch (error) {
            errors.push(`${dir.name}/${dir.name}.js: ${error.message}`);
        }
    }

    printSuccess(`Hybrid command modules loaded (${loaded} commands)`);

    if (errors.length > 0) {
        printWarning(`Failed to load ${errors.length} hybrid command files`);
        errors.forEach(err => printError(err));
    }

    return { loaded, errors };
}

function clearCommandCache(basePath) {
    Object.keys(require.cache).forEach(key => {
        const modules = `${basePath}${path.sep}modules${path.sep}`;
        if (key.includes(`${modules}interactions${path.sep}`) ||
            key.includes(`${modules}text${path.sep}`) ||
            key.includes(`${modules}dual${path.sep}`)) {
            delete require.cache[key];
        }
    });
}

function reloadAllCommands(client, basePath) {
    client.commands.clear();
    client.prefixCommands.clear();

    clearCommandCache(basePath);

    const commandsPath = path.join(basePath, 'modules', 'interactions');
    const pCommandsPath = path.join(basePath, 'modules', 'text');
    const hybridPath = path.join(basePath, 'modules', 'dual');

    const slashResult = loadSlashCommands(client, commandsPath);
    const prefixResult = loadPrefixCommands(client, pCommandsPath);
    const hybridResult = loadHybridCommands(client, hybridPath);

    return {
        success: true,
        message: `Reloaded ${slashResult.loaded} slash commands, ${prefixResult.loaded} prefix commands, and ${hybridResult.loaded} hybrid commands`,
        slash: slashResult,
        prefix: prefixResult,
        hybrid: hybridResult
    };
}

module.exports = {
    getAllJsFiles,
    loadSlashCommands,
    loadPrefixCommands,
    loadHybridCommands,
    clearCommandCache,
    reloadAllCommands,
    printLoading,
    printSuccess,
    printInfo,
    printWarning
};
