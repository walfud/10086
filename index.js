const puppeteer = require('puppeteer');

(async function () {
    const browser = await puppeteer.launch({
        headless: false
    })

    // // 获取所有号码段 id
    // const page = await browser.newPage()
    // await page.goto('http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html')
    // const sectionIds = await page.$eval('body > div.con > div > div.sx > table > tbody > tr:nth-child(4) > td:nth-child(2) > ul', function (ele) {
    //     return Array.prototype.slice.call(ele.childNodes, 0)
    //         .filter(ele => ele.nodeType === 1)
    //         .filter(ele => /^1..$/.test(ele.firstChild.nodeValue))
    //         .map(ele => ele.id)
    // })
    // page.close()
    const sectionIds = ['segmentTag_30000115']

    // 根据号段抓取
    const res = []
    await Promise.all(sectionIds.map(async function (sectionId) {
        // 新标签
        const sectionPage = await browser.newPage()
        await sectionPage.goto('http://service.bj.10086.cn/phone/jxhsimcard/gotone_list.html')
        // 条件选择
        await Promise.all([
            sectionPage.click('#reserveFee_'),
            sectionPage.click(`#${sectionId}`),
        ])

        //
        const sectionName = await sectionPage.$eval(`#${sectionId}`, ele => ele.firstChild.nodeValue)

        try {
            // 遍历页码
            const pageCount = await sectionPage.$eval('#kkpager > div > span.infoTextAndGoPageBtnWrap > span.totalText > span.totalPageNum', ele => ele.firstChild.nodeValue)
            for (let i = 1; i <= pageCount; i++) {
                // 页面选择
                const pageRes = []
                await sectionPage.type('#kkpager_btn_go_input', `${i}`)
                await sectionPage.click('#kkpager_btn_go')

                // 手机号 / 价格
                for (let k = 0; k < 20; k++) {
                    try {
                        pageRes.push(await sectionPage.$eval(`#num${k}`, function (ele) {
                            const numEle = ele
                            const priceEle = ele.nextSibling

                            return {
                                num: ele.lastChild.nodeValue,
                                price: priceEle.firstChild.nodeValue,
                                timestamp: parseInt(new Date().getTime() / 1000),
                            }
                        }))
                    } catch (e) {
                        console.log(`section(${sectionName}) page(${i}) : count(${k - 1})`)
                        break
                    }
                }

                res.push(...pageRes)
                console.log(`section(${sectionName}) page(${i}): ${pageRes.length}`)
            }
        } catch (err) {
            // 页面没有数据
            console.log(`section(${sectionName}): fail`)
        }

        sectionPage.close()
    }))

    res.forEach(function (r) {
        console.log(r)
    })

    browser.close()
})()