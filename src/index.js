#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ping from 'node-http-ping'
import { exec, execSync } from 'child_process'
import path from 'path'
// import PKG from '../package.json' assert { type: 'json' }
// import registries from '../registries.json' assert { type: 'json' }
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const PKG = require('../package.json')
import fs from 'fs'
import { readFile } from 'fs/promises'

const whiteList = ['npm', 'yarn', 'tencent', 'cnpm', 'taobao', 'npmMirror'] //白名单
let registries = null
try {
  registries = JSON.parse(await readFile(new URL('../registries.json', import.meta.url), { encoding: 'utf-8' }))
  program.version(PKG.version)
} catch (error) {
  console.error(error.message);
}

const deal = (url) => {
  const arr = url.split('')
  return arr[arr.length - 1] == '/' ? (arr.pop() && arr.join('')) : arr.join('')
}
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
  console.log(list.join('\r\n'));
})
program.command('use').description('请选择镜像').action(() => {
  inquirer.prompt([
    {
      type: 'list',
      name: 'sel',
      message: chalk.greenBright('请选择镜像'),
      choices: Object.keys(registries)
    }
  ]).then((res) => {
    const registry = registries[res.sel].registry.trim()
    const shell = `npm config set registry=${registry}`
    exec(shell,(error,stdout) => {
      if (error) {
        console.error(chalk.red('Error'), error)
      } else {
        console.log(chalk.blue('Ok'))
      }
    })
  })
})
program.command('current').description('查看当前镜像源').action(async () => {
  const registry = await getOrigin()
  const value = Object.keys(registries).find(item => {
    if(registries[item].registry === registry.trim()) {
      return item
    }
  })
  if (value) {
    console.log(chalk.blue('当前镜像源:', value))
  } else {
      console.log(chalk.green('当前镜像源:', registry))
  }
})
program.command('ping').description('测试镜像地址速度').action(async () => {
  inquirer.prompt([
    {
      type: 'list',
      name: 'sel',
      message: chalk.greenBright('请选择镜像'),
      choices: Object.keys(registries)
    }
  ]).then((res) => {
    const url = registries[res.sel].ping.trim()
    ping(url).then(time => console.log(chalk.blue(`Response time: ${time} ms`)))
    .catch(() => console.log(chalk.red(`Failed to ping ${res.sel}`)))
  })
})

program.command('add').description('自定义镜像').action(() => {
  inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '请输入镜像名称',
      validate(answer) {
        if (!answer.trim()) {
          return '名称不能为空'
        }
        if (Object.keys(registries || {}).includes(answer)) {
          return `不能起名${answer}跟保留字冲突`
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'url',
      message: '请输入镜像地址',
      validate(answer) {
        if (!answer.trim()) {
          return '名称不能为空'
        }
        return true
      }
    }
  ]).then((res) => {
    registries[res.name] = {
      home: res.url.trim(),
      registry: res.url.trim(),
      ping: deal(res.url.trim())
    }
    try {
      fs.writeFileSync(new URL('../registries.json', import.meta.url), JSON.stringify(registries, null, 4))
      console.log(chalk.blue('添加完成'))
    } catch (error) {
      console.log(chalk.red(error))
    }
  })
})
program.command('del').description('删除自定义的源').action(() => {
  const keys = Object.keys(registries)
  if(keys.length === whiteList.length) {
    return console.log(chalk.red('当前无自定义源可以删除!'))
  } else {
    const diff = keys.filter(key => !whiteList.includes(key))
    inquirer.prompt([
      {
        type: 'list',
        name: 'select',
        message: '请选择删除的镜像',
        choices: diff
      }
    ]).then(async (res) => {
      const current = await getOrigin()
      const selectOrigin = registries[res.select]
      if(current.trim() === selectOrigin.registry.trim()) {
        console.log(chalk.red(`当前还在使用该镜像${registries[res.select].registry},请切换其他镜像删除`))
      } else {
        try {
          delete registries[res.select]
          fs.writeFileSync(new URL('../registries.json', import.meta.url), JSON.stringify(registries, null, 4))
          console.log(chalk.green('SUCCESS 操作完成'))
        } catch (error) {
          console.log(chalk.red(error))
        }
      }
    })
  }
})
program.command('rename').description('重命名').action(() => {
  const keys = Object.keys(registries)
  if(keys.length === whiteList.length) {
    return console.log(chalk.red('当前无自定义源可以重命名!'))
  } else {
    const diff = keys.filter(key => !whiteList.includes(key))
    inquirer.prompt([
      {
        type: 'list',
        name: 'select',
        message: '请选择删除的镜像',
        choices: diff
      },
      {
        type: 'input',
        name: 'rename',
        message: '请输入镜像名称',
        validate(answer) {
          if (!answer.trim()) {
            return '名称不能为空'
          }
          if (Object.keys(registries || {}).includes(answer)) {
            return `不能起名${answer}跟保留字冲突`
          }
          return true
        }
      },
    ]).then(async (res) => {
      registries[res.rename] = Object.assign({}, registries[res.select])
      delete registries[res.select]
      try {
        fs.writeFileSync(new URL('../registries.json', import.meta.url), JSON.stringify(registries, null, 4))
        console.log(chalk.greenBright(`SUCCESS 重命名完成 ${res.rename}`))
      } catch (error) {
        console.log(chalk.red(error))
      }
      
    })
  }
})
program.command('edit').description('编辑自定义的源').action(async () => {
  const keys = Object.keys(registries)
  if(keys.length === whiteList.length) {
    return console.log(chalk.red('当前无自定义源可以编辑!'))
  }
  const diff = keys.filter(key => !whiteList.includes(key))
  const { select } = await inquirer.prompt([
    {
      type: 'list',
      name: 'select',
      message: '请选择需要编辑的源',
      choices: diff
    }
  ])
  const { registryUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "registryUrl",
      message: "输入修改后的镜像地址",
      default: () => registries[select].registry,
      validate(registryUrl) {
          if (!registryUrl.trim())
              return "镜像地址不能为空"
          return true
      }
    }
  ])
  registries[select] = {
    home: registryUrl.trim(),
    registry: registryUrl.trim(),
    ping: deal(registryUrl.trim())
  }
  try {
    fs.writeFileSync(new URL('../registries.json', import.meta.url), JSON.stringify(registries, null, 4))
    console.log(chalk.blue('修改完成'))
  } catch (error) {
    console.log(chalk.red(error))
  }
})
program.parse(process.argv)
