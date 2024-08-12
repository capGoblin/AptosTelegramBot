const express = require('express');
const { handleRequest } = require('./controller');

const app = express();
app.use(express.json());

app.post('*', async (req, res) => {
    console.log(req.body);
    res.send(await handleRequest(req));
});

app.get('*', async (req, res) => {
    res.send(await handleRequest(req));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


// const express = require('express')
// const axios = require('axios')
// const bodyParser = require('body-parser')

// const TOKEN = "7318476543:AAHvsy1up986OHLLyEEuRfhPusvTa5djBLE"

// const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`
// const URI = `/webhook/${TOKEN}`
// // const WEBHOOK_URL = SERVER_URL + URI

// const app = express()
// app.use(bodyParser.json())

// // const init = async () => {
// //     const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`)
// //     console.log(res.data)
// // }

// app.post(URI, async (req, res) => {
//     console.log(req.body)

//     const chatId = req.body.message.chat.id
//     const text = req.body.message.text

//     await axios.post(`${TELEGRAM_API}/sendMessage`, {
//         chat_id: chatId,
//         text: text
//     })
//     return res.send()
// })

// app.listen(process.env.PORT || 5000, async () => {
//     console.log('🚀 app running on port', process.env.PORT || 5000)
//     // await init()
// })