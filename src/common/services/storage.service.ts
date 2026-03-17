import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { config } from '../../config'
import { AppError } from '../errors/AppError'

export type UploadPayload = {
  fileName: string
  contentType: string
  buffer: Buffer
  folder?: string
}

export type UploadResult = {
  url: string
  key: string
  contentType: string
  size: number
}

interface StorageProvider {
  upload(payload: UploadPayload): Promise<UploadResult>
}

class LocalStorageProvider implements StorageProvider {
  async upload(payload: UploadPayload): Promise<UploadResult> {
    const extension = path.extname(payload.fileName)
    const safeFolder = payload.folder
      ? payload.folder.replace(/[^a-zA-Z0-9/_-]/g, '')
      : ''
    const key = path.posix.join(
      safeFolder,
      `${crypto.randomUUID()}${extension}`,
    )
    const absoluteRoot = path.resolve(
      process.cwd(),
      config.providers.localStoragePath,
    )
    const absoluteFilePath = path.join(absoluteRoot, key)
    const absoluteDir = path.dirname(absoluteFilePath)

    await fs.mkdir(absoluteDir, { recursive: true })
    await fs.writeFile(absoluteFilePath, payload.buffer)

    return {
      url: `${config.providers.localStorageBaseUrl}/${key}`,
      key,
      contentType: payload.contentType,
      size: payload.buffer.byteLength,
    }
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  async upload(payload: UploadPayload): Promise<UploadResult> {
    const cloudName = config.providers.cloudinaryCloudName
    const apiKey = config.providers.cloudinaryApiKey
    const apiSecret = config.providers.cloudinaryApiSecret

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required for cloudinary storage provider',
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = payload.folder ?? 'uploads'
    const publicId = `${folder}/${crypto.randomUUID()}`
    const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto
      .createHash('sha1')
      .update(signatureBase)
      .digest('hex')

    const formData = new FormData()
    const blob = new Blob([payload.buffer], { type: payload.contentType })

    formData.append('file', blob, payload.fileName)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('public_id', publicId)
    formData.append('signature', signature)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      },
    )

    if (!response.ok) {
      const body = await response.text()
      throw new AppError(`Cloudinary upload failed: ${body}`, response.status)
    }

    const result = (await response.json()) as {
      secure_url: string
      public_id: string
      bytes: number
      resource_type: string
    }

    return {
      url: result.secure_url,
      key: result.public_id,
      contentType: payload.contentType,
      size: result.bytes,
    }
  }
}

const createStorageProvider = (): StorageProvider => {
  if (config.providers.storage === 'cloudinary') {
    return new CloudinaryStorageProvider()
  }

  return new LocalStorageProvider()
}

const provider = createStorageProvider()

export const storageService = {
  uploadFile: async (payload: UploadPayload): Promise<UploadResult> => {
    return provider.upload(payload)
  },
}
