const Router = require('koa-router')
const api = new Router()

const contests = require('./contests')
const problems = require('./problems')
const news = require('./news')
const home = require('./home')

api
  .use('/api', contests.routes(), contests.allowedMethods())
  .use('/api', problems.routes(), problems.allowedMethods())
  .use('/api', news.routes(), news.allowedMethods())
  .use('/api', home.routes(), home.allowedMethods())

module.exports = function (app) {
  app
    .use(api.routes())
    .use(api.allowedMethods())
}
