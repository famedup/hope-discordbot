//
//  Made with care by cashholy (carti)
//

function containsMention(text) {
    if (!text) return false;
    
    const normalized = text.replace(/\s+/g, '').toLowerCase();
    
    if (normalized.includes('@everyone') || normalized.includes('@here')) {
        return true;
    }
    
    if (/@everyone/i.test(text) || /@here/i.test(text)) {
        return true;
    }
    
    const mentionPatterns = [
        /<@&?\d+>/,
        /<@!\d+>/,
        /@\s*e\s*v\s*e\s*r\s*y\s*o\s*n\s*e/i,
        /@\s*h\s*e\s*r\s*e/i,
    ];
    
    for (const pattern of mentionPatterns) {
        if (pattern.test(text) || pattern.test(normalized)) {
            return true;
        }
    }
    
    return false;
}

function filterMentions(text) {
    if (containsMention(text)) {
        return { filtered: true, response: 'you suck bozo' };
    }
    return { filtered: false, response: text };
}

module.exports = {
    containsMention,
    filterMentions
};
