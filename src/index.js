#!/usr/bin/env node
const { program } = require('commander')
const chalk = require('chalk')
const { execSync } = require('node:child_process')
const PKG = require('../package.json')
const registries = require('../registries.json');


program.version(PKG.version)


const getOrigin = async () => {
  return await execSync('npm get registry', { encoding: 'utf-8' })
}
program.command('ls').description('查看镜像').action( async ()=>{
  const res = await getOrigin()
  const keys = Object.keys(registries)
  const bucketsLen = Math.max(...keys.map(v=>v.length)) + 6
  const list = [] 

  keys.forEach(key => {
    const selectKey = registries[key].registry == res.trim() ? ('* ' + key) : ('  ' + key)
    const buckets = new Array(...selectKey)
    buckets.length = bucketsLen
    const prefix = Array.from(buckets).map(v => v ? v : '-').join('')
    list.push(prefix + ' ' + registries[key].registry)
  })
  console.log(chalk.blue('Hi !'));
  console.log(list.join('\r\n'));
})
program.parse(process.argv)
