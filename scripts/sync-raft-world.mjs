import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const sourceDir = path.join(rootDir, 'assets', 'ラフトの世界')
const targetDir = path.join(rootDir, 'public', 'raft-world')

const ignoredNames = new Set([
  '.git',
  '.codex',
  'node_modules',
  'output',
  '.DS_Store',
])

const shouldCopy = (src) => {
  const name = path.basename(src)
  if (ignoredNames.has(name)) return false
  if (name.startsWith('.tmp')) return false
  if (name === 'package-lock.json' || name === 'package.json') return false
  return true
}

if (!existsSync(sourceDir)) {
  console.error(`raft-world source missing: ${sourceDir}`)
  process.exit(1)
}

mkdirSync(path.dirname(targetDir), { recursive: true })
rmSync(targetDir, { recursive: true, force: true })
cpSync(sourceDir, targetDir, {
  recursive: true,
  filter: shouldCopy,
})

console.log(`synced raft-world -> ${targetDir}`)
