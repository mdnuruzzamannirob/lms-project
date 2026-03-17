import nodemailer from 'nodemailer'
import env from '../config/env'

interface SendOptions {
  to: string
  subject: string
  html: string
  text: string
}

interface VerificationEmailData {
  to: string
  name: string
  token: string
}

let transporter: nodemailer.Transporter | null = null

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    })
  }
  return transporter
}

const send = async ({
  to,
  subject,
  html,
  text,
}: SendOptions): Promise<void> => {
  await getTransporter().sendMail({
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text,
  })
}

const btn = (label: string, href: string): string =>
  `<a href="${href}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${label}</a>`

export const sendVerificationEmail = async ({
  to,
  name,
  token,
}: VerificationEmailData): Promise<void> => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`
  await send({
    to,
    subject: 'Verify your email — Digital Library',
    text: `Hi ${name},\n\nVerify your email:\n${link}\n\nExpires in 24 hours.`,
    html: `<p>Hi <strong>${name}</strong>,</p><p>Please verify your email:</p><p>${btn('Verify Email', link)}</p><p>Or: <a href="${link}">${link}</a></p><p>Expires in <strong>24 hours</strong>. If you didn't register, ignore this.</p>`,
  })
}

export const sendPasswordResetEmail = async ({
  to,
  name,
  token,
}: VerificationEmailData): Promise<void> => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`
  await send({
    to,
    subject: 'Reset your password — Digital Library',
    text: `Hi ${name},\n\nReset your password:\n${link}\n\nExpires in 1 hour.`,
    html: `<p>Hi <strong>${name}</strong>,</p><p>Click to reset your password:</p><p>${btn('Reset Password', link)}</p><p>Or: <a href="${link}">${link}</a></p><p>Expires in <strong>1 hour</strong>. If you didn't request this, ignore it.</p>`,
  })
}

export const sendWelcomeEmail = async ({
  to,
  name,
}: {
  to: string
  name: string
}): Promise<void> => {
  const link = `${env.CLIENT_URL}/dashboard`
  await send({
    to,
    subject: 'Welcome to Digital Library!',
    text: `Hi ${name},\n\nWelcome to Digital Library! Start reading at: ${link}`,
    html: `<p>Hi <strong>${name}</strong>,</p><p>Welcome to <strong>Digital Library</strong>!</p><p>${btn('Go to Dashboard', link)}</p>`,
  })
}
