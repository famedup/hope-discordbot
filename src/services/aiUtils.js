// dev: cashholy (carti) | module: aiUtils

const config = require('../settings');
const { filterMentions } = require('./mentionFilter');
const { saveMessage, getHistory } = require('../database/aiHistory');

const SYSTEM_PROMPT = config.AI_PROMPTS.SYSTEM_PROMPT;
const CASUAL_PROMPT = config.AI_PROMPTS.CASUAL_PROMPT;

const getApiKeys = () => {
    const keys = [];
    if (config.GROQ?.API_KEY) keys.push(config.GROQ.API_KEY);
    if (config.GROQ?.API_KEY_2) keys.push(config.GROQ.API_KEY_2);
    if (config.GROQ?.API_KEY_3) keys.push(config.GROQ.API_KEY_3);
    if (config.GROQ?.API_KEY_4) keys.push(config.GROQ.API_KEY_4);
    return keys.filter(k => k && k.length > 0);
};

const makeApiRequest = async (messages, options = {}) => {
    const apiKeys = getApiKeys();
    
    if (apiKeys.length === 0) {
        throw new Error('No API keys configured');
    }
    
    const model = options.model || 'compound-beta';
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.6;
    
    let lastError = null;
    
    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    content: data.choices?.[0]?.message?.content || 'I couldn\'t generate a response.',
                    data
                };
            }
            
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401 || response.status === 403) {
                console.log(`[AI] API key ${i + 1} failed with auth error, trying next...`);
                lastError = errorData.error?.message || 'Authentication failed';
                continue;
            }
            
            if (response.status === 429) {
                console.log(`[AI] API key ${i + 1} rate limited, trying next...`);
                lastError = 'Rate limited';
                continue;
            }
            
            lastError = errorData.error?.message || `API error: ${response.status}`;
            console.log(`[AI] API key ${i + 1} error: ${lastError}`);
            
        } catch (error) {
            console.log(`[AI] API key ${i + 1} request failed: ${error.message}`);
            lastError = error.message;
            continue;
        }
    }
    
    return {
        success: false,
        error: lastError || 'All API keys failed'
    };
};

const buildMessagesWithHistory = async (userId, channelId, guildId, userMessage, systemPrompt, includeHistory = true) => {
    const messages = [
        { role: 'system', content: systemPrompt }
    ];
    
    if (includeHistory) {
        const history = await getHistory(userId, channelId, guildId);
        
        const recentHistory = history.slice(-10);
        
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }
    }
    
    messages.push({
        role: 'user',
        content: userMessage
    });
    
    return messages;
};

const processAiResponse = (response) => {
    if (!response) return 'I couldn\'t process that request.';
    
    let processed = response;
    
    const mentionCheck = filterMentions(processed);
    if (mentionCheck.filtered) {
        processed = mentionCheck.response;
    }
    
    const modelPatterns = [
        /\b(GPT-?\d*|ChatGPT|OpenAI|Claude|Anthropic|Gemini|Google AI|Meta AI|Llama|Mixtral|Groq|compound-?beta)\b/gi,
        /I('m| am) (a |an )?(GPT|Claude|Gemini|Llama|language model|large language model|LLM)/gi,
        /developed by (OpenAI|Anthropic|Google|Meta)/gi,
        /trained by (OpenAI|Anthropic|Google|Meta)/gi
    ];
    
    for (const pattern of modelPatterns) {
        processed = processed.replace(pattern, (match) => {
            if (new RegExp(config.BOT_NAME, 'i').test(match)) return match;
            return config.BOT_NAME;
        });
    }
    
    return processed;
};

const splitMessage = (content, maxLength = 1950) => {
    if (content.length <= maxLength) {
        return [content];
    }
    
    const chunks = [];
    let remaining = content;
    
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }
        
        let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
        if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
            splitIndex = remaining.lastIndexOf('\n', maxLength);
        }
        if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
            splitIndex = remaining.lastIndexOf('. ', maxLength);
            if (splitIndex !== -1) splitIndex++;
        }
        if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
            splitIndex = remaining.lastIndexOf(' ', maxLength);
        }
        if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
            splitIndex = maxLength;
        }
        
        chunks.push(remaining.substring(0, splitIndex).trim());
        remaining = remaining.substring(splitIndex).trim();
    }
    
    return chunks;
};

const generateAiResponse = async (options) => {
    const {
        userId,
        channelId,
        guildId,
        prompt,
        systemPrompt = SYSTEM_PROMPT,
        includeHistory = true,
        saveToHistory = true,
        model = 'compound-beta',
        maxTokens = 4096
    } = options;
    
    const messages = await buildMessagesWithHistory(
        userId,
        channelId,
        guildId,
        prompt,
        systemPrompt,
        includeHistory
    );
    
    const result = await makeApiRequest(messages, { model, maxTokens });
    
    if (!result.success) {
        return {
            success: false,
            error: result.error
        };
    }
    
    const processedContent = processAiResponse(result.content);
    
    if (saveToHistory && channelId && guildId) {
        try {
            saveMessage(guildId, channelId, userId, 'user', prompt);
            saveMessage(guildId, channelId, userId, 'assistant', processedContent);
        } catch (err) {
            console.error('[AI] Error saving to history:', err.message);
        }
    }
    
    return {
        success: true,
        content: processedContent,
        chunks: splitMessage(processedContent)
    };
};

const hasApiKey = () => {
    return getApiKeys().length > 0;
};

module.exports = {
    SYSTEM_PROMPT,
    CASUAL_PROMPT,
    generateAiResponse,
    splitMessage,
    processAiResponse,
    makeApiRequest,
    hasApiKey,
    getApiKeys
};
