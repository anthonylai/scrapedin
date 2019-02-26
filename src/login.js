const openPage = require('./openPage')
const logger = require('./logger')

module.exports = async (browser, email, password) => {
  const loginUrl = 'https://www.linkedin.com'
  const page = await openPage(browser, loginUrl)
  logger.info('login', `logging at: ${loginUrl}`)

  const debug = async (filename) => {
    console.log('saving screenshot')
    await page.screenshot({path: `public/${filename}.png`})

    const document = await page.evaluate(() => {
      const getNodes = (element) => {
        const nodes = []
        var all = element.getElementsByTagName("input")
        console.log('here');
        for (var i=0, max=all.length; i < max; i++) {
             // Do something with the element here
             nodes.push({ inputId: all[i].id, name: all[i].name })
             // nodes.concat(getNodes(all[i]))
        }
        all = element.getElementsByTagName("button")
        console.log('here1');
        for (var i=0, max=all.length; i < max; i++) {
             // Do something with the element here
             nodes.push({ buttonId: all[i].id, name: all[i].name })
             // nodes.concat(getNodes(all[i]))
        }
        all = element.getElementsByTagName("form")
        console.log('here1');
        for (var i=0, max=all.length; i < max; i++) {
             // Do something with the element here
             nodes.push({ formId: all[i].id, name: all[i].name })
             // nodes.concat(getNodes(all[i]))
        }
        return nodes
      }

      return getNodes(document)
    })
    console.log('document', document);
    // console.log('nodes: ', getNodes(document));
  }


  await page.goto(loginUrl)
  await page.waitFor('#login-email')

  await page.$('#login-email')
    .then((emailElement) => emailElement.type(email))
  await page.$('#login-password')
    .then((passwordElement) => passwordElement.type(password))

  await debug('login0');

  await page.$('#login-submit')
    .then((button) => button.click())

  return page.waitFor('input[role=combobox]', {
    timeout: 15000
    })
    .then(async () => {
      logger.info('login', 'logged feed page selector found')
      await debug('login1');
      await page.close()
    })
    .catch(async () => {
      await debug('error0');
      logger.warn('login', 'successful login element was not found')
      const emailError = await page.evaluate(() => {
        const e = document.querySelector('div[error-for=username]')
        if (!e) { return false }
        const style = window.getComputedStyle(node)
        return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      })

      const passwordError = await page.evaluate(() => {
        const e = document.querySelector('div[error-for=password]')
        if (!e) { return false }
        const style = window.getComputedStyle(node)
        return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      })

      const manualChallengeRequested = await page.evaluate(() => {
        const e = document.querySelector('.flow-challenge-content')
        if (!e) { return false }
        const style = window.getComputedStyle(node)
        return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      })

      if (emailError) {
        logger.info('login', 'wrong username element found')
        return Promise.reject(new Error(`linkedin: invalid username: ${email}`))
      }

      if (passwordError) {
        logger.info('login', 'wrong password element found')
        return Promise.reject(new Error('linkedin: invalid password'))
      }

      if (page.$(manualChallengeRequested)) {
        logger.warn('login', 'manual check was required')
        return Promise.reject(new Error('linkedin: manual check was required, verify if your login is properly working manually or report this issue: https://github.com/leonardiwagner/scrapedin/issues'))
      }

      logger.error('login', 'could not find any element to retrieve a proper error')
      return Promise.reject(new Error('login is not working, please report: https://github.com/leonardiwagner/scrapedin/issues'))
    })
}
