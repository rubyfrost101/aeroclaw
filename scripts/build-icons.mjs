import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourceSvg = path.join(projectRoot, 'build', 'icon.svg')
const tempDir = path.join(projectRoot, 'build', '.icon-tmp')
const iconsetDir = path.join(projectRoot, 'build', 'icon.iconset')
const outputIcns = path.join(projectRoot, 'build', 'icon.icns')

const sizes = [16, 32, 128, 256, 512]

rmSync(tempDir, { recursive: true, force: true })
rmSync(iconsetDir, { recursive: true, force: true })
mkdirSync(tempDir, { recursive: true })
mkdirSync(iconsetDir, { recursive: true })

execFileSync('/usr/bin/qlmanage', ['-t', '-s', '1024', '-o', tempDir, sourceSvg], { stdio: 'ignore' })

const renderedPng = path.join(tempDir, 'icon.svg.png')
if (!existsSync(renderedPng)) {
  throw new Error('qlmanage did not generate the expected icon preview PNG.')
}

for (const size of sizes) {
  execFileSync('/usr/bin/sips', ['-z', String(size), String(size), renderedPng, '--out', path.join(iconsetDir, `icon_${size}x${size}.png`)], {
    stdio: 'ignore',
  })
  execFileSync(
    '/usr/bin/sips',
    ['-z', String(size * 2), String(size * 2), renderedPng, '--out', path.join(iconsetDir, `icon_${size}x${size}@2x.png`)],
    { stdio: 'ignore' },
  )
}

execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconsetDir, '-o', outputIcns], { stdio: 'ignore' })

rmSync(tempDir, { recursive: true, force: true })
