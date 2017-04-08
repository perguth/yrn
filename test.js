const fs = require('fs')
const test = require('flip-tape') // eslint-disable-line
const jsonFile = require('jsonfile')
const execSync = require('child_process').execSync
const path = require('path')
const parallel = require('run-parallel')

var testDirYrn
var testPkgPathYrn
var testDirNpm
var testPkgPathNpm

'Behaves like NPM regarding `package.json`'.test(t => {
  t.plan(5)
  prepareDirs()

  '`yrn` runs'.doesNotThrow(x => execSync('./bin.js help'))

  run(['yrn'], 'install --save-dev tape')
  { let newPkg = readPkg(testPkgPathYrn)
    'devDependency was added'.ok(newPkg.devDependencies.tape)
  }

  run(['yrn'], 'uninstall --save-dev tape')
  { let newPkg = readPkg(testPkgPathYrn)
    'devDependency was removed'.notOk(newPkg.devDependencies.tape)
  }

  run(['yrn'], 'install --save tape')
  { let newPgks = readPkg(testPkgPathYrn)
    'dependency was added'.ok(newPgks.dependencies.tape)
  }

  run(['yrn'], 'uninstall --save tape')
  { let newPgks = readPkg(testPkgPathYrn)
    'dependency was removed'.notOk(newPgks.dependencies.tape)
  }
  removeDirs()
})

'Behaves like NPM regarding `node_modules` and Yarns files'.test(t => {
  t.plan(3)
  prepareDirs()
  run(['yrn', 'npm'], 'install tape')
  run(['yrn', 'npm'], 'install standard')

  'previous packages got restored'.deepEqual(
    getDirectories(testDirYrn + '/node_modules'),
    getDirectories(testDirNpm + '/node_modules')
  )

  // yarn and npm create .bin content differently
  /*
  'previous symlinks got restored'.deepEqual(
    fs.readdirSync(testDirYrn + '/node_modules/.bin'),
    fs.readdirSync(testDirNpm + '/node_modules/.bin')
  )
  */

  '`yarn.lock` got removed'.notOk(
    fs.existsSync(testDirYrn + '/yarn.lock')
  )

  '`.yarn-integrity` got removed'.notOk(
    fs.existsSync(testDirYrn + '/node_modules/.yarn-integrity')
  )

  removeDirs()
})

'Installs saved dependencies like NPM'.test(t => {
  t.plan(1)
  prepareDirs()
  let testPkg = {
    license: 'MIT',
    description: '-',
    repository: '-',
    dependencies: { tape: '*' },
    devDependencies: { standard: '*' }
  }
  jsonFile.writeFileSync(testPkgPathYrn, testPkg)
  jsonFile.writeFileSync(testPkgPathNpm, testPkg)

  run(['yrn', 'npm'], 'install')

  '`yrn install`'.deepEqual(
    getDirectories(testDirYrn + '/node_modules'),
    getDirectories(testDirNpm + '/node_modules')
  )
  removeDirs()
})

'`yrn` is faster than NPM'.test(t => {
  t.plan(1)
  prepareDirs()

  let start
  let totalYrn
  let totalNpm

  parallel([done => {
    start = new Date().getTime()
    run(['yrn'], 'install choo webtorrent')
    run(['yrn'], 'install tape standard')
    run(['yrn'], 'install signalhub webrtc-swarm')
    totalYrn = new Date().getTime() - start
    done()
  }, done => {
    start = new Date().getTime()
    run(['npm'], 'install choo webtorrent')
    run(['npm'], 'install tape standard')
    run(['npm'], 'install signalhub webrtc-swarm')
    totalNpm = new Date().getTime() - start
    done()
  }], x => {
    `yrn is >2x faster than NPM`.ok(totalNpm * 2 > totalYrn)
    removeDirs()
  })
})

function prepareDirs () {
  testDirYrn = fs.mkdtempSync('./test-')
  testPkgPathYrn = testDirYrn + '/package.json'
  testDirNpm = fs.mkdtempSync('./test-')
  testPkgPathNpm = testDirNpm + '/package.json'
  let testPkg = { license: 'MIT', description: '-', repository: '-' }
  jsonFile.writeFileSync(testPkgPathYrn, testPkg)
  jsonFile.writeFileSync(testPkgPathNpm, testPkg)
}

function removeDirs () {
  execSync('rm -rf ' + testDirYrn)
  execSync('rm -rf ' + testDirNpm)
}

function run (bin, cmd) {
  var runYrn = bin.includes('yrn')
  var runNpm = bin.includes('npm')
  if (runYrn) execSync('cd ' + testDirYrn + ' && ' + './../bin.js ' + cmd)
  if (runNpm) execSync('cd ' + testDirNpm + ' && ' + 'npm ' + cmd)
}

function readPkg (path, raw) {
  return raw
    ? fs.readFileSync(path, {encoding: 'utf8'})
    : jsonFile.readFileSync(path)
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}
