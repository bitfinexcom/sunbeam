'use strict'

const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const browserify = require('browserify')
const async = require('async')
const mkdirp = require('mkdirp')

const tasks = [
  browserifyLibs,
  copy,
  jsx,
  serve
]

async.series(tasks, (err) => {
  if (err) throw err
})

function browserifyLibs (cb) {
  const tasks = [
    (cb) => {
      mkdirp.sync(path.join(__dirname, 'deps'))
      cb(null)
    },
    (cb) => {
      const eosLib = path.join(__dirname, 'deps', 'eosjs-dist.js')
      if (fs.existsSync(eosLib)) {
        return cb(null)
      }

      browserify(require.resolve('eosjs'), { standalone: 'Eos' })
        .bundle()
        .pipe(fs.createWriteStream(eosLib))
        .on('finish', cb)
    },

    (cb) => {
      const src = path.join(__dirname, '..', '..', 'index.js')
      const target = fs.createWriteStream(path.join(__dirname, 'deps', 'sunbeam-dist.js'))
      browserify(src)
        .transform('babelify', {
          presets: [ '@babel/preset-env' ]
        })
        .bundle()
        .pipe(target)
        .on('finish', () => {
          cb(null)
        })
    }
  ]

  async.parallel(tasks, (err) => {
    if (err) throw err
    cb(null)
  })
}

function jsx (cb) {
  const src = path.join(__dirname, 'jsx', 'app.jsx')
  const target = fs.createWriteStream(path.join(__dirname, 'jsx', 'app.js'))
  browserify(src)
    .transform('babelify', {
      presets: [
        '@babel/preset-env',
        [ '@babel/preset-react', { pragma: 'h' } ]
      ]
    })
    .bundle()
    .pipe(target)
    .on('finish', () => {
      cb(null)
    })
}

function copy (cb) {
  function _copy (name, t, cb) {
    if (fs.existsSync(t)) {
      return cb(null)
    }

    const target = fs.createWriteStream(t)
    fs.createReadStream(require.resolve(name))
      .pipe(target)
      .on('finish', cb)
  }

  const copyTasks = [
    (cb) => {
      const target = path.join(__dirname, 'deps', 'normalize.css')
      return _copy('normalize.css', target, cb)
    },
    (cb) => {
      const target = path.join(__dirname, 'deps', 'milligram.css')
      return _copy('milligram', target, cb)
    }
  ]

  async.parallel(copyTasks, (err) => {
    if (err) throw err
    cb(null)
  })
}

function serve () {
  app.use(
    express.static(__dirname, {
      index: [ 'index.html' ],
      extensions: [ 'html' ]
    })
  )

  app.use(
    '/app.css',
    express.static(path.join(__dirname, 'app.css'))
  )

  const port = 1337
  app.listen(port, () => {
    console.log(`listening on port ${port}!`)
    console.log(`http://localhost:${port}`)
  })
}
