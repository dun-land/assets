import { join, extname, resolve, basename } from 'path'
import { mkdir, readdir, writeFile } from 'fs/promises'

import { minify } from 'minify'
import rcompare from 'semver/functions/rcompare.js'

import npm from '../vendors/npm.mjs'
import { parseYml, buckets } from '../utils.mjs'

const cssDir = join(buckets, '')
const css = await parseYml('css')

for (const [name, content] of Object.entries(css)) {
  // 프로젝트 디렉토리 생성
  const projectDir = join(cssDir, name)
  await mkdir(projectDir, { recursive: true })

  // 버전 디렉토리를 가져옴
  const versions = await readdir(projectDir)

  // 저장된 최신 버전을 가져온다.
  const [currentVersion] = versions.sort((x, y) => rcompare(x, y, false))

  // 다운로드 및 파일 추출
  const savePath = await npm(content, currentVersion, projectDir)

  // 이미 최신버전
  if (!savePath) {
    continue
  }

  // 후처리, minifed 버전을 생성한다.
  if (content.minified) {
    const files = await readdir(savePath)

    for (const file of files) {
      if (extname(file) === '.css') {
        const css = await minify(join(savePath, file))
        await writeFile(resolve(savePath, basename(file, '.css') + '.min.css'), css)
      }
    }
  }
}
