#!/usr/bin/env node

const fs = require('fs')
const spawn = require('child_process').spawn
const exec = require('child_process').exec
const execSync = require('child_process').execSync
const path = require('path')
const argv = require('yargs').argv
const root = require('find-root')(process.cwd())

const pkgPath = root + '/package.json'
const originalPkg = require(pkgPath)
const hadYarnIntegrityFile = fs.existsSync(root + '/node_modules/.yarn-integrity')
const hadYarnLockFile = fs.existsSync(root + '/yarn.lock')

var modulePath = root + '/node_modules'
var symlinkPath = modulePath + '/.bin'
var oldModules = []
var newModules = []
var oldSymlinks = []
var newSymlinks = []

if (argv._[0] === 'install') {
  let yarnArgs = []
  let pkgNames = argv._.slice(1)

  if (argv.save) pkgNames.push(argv.save)
  if (argv.saveDev) {
    yarnArgs.push('--dev')
    pkgNames.push(argv.saveDev)
  }
  if (yarnArgs) yarnArgs.unshift('add')
  else yarnArgs = ['install']

  { let path = root + '/node_modules'
    oldModules = fs.existsSync(path) && getDirectories(path)
    path += '/.bin'
    oldSymlinks = fs.existsSync(path) && fs.readdirSync(path)
  }

  if (oldModules) execSync(`mv ${modulePath} ${root + '/stash-node_modules'}`)

  callYarn(yarnArgs, pkgNames, err => {
    if (err) process.exit(err)
    if (!argv.save && !argv.saveDev && fs.existsSync(pkgPath)) {
      removeDependencies(pkgNames)
    }
    restorePackagesAndSymlinks()
    if (!hadYarnLockFile) fs.unlink(root + '/yarn.lock')
  })
} else {
  let out$ = spawn('npm', process.argv.slice(2))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function callYarn (yarnArgs, pkgNames, cb) {
  var out$ = spawn('yarn', [...yarnArgs, ...pkgNames])
  out$.on('exit', err => cb(err))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}

function removeDependencies (pkgNames) {
  let newPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkgNames.forEach(pkgName => {
    if (!argv.save && newPkg.dependencies &&
      !originalPkg.dependencies[pkgName]) {
      delete newPkg.dependencies[pkgName]
    }
    if (!argv.saveDev && newPkg.devDependencies &&
      !originalPkg.devDependencies[pkgName]) {
      delete newPkg.devDependencies[pkgName]
    }
  })
  fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2), 'utf8')
}

function restorePackagesAndSymlinks () {
  var plzDelete = false

  // yarn maybe deleted installed packages; let's restore if so:
  if (oldModules) {
    newModules = getDirectories(modulePath)
    newModules.forEach(moduleName => {
      let i = oldModules.indexOf(moduleName)
      if (i !== -1) oldModules.splice(i, 1)
    })
    oldModules.push(null)
    oldModules.forEach((moduleName, i) => {
      if (!moduleName) {
        if (!plzDelete) {
          plzDelete = true
          return
        }
        if (!hadYarnIntegrityFile) exec(`rm -rf ${root}/node_modules/.yarn-integrity`)
        exec(`rm -rf ${root}/stash-node_modules`)
        return
      }
      exec(`mv ${root}/stash-node_modules/${moduleName} ${modulePath}`, {}, err => {
        if (err) process.exit(err)
      })
    })
  }

  // yarn maybe deleted `node_modules/.bin/` symlinks; let's restore if so:
  if (oldSymlinks) {
    newSymlinks = fs.readdirSync(symlinkPath)
    newSymlinks.forEach(symlinkName => {
      let i = oldSymlinks.indexOf(symlinkName)
      if (i !== -1) oldSymlinks.splice(i, 1)
    })
    oldSymlinks.push(null)
    oldSymlinks.forEach((symlinkName, i) => {
      if (!symlinkName) {
        if (!plzDelete) {
          plzDelete = true
          return
        }
        if (!hadYarnIntegrityFile) exec(`rm -rf ${root}/node_modules/.yarn-integrity`)
        exec(`rm -rf ${root}/stash-node_modules`)
        return
      }
      exec(`mv ${root}/stash-node_modules/.bin/${symlinkName} ${modulePath}/.bin`, {}, err => {
        if (err) process.exit(err)
      })
    })
  }
}
