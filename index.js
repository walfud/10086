const puppeteer = require('puppeteer');
const MongoClient = require('mongodb').MongoClient;

if (!process.env.MONGO_URL) {
    require('dotenv').config()
}

async function save(datas) {
    let client
    try {
        client = await MongoClient.connect(process.env.MONGO_URL)
        const db = await client.db(process.env.DB)
        const col = await db.collection(process.env.COLLECTION)

        for (let data of datas) {
            try {
                await col.updateOne({ num: data.num }, { $set: data }, { upsert: true })
            } catch (err) {
                console.error(err)
            }
        }
    } catch (err) {
        cosnole.error(err)
    }
    client && client.close()
}

return save([{
    num: '1',
    price: '0',
    timestamp: 1,
}])


/**
 * num: '13911592475',
 * price: '30',
 * timestamp: 1516333513,
 */
async function fetch() {
    const browser = await puppeteer.launch({
        headless: false
    })

    // 获取所有号码段 id
    const page = await browser.newPage()
    await page.goto('http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html')
    const sectionIds = await page.$eval('body > div.con > div > div.sx > table > tbody > tr:nth-child(4) > td:nth-child(2) > ul', function (ele) {
        return Array.prototype.slice.call(ele.childNodes, 0)
            .filter(ele => ele.nodeType === 1)
            .filter(ele => /^1..$/.test(ele.firstChild.nodeValue))
            .map(ele => ({
                id: ele.id,
                nodeValue: ele.firstChild.nodeValue,
            }))
    })

    // 重置条件
    await page.click('#reserveFee_')

    const res = []
    for (let i = 0; i < sectionIds.length; i++) {
        const {
            id: sectionId,
            nodeValue: sectionName
        } = sectionIds[i]

        // 选择号段
        await page.click(`#${sectionId}`)

        try {
            // 遍历页码
            const pageCount = await page.$eval('#kkpager > div > span.infoTextAndGoPageBtnWrap > span.totalText > span.totalPageNum', ele => ele.firstChild.nodeValue)
            for (let j = 1; j <= pageCount; j++) {
                const wait = parseInt(Math.random() * 3000)
                console.log(`wait(${wait}ms)`)
                await page.waitFor(wait)

                // 页面选择
                const pageRes = []
                await page.type('#kkpager_btn_go_input', `${j}`)
                await page.click('#kkpager_btn_go')

                // 手机号 / 价格
                for (let k = 0; k < 20; k++) {
                    try {
                        pageRes.push(await page.$eval(`#num${k}`, function (ele) {
                            const numEle = ele
                            const priceEle = ele.nextSibling

                            return {
                                num: ele.lastChild.nodeValue,
                                price: priceEle.firstChild.nodeValue,
                                timestamp: parseInt(new Date().getTime() / 1000),
                            }
                        }))
                    } catch (e) {
                        console.log(`section(${sectionName}) page(${j}) : count(${k - 1})`)
                        break
                    }
                }

                res.push(...pageRes)
                console.log(`section(${sectionName}, ${parseInt((i + 1) * 100 / sectionIds.length)}%) page(${j}, ${parseInt(j * 100 / pageCount)}%): ${pageRes.length}`)
            }
        } catch (err) {
            // 页面没有数据
            console.log(`section(${sectionName}, ${parseInt((i + 1) * 100 / sectionIds.length)}%): fail`)
        }
    }
    page.close()

    res.forEach(function (r) {
        console.log(r)
    })

    browser.close()
}