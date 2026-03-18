import type { PaymentGateway } from './interface'

export type GatewayProvider = 'SSLCommerz' | 'Stripe' | 'PayPal'

export type GatewayCountryRule = {
  gateway: PaymentGateway
  provider: GatewayProvider
  countries: string[]
}

export const paymentGatewayCountryConfig: GatewayCountryRule[] = [
  {
    gateway: 'bkash',
    countries: ['BD'],
    provider: 'SSLCommerz',
  },
  {
    gateway: 'nagad',
    countries: ['BD'],
    provider: 'SSLCommerz',
  },
  {
    gateway: 'stripe',
    countries: ['*'],
    provider: 'Stripe',
  },
  {
    gateway: 'paypal',
    countries: ['*'],
    provider: 'PayPal',
  },
]
