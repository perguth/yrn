#!/usr/bin/env node

const fs = require('fs')
const spawn = require('child_process').spawn
const argv = require('yargs').argv
const root = require('find-root')(process.cwd())

const pkgPath = root + '/package.json'
const originalPkg = require(pkgPath)
const hadYarnFile = fs.existsSync(root + '/yarn.lock')

if (argv._[0] === 'install') {
  let pkgNames = argv._.slice(1)
  let yarnArgs = []

  if (argv.save || argv.saveDev) {
    yarnArgs = ['add']
  }
  if (argv.save) pkgNames.push(argv.save)
  if (argv.saveDev) {
    pkgNames.push(argv.saveDev)
    yarnArgs.push('--dev')
  }
  if (!pkgNames.length) yarnArgs = ['install']

  callYarn(yarnArgs, pkgNames)
} else {
  let out$ = spawn('npm', process.argv.slice(2))
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function callYarn (yarnArgs, pkgNames) {
  var out$ = spawn('yarn', [...yarnArgs, ...pkgNames])
  out$.on('exit', err => {
    if (err) {
      console.log(err)
      process.exit(1)
    }
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
    if (!hadYarnFile) fs.unlinkSync(root + '/yarn.lock')
  })
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}
