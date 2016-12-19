#!/usr/bin/env node

const fs = require('fs')
const spawn = require('child_process').spawn
const exec = require('child_process').exec
const execSync = require('child_process').execSync
const path = require('path')
const argv = require('yargs').argv
const root = require('find-root')(process.cwd())
const parallel = require('run-parallel')

const pkgPath = root + '/package.json'
const originalPkg = require(pkgPath)
const hadYarnIntegrityFile = fs.existsSync(root + '/node_modules/.yarn-integrity')
const hadYarnLockFile = fs.existsSync(root + '/yarn.lock')

var modulePath = root + '/node_modules'
var symlinkPath = modulePath + '/.bin'
var oldModules = []
var oldSymlinks = []

if (argv._[0] === 'install') {
  let yarnArgs = []
  let pkgNames = argv._.slice(1)

  if (argv.save) {
    pkgNames = [...pkgNames, argv.save]
  }
  if (argv.saveDev) {
    yarnArgs = ['--dev']
    pkgNames = [...pkgNames, argv.saveDev]
  }
  yarnArgs = pkgNames.length > 0 ? ['add', ...yarnArgs] : ['install']

  { let path = root + '/node_modules'
    oldModules = fs.existsSync(path) && getDirectories(path)
    path += '/.bin'
    oldSymlinks = fs.existsSync(path) && fs.readdirSync(path)
  }

  if (oldModules) execSync(`mv ${modulePath} ${root + '/stash-node_modules'}`)

  callYarn(yarnArgs, pkgNames, x => {
    if (!argv.save && !argv.saveDev && fs.existsSync(pkgPath)) {
      removeDependencies(pkgNames)
    }
    restorePackagesAndSymlinks(x => {
      if (!hadYarnLockFile) {
        fs.unlink(root + '/yarn.lock')
      }
      if (!hadYarnIntegrityFile) {
        exec(`rm -rf ${root}/node_modules/.yarn-integrity`)
      }
      exec(`rm -rf ${root}/stash-node_modules`)
    })
  })
} else {
  let out$ = spawn('npm', process.argv.slice(2))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}

function callYarn (yarnArgs, pkgNames, cb) {
  var out$ = spawn('yarn', [...yarnArgs, ...pkgNames])
  out$.on('exit', cb)
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function removeDependencies (pkgNames) {
  let newPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkgNames.forEach(pkgName => {
    if (!argv.save) {
      if (originalPkg.dependencies && !originalPkg.dependencies[pkgName]) {
        delete newPkg.dependencies[pkgName]
      }
    }
    if (!argv.saveDev) {
      if (originalPkg.devDependencies && !originalPkg.devDependencies[pkgName]) {
        delete newPkg.devDependencies[pkgName]
      }
    }
  })
  fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2), 'utf8')
}

function restorePackagesAndSymlinks (cb) {
  var calls = []

  if (oldModules) {
    let newModules = getDirectories(modulePath)
    pushCalls(newModules, oldModules, './')
  }
  if (oldSymlinks) {
    let newSymlinks = fs.readdirSync(symlinkPath)
    pushCalls(newSymlinks, oldSymlinks, '.bin/')
  }

  parallel(calls, cb)

  function pushCalls (newItems, oldItems, dir) {
    let toBeRestored = findItemsToRestore(newItems, oldItems)
    let stashedModulesPath = `${root}/stash-node_modules/${dir}`
    toBeRestored.forEach(name => calls.push((arg, cb) => {
      exec('mv ' + stashedModulesPath + name + ' ' + modulePath, {}, cb)
    }))
  }
  function findItemsToRestore (newItems, oldItems) {
    newItems.forEach(moduleName => {
      let i = oldItems.indexOf(moduleName)
      if (i !== -1) oldItems.splice(i, 1)
    })
    return oldItems
  }
}
