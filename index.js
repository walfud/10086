const Koa = require('koa');
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const Router = require('koa-router')
const puppeteer = require('puppeteer')
const MongoClient = require('mongodb').MongoClient

if (!process.env.MONGO_URL) {
    require('dotenv').config()
}

const app = new Koa();
app.use(logger())
app.use(bodyParser())

const apiRouter = new Router({
    prefix: '/api',
})
let refreshState
apiRouter.post('/refresh', async (ctx, next) => {
    if (!refreshState) {
        refreshState = {};

        (async function () {
            let nextTime = 0
            try {
                // start
                start: parseInt(new Date().valueOf() / 1000)

                // fetch
                refreshState.fetch = {
                    begin: parseInt(new Date().valueOf() / 1000),
                }
                const datas = await fetch()
                refreshState.fetch.end = parseInt(new Date().valueOf() / 1000)
                refreshState.fetch.count = datas.length

                // save
                refreshState.save = {
                    begin: parseInt(new Date().valueOf() / 1000),
                }
                await save()
                refreshState.save.end = parseInt(new Date().valueOf() / 1000)

                // succ
                refreshState.result = 'succ'

                nextTime = 1 * 60 * 1000
            } catch (err) {
                // fail
                refreshState.result = err.toString()
            } finally {
                // stop
                refreshState.stop = parseInt(new Date().valueOf() / 1000)
            }

            setTimeout(function () {
                refreshState = null
            }, nextTime)
        })()
    }

    ctx.body = refreshState
})
apiRouter.get('/num', async (ctx, next) => {
    let client
    try {
        client = await MongoClient.connect(process.env.MONGO_URL)
        const db = await client.db(process.env.DB)
        const col = await db.collection(process.env.COLLECTION)
        ctx.body = await col.find().toArray()
    } catch (err) {
        console.error(err)
    }
    client && client.close()
})
app.use(apiRouter.routes())

const uiRouter = new Router()
uiRouter.get('/', (ctx, next) => {
    ctx.body = 'Hello Koa'
})
app.use(uiRouter.routes())

app.listen(3000);



/**
 * 爬取 10086 手机号信息
 * 
 * @returns \{
 *              num: '13911592475',
 *              price: '30',
 *              timestamp: 1516333513,
 *          \}
 */
async function fetch() {
    const res = []

    let browser
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage()
        await page.goto('http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html')

        // 重置条件
        await page.click('#reserveFee_')

        // 遍历页码
        const pageCount = await page.$eval('#kkpager > div > span.infoTextAndGoPageBtnWrap > span.totalText > span.totalPageNum', ele => ele.firstChild.nodeValue)
        for (let i = 1; i <= pageCount; i++) {
            const wait = parseInt(Math.random() * 3000)
            await page.waitFor(wait)

            // 页面选择
            await page.type('#kkpager_btn_go_input', `${i}`)
            await page.click('#kkpager_btn_go')

            // 手机号 / 价格
            const pageRes = []
            for (let j = 0; j < 20; j++) {
                try {
                    pageRes.push(await page.$eval(`#num${j}`, function (ele) {
                        const numEle = ele
                        const priceEle = ele.nextSibling

                        return {
                            num: ele.lastChild.nodeValue,
                            price: priceEle.firstChild.nodeValue && priceEle.firstChild.nodeValue.replace('元', ''),
                            timestamp: parseInt(new Date().getTime() / 1000),
                        }
                    }))
                } catch (e) {
                    break
                }
            }

            res.push(...pageRes)
            console.log(`page(${i}/${pageCount} = ${parseInt(i * 100 / pageCount)}): ${res.length}: +${pageRes.length}`)
        }
    } catch (err) {
        console.error(err)
    }
    browser && browser.close()

    res.forEach(function (r) {
        console.log(r)
    })
    return res
}

/**
 * 保存到 mongo
 * 
 * @param datas \{
 *              num: '13911592475',
 *              price: '30',
 *              timestamp: 1516333513,
 *          \}
 */
async function save(datas) {
    let client
    try {
        client = await MongoClient.connect(process.env.MONGO_URL)
        const db = await client.db(process.env.DB)
        const col = await db.collection(process.env.COLLECTION)

        for (let data of datas) {
            try {
                await col.updateOne({
                    num: data.num
                }, {
                        $set: data
                    }, {
                        upsert: true
                    })
            } catch (err) {
                console.error(err)
            }
        }
    } catch (err) {
        console.error(err)
    }
    client && client.close()
}