import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

import { config } from '../../config'
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

class FirebasePushProvider implements PushProvider {
  constructor() {
    if (
      !config.providers.firebaseProjectId ||
      !config.providers.firebaseClientEmail ||
      !config.providers.firebasePrivateKey
    ) {
      throw new AppError(
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for push delivery.',
      )
    }

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: config.providers.firebaseProjectId,
          clientEmail: config.providers.firebaseClientEmail,
          privateKey: config.providers.firebasePrivateKey.replace(/\\n/g, '\n'),
        }),
      })
    }
  }

  async send(payload: PushPayload): Promise<void> {
    await getMessaging().send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      ...(payload.data ? { data: payload.data } : {}),
    })
  }
}

const createPushProvider = (): PushProvider => {
  return new FirebasePushProvider()
}

let provider: PushProvider | null = null
const getProvider = (): PushProvider => {
  if (!provider) {
    provider = createPushProvider()
  }
  return provider
}

export const pushService = {
  sendPush: async (payload: PushPayload): Promise<void> => {
    try {
      await getProvider().send(payload)
    } catch (error) {
      throw new AppError(
        `Failed to deliver push notification: ${error instanceof Error ? error.message : String(error)}`,
        502,
      )
    }
  },
}
