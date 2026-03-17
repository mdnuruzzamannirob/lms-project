import { config } from '../../config'
import { logger } from '../../config/logger'
import { AppError } from '../errors/AppError'

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
}

interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    logger.info('Console email provider dispatched email', {
      to: payload.to,
      subject: payload.subject,
    })
  }
}

class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new AppError('RESEND_API_KEY is required for resend email provider')
    }

    this.apiKey = apiKey
  }

  async send(payload: EmailPayload): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.providers.emailFrom,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new AppError(`Resend email send failed: ${body}`, response.status)
    }
  }
}

const createEmailProvider = (): EmailProvider => {
  if (config.providers.email === 'resend') {
    return new ResendEmailProvider(config.providers.resendApiKey)
  }

  return new ConsoleEmailProvider()
}

const provider = createEmailProvider()

export const emailService = {
  sendEmail: async (payload: EmailPayload): Promise<void> => {
    await provider.send(payload)
  },
}
