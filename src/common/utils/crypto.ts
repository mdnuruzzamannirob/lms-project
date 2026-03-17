import crypto from 'node:crypto'

const DEFAULT_SCRYPT_KEY_LENGTH = 64

export const generateRandomToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex')
}

export const hashStringSha256 = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export const hashWithScrypt = async (value: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex')

  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      value,
      salt,
      DEFAULT_SCRYPT_KEY_LENGTH,
      (error, derivedKey) => {
        if (error) {
          reject(error)
          return
        }

        resolve(derivedKey as Buffer)
      },
    )
  })

  return `${salt}:${key.toString('hex')}`
}

export const compareScryptHash = async (
  value: string,
  hashedValue: string,
): Promise<boolean> => {
  const [salt, existingHash] = hashedValue.split(':')

  if (!salt || !existingHash) {
    return false
  }

  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      value,
      salt,
      DEFAULT_SCRYPT_KEY_LENGTH,
      (error, derivedKey) => {
        if (error) {
          reject(error)
          return
        }

        resolve(derivedKey as Buffer)
      },
    )
  })

  const existingBuffer = Buffer.from(existingHash, 'hex')

  if (existingBuffer.length !== key.length) {
    return false
  }

  return crypto.timingSafeEqual(existingBuffer, key)
}
