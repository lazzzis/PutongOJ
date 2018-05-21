const test = require('ava')
const supertest = require('supertest')
const app = require('../../app')
const meta = require('../meta')

const server = app.listen()
const request = supertest.agent(server)

test('User list', async t => {
  const res = await request
    .get('/api/user/list')

  t.is(res.status, 200)
  t.is(res.type, 'application/json')
  t.truthy(Array.isArray(res.body.list))

  if (res.body.list.length > 0) {
    t.truthy(res.body.list[0].uid)
    t.truthy(res.body.list[0].nick)
  }
})

test('User Find One', async t => {
  const res = await request
    .get('/api/user/admin')

  t.is(res.status, 200)
  t.is(res.type, 'application/json')
  t.is(res.body.user.uid, meta.users.admin.uid)
  t.is(res.body.user.nick, meta.users.admin.nick)

  // no secret info
  t.falsy(res.body.user.pwd)
})

test('User should fail to find one', async t => {
  const res = await request
    .get('/api/user/notexist')

  t.is(res.status, 400)
  t.is(res.type, 'application/json')
  t.truthy(res.body.error)
})

test.after.always('close server', t => {
  server.close()
})
