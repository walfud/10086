const Koa = require('koa');
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const Router = require('koa-router')
const puppeteer = require('puppeteer')
const MongoClient = require('mongodb').MongoClient

if (!process.env.MONGO_URL) {
    require('dotenv').config()
}

const app = new Koa()
app.use(logger())
app.use(bodyParser())

const apiRouter = new Router({
    prefix: '/api',
})
let refreshState
apiRouter.post('/refresh', async (ctx, next) => {
    // 被重置或者超过 60 分钟后, 可重新 refresh
    if (!refreshState
        || (refreshState.start + 60 * 60 * 1000) < (new Date().valueOf())) {
        refreshState = {};

        (async function () {
            let nextTime = 0
            try {
                // start
                refreshState.start = new Date().valueOf()

                // fetch
                const fetchBegin = new Date().valueOf()
                const datas = await fetch()
                const fetchEnd = new Date().valueOf()
                refreshState.fetch = {}
                refreshState.fetch.time = fetchEnd - fetchBegin
                refreshState.fetch.count = datas.length

                // save
                const saveBegin = new Date().valueOf()
                await save(datas)
                const saveEnd = new Date().valueOf()
                refreshState.save = {}
                refreshState.save.time = saveEnd - saveBegin

                // succ
                refreshState.result = 'succ'

                if (datas.length > 0) {
                    nextTime = 1 * 60 * 1000
                }
            } catch (err) {
                // fail
                refreshState.result = err.toString()
            }

            // stop
            refreshState.stop = new Date().valueOf()

            console.debug(`reset refreshState in ${nextTime}ms`)
            setTimeout(function () {
                refreshState = null
            }, nextTime)
        })()
    }

    ctx.body = refreshState
})
apiRouter.get('/num', async (ctx, next) => {
    await mongo(process.env.COLLECTION,
        async (col) => await col.find().toArray(),
        (datas) => {
            ctx.body = datas
        },
        (err) => {
            ctx.body = err
        })
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
        await page.goto('http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html', { timeout: 0 })

        // 重置条件
        await page.click('#reserveFee_')

        // 遍历页码
        const pageCount = await page.$eval('#kkpager > div > span.infoTextAndGoPageBtnWrap > span.totalText > span.totalPageNum', ele => ele.firstChild.nodeValue)
        for (let i = 1; i <= pageCount; i++) {
            try {
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
                console.log(`page(${i}/${pageCount} = ${parseInt(i * 100 / pageCount)}%): ${res.length}: +${pageRes.length}`)
            } catch (err) {
                // 等待一段时间后继续
                console.debug(`page(${i}) reload`)
                try {
                    await page.reload({ timeout: 0 })
                    await page.click('#reserveFee_')
                } catch (err) {
                    console.error(`reload error: ${err}`)
                }
            }
        }
    } catch (err) {
        console.error(err)
    }
    browser && browser.close()

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
    mongo(process.env.COLLECTION, async function (col) {
        for (let data of datas) {
            await col.updateOne({
                num: data.num
            }, {
                    $set: data
                }, {
                    upsert: true
                })
        }
    })
}

/**
 * mongo Helper
 * 
 * @param {*} colName 
 * @param {*} afn 异步回调, 这里写对数据库的 CRUD
 * @param {*} onSucc 同步, 成功回调. 参数是 afn 的返回值
 * @param {*} onFail 同步, 失败回调. 参数是抛出的 err 对象
 * 
 * @returns 成功返回 onSucc 的结果, 如果没指定 onSucc 则返回 undefined. 失败返回 onFail 结果, 如果没指定, 则返回 undefined
 */
async function mongo(colName, afn, onSucc, onFail) {
    let client
    try {
        client = await MongoClient.connect(process.env.MONGO_URL)
        const db = await client.db(process.env.DB)
        const col = await db.collection(colName)
        const res = await afn(col)
        return onSucc && onSucc(res)
    } catch (err) {
        console.error(`collection(${colName}) err: ${err}`)
        return onFail && onFail(err)
    } finally {
        client && await client.close()
    }
}