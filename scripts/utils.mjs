import glob from 'minimatch'
import fetch from 'node-fetch'
import { join, basename, resolve } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { x } from 'tar'
import { parse } from 'yaml'
import { tmpdir } from 'os'

export const rootDir = join(import.meta.url.replace(/^file:[\/\\]+/, ''), '..', '..')
export const dataDir = join(rootDir, '_data')
export const s3Dir = join(rootDir, 's3')

/**
 * @param {string} filename
 * @returns {Promise<object>}
 */
export const parseYml = async (filename) => {
  const file = await readFile(join(dataDir, `${filename}.yml`))
  return parse(file.toString())
}

export const download = async (url) => {
  const temp = resolve(tmpdir(), 'dun.land')
  await mkdir(temp, { recursive: true })

  const filename = basename(url)
  const path = join(temp, filename)

  const res = await fetch(url)
  if (!res.ok) {
    return Promise.reject(res.status)
  }

  await writeFile(path, res.body)

  return Promise.resolve(path)
}

export const tarExtract = async (content, path, savePath) => {
  const files = []

  await x({
    cwd: tmpdir(),
    file: path,
    newer: true,
    filter: (path) => {
      // 라이선스 가져옴
      if (basename(path)  === (content.license ?? 'LICENSE')) {
        return true
      }

      // 패턴 매칭
      if (content.files instanceof Array) {
        for (const pattern of content.files) {
          if (!glob(path, pattern, { matchBase: true })) {
            return false
          }
        }
      } else {
        for (const pattern of Object.values(content.files)) {
          if (!glob(path, pattern, { matchBase: true })) {
            return false
          }
        }
      }

      return true
    },
    onentry: async (entry) => {
      let filename = basename(entry.path)

      if (filename === content.license) {
        filename = 'LICENSE'
      }

      const save = resolve(savePath, filename)
      await writeFile(save, entry)

      if (filename !== 'LICENSE') {
        files.push(save)
      }
    }
  })

  return files
}
