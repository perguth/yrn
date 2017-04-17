#!/usr/bin/env node

const fs = require('fs')
const spawn = require('child_process').spawn
const exec = require('child_process').exec
const execSync = require('child_process').execSync
const path = require('path')
const argv = require('yargs').argv
const root = require('find-root')(process.cwd())
const parallel = require('run-parallel')
const jsonFile = require('jsonfile')

const pkgPath = root + '/package.json'
const originalPkg = require(pkgPath)
const hadYarnIntegrityFile = fs.existsSync(root + '/node_modules/.yarn-integrity')
const hadYarnLockFile = fs.existsSync(root + '/yarn.lock')

var modulePath = root + '/node_modules'
var symlinkPath = modulePath + '/.bin'
var oldModules = []
var oldSymlinks = []

if (argv._[0] === 'install' && !argv.g) {
  prepareArgsAndCallYarn()
} else callNpm()

function prepareArgsAndCallYarn () {
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

  if (oldModules) execSync(`mv ${modulePath} ${root}/stash-node_modules`)

  callYarn(yarnArgs, pkgNames, removePackages)

  function removePackages () {
    if (!argv.save && !argv.saveDev) {
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
  }
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}

function callNpm () {
  let out$ = spawn('npm', process.argv.slice(2))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function callYarn (yarnArgs, pkgNames, cb) {
  var out$ = spawn('yarn', [...yarnArgs, ...pkgNames])
  out$.on('exit', cb)
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function removeDependencies (pkgNames) {
  if (!fs.existsSync(pkgPath)) return
  let newPkg = jsonFile.readFileSync(pkgPath)

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
  jsonFile.writeFileSync(pkgPath, newPkg, {spaces: 2})
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
    toBeRestored.forEach(name => calls.push(done => {
      exec('mv ' + stashedModulesPath + name + ' ' + modulePath, {}, done)
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
