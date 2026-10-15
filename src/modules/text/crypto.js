// ▛▀ cashholy (carti) ▀▜

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { createPaginationSession } = require('../../services/pagination');
const axios = require('axios');
const Parser = require('rss-parser');
const { openNews } = require('../../services/newsBrowser');
const { CRYPTO_TOPICS } = require('../../services/newsFeeds');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COIN_MAP = {
    btc: 'bitcoin', bitcoin: 'bitcoin',
    eth: 'ethereum', ethereum: 'ethereum',
    ltc: 'litecoin', litecoin: 'litecoin',
    doge: 'dogecoin', dogecoin: 'dogecoin',
    bch: 'bitcoin-cash',
    xrp: 'ripple', ripple: 'ripple',
    xlm: 'stellar', stellar: 'stellar',
    ada: 'cardano', cardano: 'cardano',
    sol: 'solana', solana: 'solana',
    bnb: 'binancecoin', binancecoin: 'binancecoin',
    usdt: 'tether', tether: 'tether',
    usdc: 'usd-coin',
    dot: 'polkadot', polkadot: 'polkadot',
    link: 'chainlink', chainlink: 'chainlink',
    avax: 'avalanche-2',
    matic: 'matic-network',
    trx: 'tron', tron: 'tron',
    shib: 'shiba-inu',
    uni: 'uniswap',
    atom: 'cosmos',
};

const BLOCKCYPHER_CHAINS = { btc: 'btc/main', ltc: 'ltc/main', doge: 'doge/main', bch: 'bch/main' };

function getCoinId(coin) {
    return COIN_MAP[coin.toLowerCase()] || coin.toLowerCase();
}

async function getCryptoPrice(coin) {
    const id = getCoinId(coin);
    try {
        const res = await axios.get(`${COINGECKO_API}/simple/price`, {
            params: {
                ids: id,
                vs_currencies: 'usd',
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true
            },
            timeout: 8000
        });
        return res.data[id] || null;
    } catch (error) {
        return null;
    }
}

async function getCryptoNews() {
    const parser = new Parser();
    try {
        const feed = await parser.parseURL('https://news.bitcoin.com/feed/');
        if (feed?.items) {
            return feed.items.slice(0, 30).map(item => ({
                title: item.title || 'Untitled',
                url: item.link || '#',
                source: 'Bitcoin News',
                published: item.pubDate
            }));
        }
        return [];
    } catch (error) {
        return [];
    }
}

async function getTopCoins(type = 'gainers') {
    try {
        const res = await axios.get(`${COINGECKO_API}/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 20,
                page: 1,
                sparkline: false
            },
            timeout: 8000
        });

        if (type === 'gainers') {
            return res.data.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 10);
        } else {
            return res.data.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)).slice(0, 10);
        }
    } catch (error) {
        return [];
    }
}

async function searchWalletBalance(coin, address) {
    try {
        const coinLower = coin.toLowerCase();
        const headers = { 'User-Agent': 'Mozilla/5.0' };

        if (coinLower === 'btc') {
            try {
                const res = await axios.get(`https://blockchain.info/q/addressbalance/${address}`, { timeout: 8000, headers });
                return { balance: res.data / 100000000, coin };
            } catch (e) {
                return { error: 'Invalid BTC address or API unavailable' };
            }
        } else if (coinLower === 'eth') {
            try {
                const res = await axios.get(`https://api.etherscan.io/api`, {
                    params: { module: 'account', action: 'balance', address, tag: 'latest' },
                    timeout: 8000, headers
                });
                return { balance: res.data.result ? res.data.result / 1e18 : 0, coin };
            } catch (e) {
                return { error: 'Invalid ETH address or API unavailable' };
            }
        } else if (coinLower === 'ltc') {
            try {
                const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`, { timeout: 8000, headers });
                if (res.data?.balance !== undefined) {
                    return { balance: res.data.balance / 1e8, coin };
                }
                return { error: 'Invalid LTC address' };
            } catch (e) {
                return { error: 'LTC API unavailable' };
            }
        } else if (coinLower === 'doge') {
            try {
                const res = await axios.get(`https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`, { timeout: 8000, headers });
                if (res.data?.balance !== undefined) {
                    return { balance: res.data.balance / 1e8, coin };
                }
                return { error: 'Invalid DOGE address' };
            } catch (e) {
                return { error: 'DOGE API unavailable' };
            }
        } else if (coinLower === 'bch') {
            try {
                const res = await axios.get(`https://api.blockcypher.com/v1/bch/main/addrs/${address}/balance`, { timeout: 8000, headers });
                if (res.data?.balance !== undefined) {
                    return { balance: res.data.balance / 1e8, coin };
                }
                return { error: 'Invalid BCH address' };
            } catch (e) {
                return { error: 'BCH API unavailable' };
            }
        } else if (coinLower === 'xrp') {
            try {
                const res = await axios.get(`https://xrpscan.com/api/v1/account/${address}`, { timeout: 8000, headers });
                if (res.data?.account?.balance) {
                    return { balance: res.data.account.balance / 1e6, coin };
                }
                return { error: 'Invalid XRP address' };
            } catch (e) {
                return { error: 'XRP API unavailable' };
            }
        }
        return null;
    } catch (error) {
        return { error: 'API error - try again later' };
    }
}

async function getBlockCypherTransactions(coin, address) {
    const chain = BLOCKCYPHER_CHAINS[coin.toLowerCase()];
    if (!chain) return [];
    try {
        const res = await axios.get(`https://api.blockcypher.com/v1/${chain}/addrs/${address}/full`, {
            params: { limit: 10 },
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.data?.txs) {
            return res.data.txs.map(tx => ({
                hash: tx.hash,
                value: (tx.total / 1e8).toFixed(8).replace(/\.?0+$/, '') || '0',
                type: coin.toUpperCase()
            }));
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function getETHTransactions(address) {
    try {
        const res = await axios.get(`https://api.etherscan.io/api`, {
            params: { module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, page: 1, offset: 20, sort: 'desc' },
            timeout: 8000
        });
        if (res.data.result && Array.isArray(res.data.result)) {
            return res.data.result.map(tx => ({ hash: tx.hash, value: (tx.value / 1e18).toFixed(6).replace(/\.?0+$/, '') || '0', type: 'ETH' }));
        }
        return [];
    } catch (error) {
        return [];
    }
}

module.exports = {
    name: 'crypto',
    aliases: ['c'],
    description: 'Cryptocurrency commands',
    category: 'crypto',

    async execute(message, args) {
        if (args.length === 0) {
            return require('../../services/helpMenu').sendHelp('crypto', message);
        }

        const subcommand = args[0].toLowerCase();

        try {
            if (subcommand === 'balance') {
                if (args.length < 3) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Usage Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('`crypto balance <coin> <address>`'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const coin = args[1];
                const address = args.slice(2).join(' ');
                const result = await searchWalletBalance(coin, address);

                if (result === null) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Unsupported Coin'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('**Supported:** BTC, ETH, LTC, DOGE, BCH, XRP'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                if (result.error) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(result.error));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const balanceFormatted = result.balance.toFixed(8).replace(/\.?0+$/, '');
                const displayBalance = balanceFormatted || '0';

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Wallet Balance'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**${result.coin.toUpperCase()}** · Wallet Address\n> \`${address}\`\n\`\`\`\n${displayBalance} ${result.coin.toUpperCase()}\n\`\`\``
                    ));

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            } else if (subcommand === 'price') {
                if (args.length < 2) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Usage Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('`crypto price <coin>`'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const coin = args[1];
                const priceData = await getCryptoPrice(coin);

                if (!priceData) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Not Found'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`No data for **${coin}**`));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const change24h = priceData.usd_24h_change || 0;
                const changeEmoji = change24h >= 0 ? '+' : '';

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${coin.toUpperCase()} Price`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Price** · $${priceData.usd?.toFixed(2) || 'N/A'}\n` +
                        `**24h Change** · ${changeEmoji}${change24h.toFixed(2)}%\n` +
                        `**Market Cap** · $${(priceData.usd_market_cap || 0).toLocaleString()}\n` +
                        `**Volume** · $${(priceData.usd_24h_vol || 0).toLocaleString()}`
                    ));

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            } else if (subcommand === 'convert') {
                if (args.length < 4) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Usage Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('`crypto convert <from> <to> <amount>`'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const from = args[1];
                const to = args[2];
                const amount = parseFloat(args[3]);

                if (isNaN(amount)) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Invalid Amount'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Provide a valid number.'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const [fromPrice, toPrice] = await Promise.all([getCryptoPrice(from), getCryptoPrice(to)]);

                if (!fromPrice || !toPrice) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Invalid cryptocurrency.'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const result = (amount * fromPrice.usd) / toPrice.usd;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Crypto Conversion'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**${amount} ${from.toUpperCase()}** → **${result.toFixed(8)} ${to.toUpperCase()}**\n-# $${(amount * fromPrice.usd).toFixed(2)} USD`
                    ));

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            } else if (subcommand === 'news') {
                return openNews(message, { title: 'Crypto news', topics: CRYPTO_TOPICS });

            } else if (subcommand === 'gainers' || subcommand === 'losers') {
                const coins = await getTopCoins(subcommand);

                if (coins.length === 0) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Top ${subcommand === 'gainers' ? 'Gainers' : 'Losers'}`))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to fetch data.'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const content = coins.slice(0, 10).map((coin, i) => {
                    const change = coin.price_change_percentage_24h || 0;
                    const prefix = change >= 0 ? '+' : '';
                    return `**${i + 1}. ${coin.name}** (${coin.symbol.toUpperCase()})\n$${coin.current_price?.toFixed(2) || 'N/A'} | ${prefix}${change.toFixed(2)}%`;
                }).join('\n\n');

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Top ${subcommand === 'gainers' ? 'Gainers' : 'Losers'} (24h)`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            } else if (subcommand === 'transaction' || subcommand === 'tx') {
                if (args.length < 3) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Usage Error'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('`crypto transaction <coin> <address>`'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const coin = args[1].toUpperCase();
                const address = args.slice(2).join(' ');
                const coinLower = coin.toLowerCase();

                let transactions = [];
                if (BLOCKCYPHER_CHAINS[coinLower]) {
                    transactions = await getBlockCypherTransactions(coinLower, address);
                } else if (coinLower === 'eth') {
                    transactions = await getETHTransactions(address);
                } else {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Unsupported'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Supported: BTC, ETH, LTC, DOGE, BCH'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                if (transactions.length === 0) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# No Transactions'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('No transactions found.'));
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }

                const fetchPage = async (index) => {
                    const txs = transactions.slice(index * 5, (index + 1) * 5);
                    return { txs, coin };
                };

                const renderPage = async (pageIndex, data) => {
                    const { txs, coin } = data;
                    const content = txs.map((tx, i) =>
                        `**${i + 1}.** ${tx.value} ${coin}\n> \`${tx.hash}\``
                    ).join('\n\n');

                    return new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${coin} Transactions`))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
                };

                const paginationSession = createPaginationSession({
                    interactionOrMessage: message,
                    pages: fetchPage,
                    renderPage,
                    userId: message.author.id,
                    totalPages: Math.ceil(transactions.length / 5),
                    initialPage: 0,
                    timeout: 300000,
                    ephemeral: false
                });

                await paginationSession.renderInitial();
            } else {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Unknown Subcommand'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Use `crypto` for help.'));
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (error) {
            console.error('Crypto prefix command error:', error);
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('An error occurred. Try again later.'));
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
