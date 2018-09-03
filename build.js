'use strict'

const browserify = require('browserify')
const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs')

function build (cb) {
  mkdirp.sync(path.join(__dirname, 'dist'))

  const src = path.join(__dirname, 'index.js')
  const target = fs.createWriteStream(path.join(__dirname, 'dist', 'index.js'))
  browserify([ src ])
    .transform('babelify', {
      presets: [
        [ '@babel/preset-env', { 'targets': { 'browsers': ['last 2 Chrome versions'] } } ]
      ]
    })
    .bundle()
    .pipe(target)
    .on('finish', () => {
      cb(null)
    })
}

build((err) => {
  if (err) throw err

  console.log('build done.')
})
