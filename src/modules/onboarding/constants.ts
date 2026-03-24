export const planCatalog = [
  {
    code: 'FREE',
    name: 'Free Plan',
    price: 0,
    billingCycle: 'monthly',
    isPaid: false,
  },
  {
    code: 'PRO',
    name: 'Pro Plan',
    price: 499,
    billingCycle: 'monthly',
    isPaid: true,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Plan',
    price: 999,
    billingCycle: 'monthly',
    isPaid: true,
  },
] as const
