import { basename, resolve } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { execSync } from 'child_process'

import { x } from 'tar'
import compare from 'semver/functions/compare.js'

import { download, tarExtract } from '../utils.mjs'
import glob from 'minimatch'
import { tmpdir } from 'os'

export default async (content, currentVersion, projectDir) => {
  // 웹에서 최신 버전을 파싱해옴
  const lastVersion = version(content.npm)

  // 최신버전이면 종료
  if (currentVersion !== undefined) {
    if (compare(lastVersion, currentVersion) < 1) {
      return;
    }
  }

  // 최신데이터 추가
  const removePrefixVersion = lastVersion.replace(/^v/, '')
  const url = `https://registry.npmjs.org/${content.npm}/-/${content.npm}-${removePrefixVersion}.tgz`

  // 파일 다운로드
  const downloadPath = await download(url)

  const savePath = resolve(projectDir, lastVersion)
  await mkdir(savePath, { recursive: true })

  // 저장 디렉토리 생성
  await tarExtract(content, downloadPath, savePath)

  return Promise.resolve(savePath)
}

const version = (packageName) => {
  const json = execSync(`npm info ${packageName}@latest --json`).toString()
  const obj = JSON.parse(json)

  return `v${obj.version}`
}
