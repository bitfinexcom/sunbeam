'use strict'

const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const browserify = require('browserify')

const eosLib = path.join(__dirname, 'eosjs-dist.js')
if (!fs.existsSync(eosLib)) {
  browserify(require.resolve('eosjs'), { standalone: 'Eos' })
    .bundle()
    .pipe(fs.createWriteStream(eosLib))
    .on('finish', cont)
} else {
  cont()
}

function cont () {
  const src = path.join(__dirname, '..', '..', 'index.js')
  const target = fs.createWriteStream(path.join(__dirname, 'sunbeam-dist.js'))
  browserify(src)
    .transform('babelify', {
      presets: [ '@babel/preset-env' ]
    })
    .bundle()
    .pipe(target)
    .on('finish', serve)
}

function serve () {
  app.use(
    express.static(__dirname, {
      index: [ 'index.html' ],
      extensions: [ 'html' ]
    })
  )

  const port = 1337
  app.listen(port, () => {
    console.log(`listening on port ${port}!`)
    console.log(`http://localhost:${port}`)
  })
}
