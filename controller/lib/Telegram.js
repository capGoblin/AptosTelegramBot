require('dotenv').config();
const { axiosInstance, geckoAxiosInstance } = require("./axios");
const Moralis = require('moralis').default;
const { ChatMistralAI } = require("@langchain/mistralai");
const { HumanMessage } = require("@langchain/core/messages");

const baseURL = "https://api.geckoterminal.com/api/v2";
const network = "aptos";
let isMoralisInitialized = false;

const model = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,
    apiKey: process.env.MISTRAL_AI_API_KEY

});

let userIntervals = {};

const startMessage = `
Hello! 👋

Welcome to the Aptos DeFi Notify Bot. This bot is designed to keep you informed and up-to-date with the latest information on the Aptos blockchain. Whether you're tracking liquidity pools, token prices, or NFT collections, this bot has you covered with timely notifications and updates.

Here are few things i can send you instant notifications:
- For trending and new liquidity pools.
- For latest coins and NFT collections.
- Schedule regular updates for the commands you care about.
- Ask AI your queries on the Aptos chain.

Type /help to see a full list of commands and get started!

Let’s dive into the world of Aptos together! 🚀
`;

const helpMessage = `
Hello! Here are the commands you can use:

/start - Start a conversation with the bot.
/help - Display this help message.

/trending_pools - Get the top 5 trending liquidity pools on Aptos.
/new_pools - Get the top 5 new liquidity pools on Aptos.
/new_coins - Fetch the latest coins on Aptos.
/nft_collections - Fetch the latest NFT collections on Aptos.

/schedule <interval_in_hours> <command> - Schedule a command to be executed every specified interval in hours.
/stop_schedule - Stop all scheduled commands.

/query <your_custom_query> - Ask a custom query related to Aptos chain and DeFi.

/token_price <token_symbol> - Get the current price of a specified token.
/token_info <token_symbol> - Get detailed information about a specified token.
/recent_tokens - Fetch the recently updated tokens on Aptos.
/search_pools <query> - Search for pools with a specified query.


If you need further assistance, feel free to ask!
`;

function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

async function handleMessage(messageObj) {
    const cmd = messageObj.text || "";

    if (!isMoralisInitialized) {
        await Moralis.start({
            apiKey: process.env.MORALIS_API_KEY
        });
        isMoralisInitialized = true;
    }

    if (cmd === "/start") {
        return sendMessage(messageObj, startMessage);
    } else if (cmd === "/help") {
        return sendMessage(messageObj, helpMessage);
    } else if (cmd === "/trending_pools") {
        try {
            const response = await geckoAxiosInstance.get(`/networks/aptos/trending_pools`);
            return sendMessage(messageObj, formatTop5Pools(getTop5Pools(response.data)));
        } catch (error) {
            return sendMessage(messageObj, "Error fetching trending pools.");
        }
    } else if (cmd === "/new_pools") {
        try {
            const response = await geckoAxiosInstance.get(`/networks/aptos/new_pools`);
            // console.log(response);
            return sendMessage(messageObj, formatTop5NewPools(getTop5NewPools(response.data)));
        } catch (error) {
            return sendMessage(messageObj, "Error fetching new pools.");
        }
    } else if (cmd === "/new_coins") {
        try {
            fetch("https://mainnet-aptos-api.moralis.io/coins/latest?limit=5", {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-API-Key": process.env.MORALIS_API_KEY
                }
            })
                .then(async response => {
                    sendMessage(messageObj, formatNewCoins(await response.json()));
                })
                .then(data => console.log(data))
                .catch(error => console.error('Error:', error));
        } catch (error) {
            return sendMessage(messageObj, "Error fetching new coins.");
        }
    } else if (cmd === "/nft_collections") {
        try {
            fetch("https://mainnet-aptos-api.moralis.io/collections?limit=5", {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-API-Key": process.env.MORALIS_API_KEY
                }
            })
                .then(async response => {
                    sendMessage(messageObj, formatNFTCollections(await response.json()));
                })
                .then(data => console.log(data))
                .catch(error => console.error('Error:', error));
        } catch (error) {
            return sendMessage(messageObj, "Error fetching new pools.");
        }
    } else if (cmd.startsWith("/schedule")) {
        const [_, interval, command] = cmd.split(" ");
        if (!interval || !command) {
            return sendMessage(messageObj, "Usage: /schedule <interval_in_hours> <command>");
        }
        // const intervalMs = interval * 3600000;

        const intervalMs = 10000;

        if (userIntervals[messageObj.chat.id]) {
            clearInterval(userIntervals[messageObj.chat.id]);
        }

        userIntervals[messageObj.chat.id] = setInterval(() => {
            handleMessage({ ...messageObj, text: `/${command}` });
        }, intervalMs);

        return sendMessage(messageObj, `Scheduled ${command} every ${interval} hours.`);
    } else if (cmd === "/stop_schedule") {
        if (userIntervals[messageObj.chat.id]) {
            clearInterval(userIntervals[messageObj.chat.id]);
            delete userIntervals[messageObj.chat.id];
            return sendMessage(messageObj, "Stopped scheduled notifications.");
        } else {
            return sendMessage(messageObj, "No scheduled notifications to stop.");
        }
    } else if (cmd.startsWith("/query")) {
        const query = cmd.replace("/query ", "");
        if (!query) {
            return sendMessage(messageObj, "Usage: /query <your_custom_query>");
        }
        const msg = await model.invoke([new HumanMessage({ content: `Answer the query regarding Aptos chain and DeFi in 20 words ${query}` })])
        return sendMessage(messageObj, formatAIMessageContent(msg));
    } else if (cmd.startsWith("/token_price ")) {
        const tokenSymbol = cmd.split(" ")[1];
        try {
            const tokenInfo = await geckoAxiosInstance.get(`/networks/aptos/tokens/${tokenSymbol}`);
            const tokenAddress = tokenInfo.data.data.address;
            const response = await geckoAxiosInstance.get(`/simple/networks/aptos/token_price/${tokenAddress}`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching price for token ${tokenSymbol}.`);
        }
    } else if (cmd.startsWith("/pool_info ")) {
        const poolSymbol = cmd.split(" ")[1];
        try {
            const poolSearch = await geckoAxiosInstance.get(`/search/pools?query=${poolSymbol}`);
            const poolAddress = poolSearch.data.data[0].address;
            const response = await geckoAxiosInstance.get(`/networks/aptos/pools/${poolAddress}/info`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching info for pool ${poolSymbol}.`);
        }
    } else if (cmd.startsWith("/pool_trades ")) {
        const poolSymbol = cmd.split(" ")[1];
        try {
            const poolSearch = await geckoAxiosInstance.get(`/search/pools?query=${poolSymbol}`);
            const poolAddress = poolSearch.data.data[0].address;
            const response = await geckoAxiosInstance.get(`/networks/aptos/pools/${poolAddress}/trades`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching trades for pool ${poolSymbol}.`);
        }
    } else if (cmd.startsWith("/token_info ")) {
        const tokenSymbol = cmd.split(" ")[1];
        try {
            const tokenInfo = await geckoAxiosInstance.get(`/networks/aptos/tokens/${tokenSymbol}/info`);
            return sendMessage(messageObj, JSON.stringify(tokenInfo.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching info for token ${tokenSymbol}.`);
        }
    } else if (cmd === "/recent_tokens") {
        try {
            const response = await geckoAxiosInstance.get(`/tokens/info_recently_updated`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, "Error fetching recently updated tokens.");
        }
    } else if (cmd.startsWith("/search_pools ")) {
        const query = cmd.split(" ")[1];
        try {
            const response = await geckoAxiosInstance.get(`/search/pools?query=${query}`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error searching pools with query ${query}.`);
        }
    } else if (cmd.startsWith("/historical_data ")) {
        const [poolSymbol, timeframe] = cmd.split(" ").slice(1);
        try {
            const poolSearch = await geckoAxiosInstance.get(`/search/pools?query=${poolSymbol}`);
            const poolAddress = poolSearch.data.data[0].address;
            const response = await geckoAxiosInstance.get(`/networks/aptos/pools/${poolAddress}/ohlcv/${timeframe}`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching historical data for pool ${poolSymbol} with timeframe ${timeframe}.`);
        }
    } else if (cmd.startsWith("/top_pools_for_token ")) {
        const tokenSymbol = cmd.split(" ")[1];
        try {
            const tokenInfo = await geckoAxiosInstance.get(`/networks/aptos/tokens/${tokenSymbol}`);
            const tokenAddress = tokenInfo.data.data.address;
            const response = await geckoAxiosInstance.get(`/networks/aptos/tokens/${tokenAddress}/pools`);
            return sendMessage(messageObj, JSON.stringify(response.data));
        } catch (error) {
            return sendMessage(messageObj, `Error fetching top pools for token ${tokenSymbol}.`);
        }
    }
}

module.exports = { handleMessage };

function getTop5Pools(data) {
    const sortedPools = data.data.sort((a, b) => {
        const reserveA = parseFloat(a.attributes.reserve_in_usd);
        const reserveB = parseFloat(b.attributes.reserve_in_usd);
        return reserveB - reserveA;
    });

    const top5Pools = sortedPools.slice(0, 5);

    return top5Pools.map(pool => ({
        name: pool.attributes.name,
        address: pool.attributes.address,
        reserveUSD: parseFloat(pool.attributes.reserve_in_usd).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }));
}

function formatTop5Pools(poolsData) {
    const formattedString = poolsData.map((pool, index) => {
        const address = encodeURIComponent(pool.address)
        return `
${index + 1}. ${pool.name}
   Address: https://www.geckoterminal.com/aptos/pools/${address}
   Reserve: ${pool.reserveUSD}
   ${'-'.repeat(60)}`;
    }).join('\n');

    return `
Top 5 Liquidity Pools
=====================

${formattedString}
`;
}


function getTop5NewPools(data) {
    const sortedPools = data.data.sort((a, b) => {
        const reserveA = parseFloat(a.attributes.reserve_in_usd);
        const reserveB = parseFloat(b.attributes.reserve_in_usd);
        return reserveB - reserveA;
    });

    const top5Pools = sortedPools.slice(0, 5);

    return top5Pools.map(pool => ({
        name: pool.attributes.name,
        address: pool.attributes.address,
        reserveUSD: parseFloat(pool.attributes.reserve_in_usd).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }),
        createdAt: new Date(pool.attributes.pool_created_at).toLocaleString()
    }));
}

function formatTop5NewPools(poolsData) {
    const formattedString = poolsData.map((pool, index) => {
        const address = encodeURIComponent(pool.address)
        return `
${index + 1}. ${pool.name}
   Address: https://www.geckoterminal.com/aptos/pools/${address}
   Reserve: ${pool.reserveUSD}
   Created: ${pool.createdAt}
   ${'-'.repeat(60)}`;
    }).join('\n');

    return `
Top 5 New Liquidity Pools
=========================

${formattedString}
`;
}


function formatNewCoins(data) {
    const coins = data.result;

    const formattedCoins = coins.map((coin, index) => {
        const address = encodeURIComponent(coin.creator_address)
        return `
${index + 1}. ${coin.name} (${coin.symbol})
   Coin Type: ${coin.coin_type.slice(0, 20)}...${coin.coin_type.slice(-20)}
   Creator: ${address}
   Decimals: ${coin.decimals}
   Created: ${new Date(coin.transaction_created_timestamp).toLocaleString()}
   Transaction Version: ${coin.transaction_version_created}
   ${'-'.repeat(60)}`;
    }).join('\n');

    return `
Newly Created Coins/Tokens
==========================

${formattedCoins}

`;
}

function formatNFTCollections(data) {
    const collections = data.result;

    const formattedCollections = collections.map((collection, index) => {
        const address = encodeURIComponent(collection.creator_address)
        const collection_data_id_hash = encodeURIComponent(collection.collection_data_id_hash)

        return `
${index + 1}. Collection ID: ${collection_data_id_hash}
   Creator: ${address}
   Supply: ${collection.supply} / ${collection.maximum === "9007199254740991" ? "Unlimited" : collection.maximum}
   Last Updated: ${new Date(collection.last_transaction_timestamp).toLocaleString()}
   Mutable:
     - Description: ${collection.description_mutable}
     - Maximum: ${collection.maximum_mutable}
     - URI: ${collection.uri_mutable}
   ${'-'.repeat(60)}`;
    }).join('\n');

    return `
NFT Collections
===============

${formattedCollections}


`;
}

function formatAIMessageContent(aiMessage) {
    return `
${aiMessage.content}
`}