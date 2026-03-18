import crypto from 'node:crypto'

import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

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
  async upload(_payload: UploadPayload): Promise<UploadResult> {
    throw new AppError('Local storage is disabled in this deployment.', 500)
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    const cloudName = config.providers.cloudinaryCloudName
    const apiKey = config.providers.cloudinaryApiKey
    const apiSecret = config.providers.cloudinaryApiSecret

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required for storage.',
      )
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    })
  }

  async upload(payload: UploadPayload): Promise<UploadResult> {
    const folder = payload.folder ?? 'uploads'
    const publicId = `${folder}/${crypto.randomUUID()}`

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder,
          resource_type: 'auto',
          overwrite: false,
          unique_filename: false,
          use_filename: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error('Cloudinary upload failed.'))
            return
          }
          resolve(uploaded)
        },
      )

      stream.end(payload.buffer)
    })

    return {
      url: result.secure_url,
      key: result.public_id,
      contentType: payload.contentType,
      size: result.bytes,
    }
  }
}

const createStorageProvider = (): StorageProvider => {
  void LocalStorageProvider
  return new CloudinaryStorageProvider()
}

let provider: StorageProvider | null = null
const getProvider = (): StorageProvider => {
  if (!provider) {
    provider = createStorageProvider()
  }
  return provider
}

export const storageService = {
  uploadFile: async (payload: UploadPayload): Promise<UploadResult> => {
    return getProvider().upload(payload)
  },
}
