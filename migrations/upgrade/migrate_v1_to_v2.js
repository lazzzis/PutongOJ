require('../../config/db')
const Solution = require('../../models/Solution')
const Problem = require('../../models/Problem')
const Contest = require('../../models/Contest')
const ID = require('../../models/ID')
const config = require('../../config')

const uuid = require('uuid/v4')
const fse = require('fs-extra')
const { resolve } = require('path')

/*
对原有的 testcase 增加 id 标记
*/
async function testcaseBuild (problem) {
  async function update (problem) {
    const pid = problem.pid

    // testdata
    if (!fse.existsSync(resolve(__dirname, `../../data/${pid}/test.in`))) {
      return
    }
    const solutions = await Solution.find({ pid }).exec()
    const meta = {
      testcases: []
    }
    const newid = uuid()
    meta.testcases.push({
      uuid: newid
    })
    await Promise.all([
      fse.copy(resolve(__dirname, `../../data/${pid}/test.in`), resolve(__dirname, `../../data/${pid}/${newid}.in`)),
      fse.copy(resolve(__dirname, `../../data/${pid}/test.out`), resolve(__dirname, `../../data/${pid}/${newid}.out`)),
      fse.writeJson(resolve(__dirname, `../../data/${pid}/meta.json`), meta, { spaces: 2 })
    ])
    solutions.forEach((solution) => {
      if (solution.code.length < 6) {
        solution.code += ' Deprecated (Appended by System)'
      }
      solution.testcases = [{
        uuid: newid,
        judge: solution.judge,
        time: solution.time,
        memory: solution.memory
      }]
    })
    return Promise.all(solutions.map(s => s.save()))
  }
  const problems = await Problem.find().exec()
  return Promise.all(problems.map(update))
}

/**
 * 之前的数据里的 Contest model 没有 ranklist 属性，这个函数在现有数据库基础上生成 ranklist
 */
async function ranklistBuild () {
  async function update (contest) {
    const ranklist = {}
    const { cid } = contest
    const solutions = await Solution.find({
      mid: cid
    })
    for (const solution of solutions) {
      const { uid } = solution
      const row = (uid in ranklist) ? ranklist[uid] : { uid }
      const { pid } = solution
      const item = (pid in row) ? row[pid] : {}
      if ('wa' in item) {
        if (item.wa >= 0) continue
        if (solution.judge === config.judge.Accepted) {
          item.wa = -item.wa
          item.create = solution.create
        } else item.wa --
      } else {
        if (solution.judge === config.judge.Accepted) {
          item.wa = 0
          item.create = solution.create
        } else item.wa = -1
      }
      row[pid] = item
      ranklist[uid] = row
    }
    contest.ranklist = ranklist
    return contest.save()
  }
  const contests = await Contest.find({}).exec()
  return Promise.all(contests.map(update))
}

// 新版本里多了几个字段: 主要是 Group；其它，比如 Problem，就是顺便检查一下而已
async function databaseSetup () {
  const models = [
    'Problem', 'Solution', 'Contest', 'News', 'Group'
  ]
  return Promise.all(models.map(async (model) => {
    const item = await ID.findOne({ name: model }).exec()
    if (item != null && item.id >= 0) return
    return new ID({ name: model, id: 0 }).save()
  }))
}

async function main () {
  return Promise.all([
    testcaseBuild(),
    ranklistBuild(),
    databaseSetup()
  ])
}

main()
  .then(() => {
    console.log('ok')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(-1)
  })
