const axios = require('axios');
const MY_TOKEN = "7194038432:AAHsFBJiLReYpHdf4fqWzt4tInJdBt3vzcE"

const BASE_URL = `https://api.telegram.org/bot${MY_TOKEN}`;

function getAxiosInstance() {
    return {
        get(method, params) {
            return axios.get(`/${method}`, {
                baseURL: BASE_URL,
                params,
            });
        },
        post(method, data) {
            return axios.post(`/${method}`, data, {
                baseURL: BASE_URL,
            });
        }
    };
}

const GECKO_BASE_URL = "https://api.geckoterminal.com/api/v2";

function getGeckoAxiosInstance() {
    return {
        get(endpoint, params) {
            return axios.get(`${GECKO_BASE_URL}${endpoint}`, {
                params,
            });
        }
    };
}

module.exports = {
    axiosInstance: getAxiosInstance(), geckoAxiosInstance: getGeckoAxiosInstance(),
};