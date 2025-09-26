import express from "express";
import { code2Image } from "./controller/code_image";
import { Puppeteer } from "./controller/code_image";

const app = express();

// 解析 application/json 类型的请求体
app.use(express.json());
// 解析 application/x-www-form-urlencoded 类型的请求体
app.use(express.urlencoded({ extended: true }));
// 如果需要解析 text/plain 类型
app.use(express.text());

Puppeteer.init()

app.get('/', (req, res) => {
    res.send('Welcome to the home page!');
});
app.post('/code2Image', (req, res) => {
    const { newCode, oldCode } = req.body;
    let resultJson = code2Image(newCode, oldCode);
    resultJson.then((data) => {
        res.send(data);
    }).catch(
        (err) => {
            res.send('err: ' + err);
        }
    )
});
app.post('/submit', (req, res) => {
    res.send('Received PosT data');
});
app.listen(8095, () => {
    console.log('服务器运行在 http://localhost:8095/');
});