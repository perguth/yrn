const fs = require('fs')
const test = require('flip-tape') // eslint-disable-line
const jsonFile = require('jsonfile')
const execSync = require('child_process').execSync
const path = require('path')

var testDirYrn
var testPkgDirYrn
var testDirNpm
var testPkgDirNpm

function prepareDirs () {
  testDirYrn = fs.mkdtempSync('./test-')
  testPkgDirYrn = testDirYrn + '/package.json'
  testDirNpm = fs.mkdtempSync('./test-')
  testPkgDirNpm = testDirNpm + '/package.json'
  let testPkg = { license: 'MIT', description: '-', repository: '-' }
  jsonFile.writeFileSync(testPkgDirYrn, testPkg)
  jsonFile.writeFileSync(testPkgDirNpm, testPkg)
}
function removeDirs () {
  execSync('rm -rf ' + testDirYrn)
  execSync('rm -rf ' + testDirNpm)
}

'Changes to `package.json`'.test(t => {
  t.plan(5)
  prepareDirs()

  '`yrn` runs'.doesNotThrow(x => execSync('./bin.js help'))

  { let newPgks = run('install --save-dev')
    'devDependency was added'.ok(newPgks[0].devDependencies.tape)
  }

  { let newPgks = run('uninstall --save-dev')
    'devDependency was removed'.notOk(newPgks[0].devDependencies.tape)
  }

  { let newPgks = run('install --save')
    'dependency was added'.ok(newPgks[0].dependencies.tape)
  }

  { let newPgks = run('uninstall --save')
    'dependency was removed'.notOk(newPgks[0].dependencies.tape)
  }
  removeDirs()
})

'Changes to `node_modules` and `yarn` files'.test(t => {
  t.plan(4)
  prepareDirs()
  run('install', 'tape', true)
  run('install', 'standard', true)

  'previous packages got restored'.deepEqual(
    getDirectories(testDirYrn + '/node_modules'),
    getDirectories(testDirNpm + '/node_modules')
  )

  'previous symlinks got restored'.deepEqual(
    fs.readdirSync(testDirYrn + '/node_modules/.bin'),
    fs.readdirSync(testDirNpm + '/node_modules/.bin')
  )

  '`yarn.lock` got removed'.notOk(
    fs.existsSync(testDirYrn + '/yarn.lock')
  )

  '`.yarn-integrity` got removed'.notOk(
    fs.existsSync(testDirYrn + '/node_modules/.yarn-integrity')
  )

  removeDirs()
})

function run (cmd, pkgs, runNpm) {
  pkgs = pkgs || 'tape'
  if (runNpm) execSync('cd ' + testDirNpm + ' && ' + './../bin.js ' + cmd + ' tape')
  execSync('cd ' + testDirYrn + ' && ' + './../bin.js ' + cmd + ' tape')
  return [
    jsonFile.readFileSync(testPkgDirYrn),
    runNpm ? jsonFile.readFileSync(testPkgDirNpm) : null
  ]
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}
