/** @author cashholy (carti) */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const config = require('../../../settings');
const { createPaginationSession } = require('../../../services/pagination');
const util = require('util');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_PER_PAGE = 1500;

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

async function fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    json: () => {
                        try { return JSON.parse(data); }
                        catch { return null; }
                    }
                });
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

function execShell(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
        exec(command, { timeout, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error && !stdout && !stderr) {
                reject(error);
            } else {
                resolve({ stdout, stderr, error });
            }
        });
    });
}

function formatOutput(output, type = 'js') {
    if (output === undefined) return 'undefined';
    if (output === null) return 'null';
    
    if (typeof output === 'object') {
        try {
            return util.inspect(output, {
                depth: 3,
                maxArrayLength: 50,
                maxStringLength: 1000,
                colors: false,
                compact: false
            });
        } catch {
            return String(output);
        }
    }
    
    return String(output);
}

function cleanOutput(text) {
    const tokenPattern = /[\w-]{24}\.[\w-]{6}\.[\w-]{27,}/g;
    const secretPatterns = [
        /(?:token|password|secret|key|auth|api[_-]?key)[\s]*[=:]["']?[\w-]+["']?/gi,
        /Bearer\s+[\w-]+/gi
    ];
    
    let cleaned = text.replace(tokenPattern, '[REDACTED_TOKEN]');
    secretPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '[REDACTED]');
    });
    
    const sensitiveValues = [
        config.BOT_TOKEN,
        config.SPOTIFY?.CLIENT_SECRET,
        config.GENIUS?.API_KEY,
        config.CLOUDFLARE?.API_TOKEN,
        config.SERPAPI?.API_KEY,
        config.GROQ?.API_KEY,
        config.GROQ?.API_KEY_2,
        config.GROQ?.API_KEY_3,
        config.GROQ?.API_KEY_4,
        config.GROQ?.API_KEY_5,
        config.GROQ?.API_KEY_6,
        config.OPENROUTER?.API_KEY
    ].filter(v => v && v.length > 10);
    
    for (const secret of sensitiveValues) {
        if (cleaned.includes(secret)) {
            cleaned = cleaned.split(secret).join('[REDACTED]');
        }
    }
    
    const strippedOutput = cleaned.replace(/[^a-zA-Z0-9]/g, '');
    for (const secret of sensitiveValues) {
        if (strippedOutput.includes(secret)) {
            return '[REDACTED - Contains sensitive data]';
        }
    }
    
    return cleaned;
}

function splitOutput(output, maxLength = OUTPUT_PER_PAGE) {
    const pages = [];
    let remaining = output;
    
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            pages.push(remaining);
            break;
        }
        
        let splitIndex = remaining.lastIndexOf('\n', maxLength);
        if (splitIndex === -1 || splitIndex < maxLength / 2) {
            splitIndex = maxLength;
        }
        
        pages.push(remaining.substring(0, splitIndex));
        remaining = remaining.substring(splitIndex).trimStart();
    }
    
    return pages;
}

async function runCode(code, context, isAsync) {
    const keys = Object.keys(context);
    const vals = Object.values(context);

    if (isAsync) {
        
        try {
            const fn = new AsyncFunction(...keys, `return (${code})`);
            return await fn(...vals);
        } catch (exprErr) {
            if (exprErr instanceof SyntaxError) {
                const fn = new AsyncFunction(...keys, code);
                return await fn(...vals);
            }
            throw exprErr;
        }
    } else {
        
        try {
            const fn = new Function(...keys, `return (${code})`);
            const result = fn(...vals);
            if (result instanceof Promise) return await result;
            return result;
        } catch (exprErr) {
            if (exprErr instanceof SyntaxError) {
                const fn = new Function(...keys, code);
                const result = fn(...vals);
                if (result instanceof Promise) return await result;
                return result;
            }
            throw exprErr;
        }
    }
}

module.exports = {
    name: 'eval',
    description: 'Execute JavaScript code with advanced features',
    aliases: ['ev', 'evaluate', 'run', 'exec'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) {
            return;
        }

        if (!args.length) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Eval**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> Usage: \`${config.PREFIX} eval <code>\`\n` +
                        `> Flags\n` +
                        `> - \`--silent\` / \`-s\` — No output\n` +
                        `> - \`--async\` / \`-a\` — Force async\n` +
                        `> - \`--shell\` / \`-sh\` — Shell command\n` +
                        `> - \`--depth=N\` — Inspect depth`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let code = args.join(' ');
        
        const flags = {
            silent: false,
            async: false,
            shell: false,
            depth: 3
        };

        
        const codeBlockMatch = code.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
            code = codeBlockMatch[1].trim();
        }

        
        if (/(?:^|\s)--silent(?:\s|$)/.test(code) || /(?:^|\s)-s(?:\s|$)/.test(code)) {
            flags.silent = true;
            code = code.replace(/(?:^|\s)--silent(?:\s|$)/g, ' ').replace(/(?:^|\s)-s(?:\s|$)/g, ' ').trim();
        }
        if (/(?:^|\s)--async(?:\s|$)/.test(code) || /(?:^|\s)-a(?:\s|$)/.test(code)) {
            flags.async = true;
            code = code.replace(/(?:^|\s)--async(?:\s|$)/g, ' ').replace(/(?:^|\s)-a(?:\s|$)/g, ' ').trim();
        }
        if (/(?:^|\s)--shell(?:\s|$)/.test(code) || /(?:^|\s)-sh(?:\s|$)/.test(code)) {
            flags.shell = true;
            code = code.replace(/(?:^|\s)--shell(?:\s|$)/g, ' ').replace(/(?:^|\s)-sh(?:\s|$)/g, ' ').trim();
        }
        
        const depthMatch = code.match(/--depth=(\d+)/);
        if (depthMatch) {
            flags.depth = parseInt(depthMatch[1], 10);
            code = code.replace(/--depth=\d+/g, '').trim();
        }

        code = code.trim();

        const startTime = process.hrtime.bigint();
        let result;
        let error = null;
        let outputType = 'Output';
        const isAsync = flags.async || code.includes('await');

        try {
            if (flags.shell) {
                outputType = 'Shell';
                const { stdout, stderr, error: execError } = await execShell(code);
                if (execError && !stdout && !stderr) {
                    throw execError;
                }
                result = stdout || stderr || 'Command executed with no output.';
                if (stderr && stdout) {
                    result = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
                }
            } else {
                const client = message.client;
                const msg = message;
                const guild = message.guild;
                const channel = message.channel;
                const author = message.author;
                const member = message.member;
                const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                const fetch = fetchUrl;
                const shell = execShell;

                const safeConfig = {
                    CLIENT_ID: config.CLIENT_ID,
                    OWNER_ID: config.OWNER_ID,
                    PREFIX: config.PREFIX,
                    MUSIC: config.MUSIC
                };

                const context = {
                    client,
                    message,
                    msg,
                    guild,
                    channel,
                    author,
                    member,
                    user: author,
                    me: guild?.members?.me,
                    voice: member?.voice,
                    send: (content) => channel.send(content),
                    reply: (content) => message.reply(content),
                    config: safeConfig,
                    sleep,
                    fetch,
                    shell,
                    require,
                    console,
                    process,
                    Buffer,
                    setTimeout,
                    setInterval,
                    clearTimeout,
                    clearInterval,
                    Promise,
                    Date,
                    Math,
                    JSON,
                    Object,
                    Array,
                    String,
                    Number,
                    Boolean,
                    RegExp,
                    Error,
                    Map,
                    Set,
                    WeakMap,
                    WeakSet,
                    Symbol,
                    Proxy,
                    Reflect,
                    fs,
                    path,
                    util
                };

                outputType = isAsync ? 'Async Output' : 'Output';
                result = await runCode(code, context, isAsync);
            }
        } catch (e) {
            error = e;
            outputType = 'Error';
        }

        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1_000_000;

        if (flags.silent) {
            if (error) {
                return message.react('❌').catch(() => {});
            }
            return message.react('✅').catch(() => {});
        }

        let output;
        if (error) {
            output = `${error.name}: ${error.message}`;
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
                output = stackLines;
            }
        } else {
            output = formatOutput(result);
        }

        output = cleanOutput(output);

        const outputPages = splitOutput(output);
        const totalPages = outputPages.length;

        const statusText = error ? 'Error' : 'Success';
        const langType = flags.shell ? 'bash' : 'js';
        const inputChars = code.length;
        const outputChars = output.length;
        const resultType = error ? error.name : typeof result;

        if (totalPages === 1) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Eval**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Input** (${inputChars} chars)\n\`\`\`${langType}\n${code}\n\`\`\``)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Output** (${outputChars} chars)\n\`\`\`${langType}\n${outputPages[0]}\n\`\`\``)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${statusText} · ${executionTime.toFixed(0)}ms · Type: \`${resultType}\` | ${config.BOT_NAME}`)
                );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const pages = outputPages.map((pageContent, index) => ({
            content: pageContent,
            pageNum: index + 1
        }));

        const renderPage = (pageIndex, pageData, state) => {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Eval**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Input** (${inputChars} chars)\n\`\`\`${langType}\n${code}\n\`\`\``)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Output** (${outputChars} chars)\n\`\`\`${langType}\n${pageData.content}\n\`\`\``)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Page ${pageData.pageNum}/${totalPages} · ${statusText} · ${executionTime.toFixed(0)}ms · Type: \`${resultType}\` | ${config.BOT_NAME}`)
                );

            return container;
        };

        const pagination = createPaginationSession({
            interactionOrMessage: message,
            pages,
            renderPage,
            userId: message.author.id,
            initialPage: 0,
            timeout: 300000
        });

        await pagination.renderInitial();
    }
};
