# Stripe Integration Setup Guide

## Environment Variables

### API (.env)
```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

### Web App (.env.local)
```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
```

## Stripe Dashboard Setup

### 1. Create Products and Prices
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Products > Add Product
3. Create the following products:

#### Free Plan
- Name: "Free Plan"
- Price: $0/month
- Price ID: `price_free_plan`

#### Pro Plan
- Name: "Pro Plan"
- Price: $29/month
- Price ID: `price_pro_plan`

#### Enterprise Plan
- Name: "Enterprise Plan"
- Price: $99/month
- Price ID: `price_enterprise_plan`

### 2. Configure Webhooks
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy the webhook secret to your environment variables

### 3. Update Price IDs
Update the price IDs in `apps/web/src/app/billing/page.tsx`:
```typescript
// Replace these with your actual Stripe price IDs
onClick={() => handleUpgrade('price_pro_plan')}
onClick={() => handleUpgrade('price_enterprise_plan')}
```

## Database Setup

The billing integration requires the following database tables:
- `User` (with billing fields)
- `BillingHistory`
- `Tier`

Run the migration to create these tables:
```bash
cd packages/prisma
pnpm exec prisma migrate deploy
```

## Testing

### Test Cards
Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

### Test Webhooks
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Features Implemented

✅ **Customer Management**
- Automatic customer creation
- Customer metadata linking

✅ **Subscription Management**
- Checkout sessions
- Subscription status tracking
- Billing portal integration

✅ **Usage Tracking**
- Token usage monitoring
- Usage percentage calculation
- Period-based usage limits

✅ **Billing History**
- Invoice tracking
- Payment status monitoring
- Billing history display

✅ **Webhook Processing**
- Subscription events
- Payment events
- Database synchronization

## Next Steps

1. **Add Usage Enforcement**
   - Implement usage limits in audit creation
   - Add usage alerts
   - Graceful degradation for over-limit users

2. **Enhanced Billing Features**
   - Usage-based billing
   - Proration handling
   - Invoice generation

3. **Admin Features**
   - Subscription management
   - Usage analytics
   - Revenue reporting 