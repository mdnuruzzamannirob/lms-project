import { config } from '../../config'
import { logger } from '../../config/logger'
import { AppError } from '../errors/AppError'

export type PushPayload = {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

interface PushProvider {
  send(payload: PushPayload): Promise<void>
}

class ConsolePushProvider implements PushProvider {
  async send(payload: PushPayload): Promise<void> {
    logger.info('Console push provider dispatched notification', {
      token: payload.token,
      title: payload.title,
    })
  }
}

class FcmPushProvider implements PushProvider {
  private readonly serverKey: string

  constructor(serverKey?: string) {
    if (!serverKey) {
      throw new AppError('FCM_SERVER_KEY is required for fcm push provider')
    }

    this.serverKey = serverKey
  }

  async send(payload: PushPayload): Promise<void> {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${this.serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new AppError(`FCM push send failed: ${body}`, response.status)
    }
  }
}

const createPushProvider = (): PushProvider => {
  if (config.providers.push === 'fcm') {
    return new FcmPushProvider(config.providers.fcmServerKey)
  }

  return new ConsolePushProvider()
}

const provider = createPushProvider()

export const pushService = {
  sendPush: async (payload: PushPayload): Promise<void> => {
    await provider.send(payload)
  },
}
