const { handleMessage } = require("./lib/Telegram.js");

async function handleRequest(req, res) {
    const { body } = req;
    if (body) {
        const messageObj = body.message;
        await handleMessage(messageObj);
    }
    return;
}

module.exports = { handleRequest };