import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripe) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.warn('⚠️  STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
      return null;
    }
    
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
      console.log('✅ Stripe initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe:', error);
      return null;
    }
  }
  return stripe;
}

export function isStripeEnabled(): boolean {
  return getStripe() !== null;
}

// Fallback functions for when Stripe is not available
export async function createMockCheckoutSession(userId: string, priceId: string) {
  console.log(`🔧 Mock checkout session created for user ${userId} with price ${priceId}`);
  return {
    id: `mock_session_${Date.now()}`,
    url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/mock-payment-success?session_id=mock_session_${Date.now()}`,
  };
}

export async function createMockCustomer(email: string, name: string) {
  console.log(`🔧 Mock customer created: ${email} (${name})`);
  return {
    id: `mock_customer_${Date.now()}`,
    email,
    name,
  };
}

export async function createMockBillingPortalSession(customerId: string) {
  console.log(`🔧 Mock billing portal session created for customer ${customerId}`);
  return {
    url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/mock-billing-portal`,
  };
}
