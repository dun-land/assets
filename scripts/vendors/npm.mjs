import { basename } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { execSync } from 'child_process'

import { x } from 'tar'
import compare from 'semver/functions/compare.js'

import { download, s3Dir } from '../utils.mjs'
import glob from 'minimatch'
import { resolve } from 'path'
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

  // 저장 디렉토리 생성
  const savePath = resolve(projectDir, lastVersion)
  await mkdir(savePath, { recursive: true })

  const downloadPath = await download(url)

  await x({
    cwd: tmpdir(),
    file: downloadPath,
    newer: true,
    filter: (path) => {
      // 라이선스 가져옴
      if (basename(path)  === (content.license ?? 'LICENSE')) {
        return true
      }

      // 패턴 매칭
      for (const pattern of content.files) {
        if (!glob(path, pattern, { matchBase: true })) {
          return false
        }
      }

      return true
    },
    onentry: async (entry) => {
      let filename = basename(entry.path)

      if (filename === content.license) {
        filename = 'LICENSE'
      }

      await writeFile(resolve(savePath, filename), entry)
    }
  })

  return Promise.resolve(savePath)
}

const version = (packageName) => {
  const json = execSync(`npm info ${packageName} --json`).toString()
  const obj = JSON.parse(json)

  return `v${obj['dist-tags'].latest}`
}
