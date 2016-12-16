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
const hadYarnLockFile = fs.existsSync(root + '/yarn.lock')
const hadYarnIntegrityFile = fs.existsSync(root + '/node_modules/.yarn-integrity')

var oldModules = []
var newModules = []

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
  }

  callYarn(yarnArgs, pkgNames)
} else {
  let out$ = spawn('npm', process.argv.slice(2))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function callYarn (yarnArgs, pkgNames) {
  let modulePath = root + '/node_modules'
  if (oldModules) execSync(`mv ${modulePath} ${root + '/stash-node_modules'}`)

  var out$ = spawn('yarn', [...yarnArgs, ...pkgNames])
  out$.on('exit', err => {
    if (err) process.exit(err)

    if (!argv.save && !argv.saveDev && fs.existsSync(pkgPath)) {
      // yarn maybe added new dependencies; let's delete them if so:
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
      // yarn maybe added a file; let's delete it if so:
      fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2), 'utf8')
    }

    if (oldModules) {
      newModules = getDirectories(modulePath)
      newModules.forEach(moduleName => {
        let i = oldModules.indexOf(moduleName)
        if (i !== -1) oldModules.splice(i, 1)
      })
      oldModules.forEach((moduleName, i) => {
        exec(`mv ${root}/stash-node_modules/${moduleName} ${modulePath}`, {}, err => {
          if (err) process.exit(err)
          if (i === moduleName.length - 1) exec(`rm -rf ${root}/stash-node_modules`)
        })
      })
    }

    if (!hadYarnLockFile) fs.unlink(root + '/yarn.lock')
    if (!hadYarnIntegrityFile) exec(`rm -rf ${root}/node_modules/.yarn-integrity`)
  })
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function getDirectories (dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory()
  })
}
