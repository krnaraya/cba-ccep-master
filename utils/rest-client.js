const https = require('https');
const Url = require('url-parse');
const dotenv = require('dotenv');
const messages = require('../constants/messages');
dotenv.config();

const iamPost = (options) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });

            res.on('end', (d) => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(str.toString('utf8')) 
                    });
                } catch(error) {
                    reject(messages.iamPostFailure);
                }
            }) 
        });
        
        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

const post = (url, body, token, headers) => {
    const urlObj = new Url(url);
    const data = JSON.stringify(body);

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const options = {
        hostname: urlObj.host,
        port: 443,
        path: urlObj.pathname + urlObj.query,
        method: 'POST',
        headers: headers ? headers : defaultHeaders,
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.on('data', (d) => {
                resolve({
                    statusCode: res.statusCode,
                    data: JSON.parse(d.toString('utf8')) 
                });
            }) 
        });
        
        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

module.exports = {
    post, 
    iamPost
};
