#!/usr/bin/env node

const fs = require('fs')
const spawn = require('child_process').spawn
const argv = require('yargs').argv
const originalPkg = require('./package.json')

var yarnLockExists = fs.existsSync('./yarn.lock')

if (argv._[0] === 'install') {
  let npmArgs = argv._.slice(1)
  let yarnArgs = []
  if (argv.saveDev) {
    npmArgs.unshift(argv.saveDev)
    ;[].push.apply(yarnArgs, ['add', '--dev'])
  }

  if (npmArgs.length === 0) {
    yarnArgs.push('install')
    let out$ = spawn('yarn', [...yarnArgs])
    out$.stdout.pipe(process.stdout)
    out$.stderr.pipe(process.stderr)
  } else {
    if (yarnArgs.length === 0) yarnArgs.push('add')

    // synchronously work through all yarn calls:
    // `npm install a b` => `yarn add a && yarn add b`
    let yarnCalls = []
    npmArgs.forEach((pkgName, i) => {
      if (i === 0) {
        yarnCalls.push(callYarn.bind(null, pkgName, yarnArgs, () => {}))
        return
      }
      yarnCalls.push(callYarn.bind(null, pkgName, yarnArgs, yarnCalls[i - 1]))
    })
    yarnCalls[yarnCalls.length - 1]()
  }
} else {
  // just relay to npm
  let args = argv._.slice(1)
  let out$ = spawn('npm', args)
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}

function callYarn (pkgName, yarnArgs, cb) {
  console.log(`# yarn ${yarnArgs} ${pkgName}`)
  var out$ = spawn('yarn', [...yarnArgs, pkgName])
  out$.on('exit', () => {
    let pkgPath = './package.json'
    if (!argv.save && !argv.saveDev && fs.existsSync(pkgPath)) {
      // `yarn add a` adds "a" to the package.json but `npm install a` does not
      // so let's delete "a" if it's not already there
      let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      if (!argv.save) {
        if (!originalPkg.dependencies[pkgName]) {
          delete pkg.dependencies[pkgName]
        }
      }
      if (!argv.saveDev) {
        if (!originalPkg.devDependencies) {
          delete pkg.devDependencies[pkgName]
        }
      }
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8')
    }
    if (!yarnLockExists) fs.unlinkSync('./yarn.lock')
    cb()
  })
  out$.stdout.pipe(process.stdout)
  out$.stderr.pipe(process.stderr)
}
