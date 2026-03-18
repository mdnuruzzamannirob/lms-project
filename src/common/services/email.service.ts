import nodemailer from 'nodemailer'

import { config } from '../../config'
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

class GmailSmtpEmailProvider implements EmailProvider {
  private readonly transport: nodemailer.Transporter

  constructor(options: {
    user: string | undefined
    appPassword: string | undefined
  }) {
    if (config.nodeEnv === 'test') {
      this.transport = nodemailer.createTransport({ jsonTransport: true })
      return
    }

    if (!options.user || !options.appPassword) {
      throw new AppError(
        'GMAIL_USER and GMAIL_APP_PASSWORD are required for email delivery.',
      )
    }

    this.transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: options.user,
        pass: options.appPassword,
      },
    })
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.transport.sendMail({
      from: config.providers.emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
  }
}

const createEmailProvider = (): EmailProvider => {
  return new GmailSmtpEmailProvider({
    user: config.providers.gmailUser,
    appPassword: config.providers.gmailAppPassword,
  })
}

let provider: EmailProvider | null = null
const getProvider = (): EmailProvider => {
  if (!provider) {
    provider = createEmailProvider()
  }
  return provider
}

export const emailService = {
  sendEmail: async (payload: EmailPayload): Promise<void> => {
    await getProvider().send(payload)
  },
}
