import { config } from '../../config'
import { logger } from '../../config/logger'
import { AppError } from '../errors/AppError'

export type SmsPayload = {
  to: string
  message: string
}

interface SmsProvider {
  send(payload: SmsPayload): Promise<void>
}

class ConsoleSmsProvider implements SmsProvider {
  async send(payload: SmsPayload): Promise<void> {
    logger.info('Console SMS provider dispatched message', {
      to: payload.to,
      messageLength: payload.message.length,
    })
  }
}

class TwilioSmsProvider implements SmsProvider {
  private readonly accountSid: string
  private readonly authToken: string
  private readonly from: string

  constructor(options: {
    accountSid: string | undefined
    authToken: string | undefined
    from: string | undefined
  }) {
    if (!options.accountSid || !options.authToken || !options.from) {
      throw new AppError(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM are required for twilio sms provider',
      )
    }

    this.accountSid = options.accountSid
    this.authToken = options.authToken
    this.from = options.from
  }

  async send(payload: SmsPayload): Promise<void> {
    const basicAuth = Buffer.from(
      `${this.accountSid}:${this.authToken}`,
    ).toString('base64')

    const body = new URLSearchParams({
      From: this.from,
      To: payload.to,
      Body: payload.message,
    })

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    )

    if (!response.ok) {
      const responseBody = await response.text()
      throw new AppError(
        `Twilio SMS send failed: ${responseBody}`,
        response.status,
      )
    }
  }
}

const createSmsProvider = (): SmsProvider => {
  if (config.providers.sms === 'twilio') {
    return new TwilioSmsProvider({
      accountSid: config.providers.twilioAccountSid,
      authToken: config.providers.twilioAuthToken,
      from: config.providers.twilioFrom,
    })
  }

  return new ConsoleSmsProvider()
}

const provider = createSmsProvider()

export const smsService = {
  sendSms: async (payload: SmsPayload): Promise<void> => {
    await provider.send(payload)
  },
}
