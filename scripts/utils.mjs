import fetch from 'node-fetch'
import { join, basename, resolve } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
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
