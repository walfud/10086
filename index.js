const Koa = require('koa');
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const Router = require('koa-router')
const puppeteer = require('puppeteer')
const MongoClient = require('mongodb').MongoClient
const fetch = require('node-fetch')

if (!process.env.MONGO_URL) {
    require('dotenv').config()
}
const URL_10086 = 'http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html'

const app = new Koa()
app.use(logger())
app.use(bodyParser())

const apiRouter = new Router({
    prefix: '/api',
})
let refreshState
apiRouter.post('/refresh', async(ctx, next) => {
    // 被重置或者超过 60 分钟后, 可重新 refresh
    if (!refreshState ||
        (refreshState.start + 60 * 60 * 1000) < (new Date().valueOf())) {
        refreshState = {};

        (async function () {
            let nextTime = 0
            try {
                // start
                refreshState.start = new Date().valueOf()

                // fetch
                const fetchBegin = new Date().valueOf()
                const datas = await crawler()
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
/**
 * @argument no4 bool, 不含 4
 * @argument price range, 价格闭区间, 如 price=0-300
 * @argument like 正则, 手机号模式, 如 like=136....0405
 */
apiRouter.get('/num', async(ctx, next) => {
    const pipeline = []

    // 不包含 4
    if (ctx.request.body.no4) {
        pipeline.push({
            $match: {
                num: /^[0-35-9]$/
            }
        })
    }
    // 价格
    if (ctx.request.body.price) {
        [min = 0, max = 999999999] = ctx.request.body.price.split('-')
        pipeline.push({
            $match: {
                price: {
                    $gt: min,
                    $lt: max,
                }
            }
        })
    }
    // like
    if (ctx.request.body.like) {
        pipeline.push({
            $match: {
                num: {
                    $regex: new RegExp(`^${like}$`),
                }
            }
        })
    }

    await mongo(process.env.COLLECTION,
        async(col) => await col.aggregate(pipeline).toArray(),
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
async function crawler() {
    const res = []
    try {
        let pos = 1
        for (let i = 0; i < 100; i++) {
            // 获取页数
            const pageCount = await browse(URL_10086, 0,
                async function (page) {
                    // 重置条件
                    await page.click('#reserveFee_')

                    return parseInt(await page.$eval('#kkpager > div > span.infoTextAndGoPageBtnWrap > span.totalText > span.totalPageNum', ele => ele.firstChild.nodeValue))
                },
                (err, url, proxyServer) => console.debug(`get pageCount fail: proxy(${proxyServer})`),
                await getProxy(),
            )

            // 爬取所有页数据
            const proxyServer = await getProxy()
            console.debug(`page(${pos}) try: proxy(${proxyServer})`)
            await browse(URL_10086, 60 * 1000, async function (page) {
                    // 重置条件
                    await page.click('#reserveFee_')

                    while (pos <= pageCount) {
                        // 页面选择
                        await page.type('#kkpager_btn_go_input', `${pos}`)
                        await page.click('#kkpager_btn_go')

                        // 手机号 / 价格
                        const pageRes = []
                        for (let i = 0; i < 20; i++) {
                            try {
                                pageRes.push(await page.$eval(`#num${i}`, function (ele) {
                                    const numEle = ele
                                    const priceEle = ele.nextSibling

                                    return {
                                        num: ele.lastChild.nodeValue,
                                        price: parseInt(priceEle.firstChild.nodeValue && priceEle.firstChild.nodeValue.replace('元', '')),
                                        timestamp: parseInt(new Date().getTime() / 1000),
                                    }
                                }))
                            } catch (e) {
                                break
                            }
                        }

                        res.push(...pageRes)
                        console.log(`page(${pos}/${pageCount} = ${parseInt(pos * 100 / pageCount)}%): +${pageRes.length}: ${res.length}. proxy(${proxyServer})`)

                        pos++
                    }
                },
                (err, url, proxyServer) => console.debug(`page(${pos}) fail: proxy(${proxyServer})`),
                proxyServer,
            )

            if (pos >= pageCount) {
                break
            }
        }
    } catch (err) {
        console.log(`crawler fail: ${err}`)
    }
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

async function getProxy() {
    for (let i = 0; i < 100; i++) {
        const proxyServer = await fetch('http://123.207.35.36:5010/get').then(res => res.text())
        console.debug(`try proxy: ${proxyServer}`)
        const beginTime = new Date().valueOf()
        const test = await browse(URL_10086, 60 * 1000,
            async function (page) {
                // 尝试点击 go 按钮
                await page.click('#kkpager_btn_go')

                console.debug(`proxy(${i}/100) available: ${proxyServer}, time: ${parseInt((new Date().valueOf() - beginTime) / 1000)}s`)
                return proxyServer
            },
            () => console.debug(`proxy(${i}/100) fail: ${proxyServer}, time: ${parseInt((new Date().valueOf() - beginTime) / 1000)}s`),
            proxyServer,
        )

        if (test) {
            return test
        }
    }
}

/**
 * 
 * @param {*} url 
 * @param {*} onSucc function(page, url, proxyServer)
 * @param {*} onFail function(err, url, proxyServer)
 * @param {*} proxyServer 
 * @returns onSucc 或 onFail 的返回值
 */
async function browse(url, timeout, onSucc, onFail, proxyServer) {
    let browser
    try {
        const args = ['--no-sandbox', '--disable-setuid-sandbox']
        proxyServer && args.push(`--proxy-server=${proxyServer}`)
        browser = await puppeteer.launch({
            headless: true,
            args,
        })
        const page = await browser.newPage()
        await page.goto(url, {
            timeout,
        })
        const res = onSucc && onSucc(page, url, proxyServer)
        return res && res.then ? await res : res
    } catch (err) {
        console.error(err)
        const res = onFail && onFail(err, url, proxyServer)
        return res && res.then ? await res : res
    } finally {
        browser && browser.close()
    }
}