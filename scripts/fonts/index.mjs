import { execSync } from 'child_process'
import fetch from 'node-fetch'
import { mkdir, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join, resolve } from 'path'
import rcompare from 'semver/functions/rcompare.js'

import subsets from './subsets.mjs'
import { download, parseYml, s3Dir, tarExtract } from '../utils.mjs'

const fonts = await parseYml('fonts')
const pyftsubsetOptions = [
  '--glyph-names',
  '--symbol-cmap',
  '--legacy-cmap',
  '--notdef-glyph',
  '--notdef-outline',
  '--recommended-glyphs',
  '--name-legacy',
  '--drop-tables=',
  '--layout-features=*',
  '--name-IDs=*',
  '--name-languages=*',
].join(' ')


for (const [name, content] of Object.entries(fonts)) {
  // 디렉토리 생성
  const projectDir = join(s3Dir, 'fonts', name)
  await mkdir(projectDir, { recursive: true })

  // 버전 디렉토리를 가져옴
  const versions = await readdir(projectDir)

  // S3에 저장된 최신 버전을 가염
  const [currentVersion] = versions.sort((x, y) => rcompare(x, y, false))

  // 다운로드
  const savePath = await github(content, currentVersion, projectDir)
}

async function github(content, currentVersion, projectDir) {
  const res = await fetch(`https://api.github.com/repos/${content.github}/releases/latest`)

  if (!res.ok) {
    return undefined
  }

  const json = await res.json()

  const lastVersion = json.tag_name

  // 동일한 버전이면 처리 안함
  if (currentVersion >= lastVersion) {
    return undefined
  }

  // 다운로드
  // const downloadPath = await download(json.tarball_url)
  const downloadPath = 'C:\\Users\\Jonathan\\AppData\\Local\\Temp\\dun.land\\v1.3.0'

  // 저장디렉토리 생성
  const savePath = resolve(projectDir, lastVersion)
  await mkdir(savePath, { recursive: true })

  // 압축 해제
  const originalFonts = await tarExtract(content, downloadPath, tmpdir())

  for (const originalFontPath of originalFonts) {
    for (const [key, text] of Object.entries(subsets)) {
      for (const format of ['woff2' ,'woff']) {
        const outputFile = join(savePath, basename(originalFontPath, '.ttf') + `.${key}.${format}`)
        execSync(`pyftsubset ${originalFontPath} ${pyftsubsetOptions} --flavor=${format} --text=${text} --output-file=${outputFile}`)
      }
    }
  }
}
