import crypto from 'node:crypto'

import { config } from '../../config'
import { AppError } from '../errors/AppError'

export type PaymentInitiatePayload = {
  amount: number
  currency: string
  reference: string
  customerName: string
  customerEmail: string
  metadata?: Record<string, string>
}

export type PaymentInitiateResult = {
  provider: string
  paymentId: string
  redirectUrl?: string
  status: 'pending' | 'success'
}

export type PaymentVerificationResult = {
  provider: string
  paymentId: string
  status: 'success' | 'failed' | 'pending'
  raw: unknown
}

interface PaymentProvider {
  initiatePayment(
    payload: PaymentInitiatePayload,
  ): Promise<PaymentInitiateResult>
  verifyWebhook(
    payload: string,
    signature?: string,
  ): Promise<PaymentVerificationResult>
}

class SslCommerzPaymentProvider implements PaymentProvider {
  private readonly storeId: string
  private readonly storePassword: string
  private readonly baseUrl: string

  constructor(options: {
    storeId: string | undefined
    storePassword: string | undefined
    isLive: boolean
  }) {
    if (!options.storeId || !options.storePassword) {
      throw new AppError(
        'SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD are required for sslcommerz payment provider',
      )
    }

    this.storeId = options.storeId
    this.storePassword = options.storePassword
    this.baseUrl = options.isLive
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com'
  }

  async initiatePayment(
    payload: PaymentInitiatePayload,
  ): Promise<PaymentInitiateResult> {
    const body = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: payload.amount.toFixed(2),
      currency: payload.currency,
      tran_id: payload.reference,
      success_url: 'https://example.com/payment/success',
      fail_url: 'https://example.com/payment/fail',
      cancel_url: 'https://example.com/payment/cancel',
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      product_name: 'LMS Subscription',
      product_category: 'Subscription',
      product_profile: 'general',
      shipping_method: 'NO',
    })

    const response = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      const responseBody = await response.text()
      throw new AppError(
        `SSLCommerz payment initiation failed: ${responseBody}`,
        response.status,
      )
    }

    const data = (await response.json()) as {
      GatewayPageURL?: string
      sessionkey?: string
      status?: string
    }

    const result: PaymentInitiateResult = {
      provider: 'sslcommerz',
      paymentId: data.sessionkey ?? payload.reference,
      status: data.status?.toUpperCase() === 'SUCCESS' ? 'success' : 'pending',
    }

    if (data.GatewayPageURL) {
      result.redirectUrl = data.GatewayPageURL
    }

    return result
  }

  async verifyWebhook(
    payload: string,
    signature?: string,
  ): Promise<PaymentVerificationResult> {
    return {
      provider: 'sslcommerz',
      paymentId: signature ?? crypto.randomUUID(),
      status: 'success',
      raw: payload,
    }
  }
}

class PaypalPaymentProvider implements PaymentProvider {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseUrl: string

  constructor(options: {
    clientId: string | undefined
    clientSecret: string | undefined
    mode: 'sandbox' | 'live'
  }) {
    if (!options.clientId || !options.clientSecret) {
      throw new AppError(
        'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required for paypal payment provider',
      )
    }

    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
    this.baseUrl =
      options.mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'
  }

  private async getAccessToken(): Promise<string> {
    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64')
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new AppError(
        `PayPal token request failed: ${body}`,
        response.status,
      )
    }

    const data = (await response.json()) as { access_token: string }
    return data.access_token
  }

  async initiatePayment(
    payload: PaymentInitiatePayload,
  ): Promise<PaymentInitiateResult> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: payload.reference,
            amount: {
              currency_code: payload.currency,
              value: payload.amount.toFixed(2),
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new AppError(
        `PayPal payment initiation failed: ${body}`,
        response.status,
      )
    }

    const data = (await response.json()) as {
      id: string
      status: string
      links?: Array<{ rel: string; href: string }>
    }

    const approveLink = data.links?.find((link) => link.rel === 'approve')?.href

    const result: PaymentInitiateResult = {
      provider: 'paypal',
      paymentId: data.id,
      status: data.status === 'COMPLETED' ? 'success' : 'pending',
    }

    if (approveLink) {
      result.redirectUrl = approveLink
    }

    return result
  }

  async verifyWebhook(
    payload: string,
    signature?: string,
  ): Promise<PaymentVerificationResult> {
    return {
      provider: 'paypal',
      paymentId: signature ?? crypto.randomUUID(),
      status: 'pending',
      raw: payload,
    }
  }
}

const createPaymentProvider = (): PaymentProvider => {
  if (config.providers.payment === 'sslcommerz') {
    return new SslCommerzPaymentProvider({
      storeId: config.providers.sslCommerzStoreId,
      storePassword: config.providers.sslCommerzStorePassword,
      isLive: config.providers.sslCommerzIsLive,
    })
  }

  if (config.providers.payment === 'paypal') {
    return new PaypalPaymentProvider({
      clientId: config.providers.paypalClientId,
      clientSecret: config.providers.paypalClientSecret,
      mode: config.providers.paypalMode,
    })
  }

  throw new AppError(
    `Unsupported PAYMENT_PROVIDER value: "${config.providers.payment}". Supported: sslcommerz, paypal.`,
    500,
  )
}

// Lazy singleton — only instantiated on first use, not at module load time.
let _provider: PaymentProvider | null = null
const getProvider = (): PaymentProvider => {
  if (!_provider) {
    _provider = createPaymentProvider()
  }
  return _provider
}

export const paymentProviderService = {
  initiatePayment: async (
    payload: PaymentInitiatePayload,
  ): Promise<PaymentInitiateResult> => {
    return getProvider().initiatePayment(payload)
  },

  verifyWebhook: async (
    payload: string,
    signature?: string,
  ): Promise<PaymentVerificationResult> => {
    return getProvider().verifyWebhook(payload, signature)
  },
}
