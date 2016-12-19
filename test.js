const fs = require('fs')
const test = require('flip-tape') // eslint-disable-line
const jsonFile = require('jsonfile')
const execSync = require('child_process').execSync
const path = require('path')

var testDirYrn
var testPkgDirYrn
var testDirNpm
var testPkgDirNpm

'Installs saved dependencies like NPM'.test(t => {
  t.plan(1)
  prepareDirs()
  let testPkg = {
    license: 'MIT',
    description: '-',
    repository: '-',
    dependencies: { tape: '4.x' },
    devDependencies: { standard: '8.x' }
  }
  jsonFile.writeFileSync(testPkgDirYrn, testPkg)
  jsonFile.writeFileSync(testPkgDirNpm, testPkg)

  run(['yrn', 'npm'], 'install')

  '`yrn install`'.deepEqual(
    getDirectories(testDirYrn + '/node_modules'),
    getDirectories(testDirNpm + '/node_modules')
  )
  removeDirs()
})

'Behaves like NPM regarding `package.json`'.test(t => {
  t.plan(5)
  prepareDirs()

  '`yrn` runs'.doesNotThrow(x => execSync('./bin.js help'))

  { let newPgks = run(['yrn'], 'install --save-dev tape')
    'devDependency was added'.ok(newPgks[0].devDependencies.tape)
  }

  { let newPgks = run(['yrn'], 'uninstall --save-dev tape')
    'devDependency was removed'.notOk(newPgks[0].devDependencies.tape)
  }

  { let newPgks = run(['yrn'], 'install --save tape')
    'dependency was added'.ok(newPgks[0].dependencies.tape)
  }

  { let newPgks = run(['yrn'], 'uninstall --save tape')
    'dependency was removed'.notOk(newPgks[0].dependencies.tape)
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

function run (bin, cmd) {
  var runYrn = bin.includes('yrn')
  var runNpm = bin.includes('npm')
  if (runYrn) execSync('cd ' + testDirYrn + ' && ' + './../bin.js ' + cmd)
  if (runNpm) execSync('cd ' + testDirNpm + ' && ' + 'npm ' + cmd)

  return [
    runYrn ? jsonFile.readFileSync(testPkgDirYrn) : null,
    runNpm ? jsonFile.readFileSync(testPkgDirNpm) : null
  ]
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}
