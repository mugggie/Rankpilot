# Admin & Team Guide: Secure API Key Management and Settings

## Overview
This project uses a secure, database-driven approach for managing sensitive API keys and integration secrets (e.g., Stripe, SendGrid, DeepSeek). All keys are stored in the `Setting` table and can be managed via the admin panel.

---

## How It Works
- **All API keys/secrets are stored in the Setting table in the database.**
- **Admins can view and update these keys via the admin panel (`/admin/settings`).**
- **The backend always uses the latest value from the database for each request.**
- **If a key is not set in the database, the backend falls back to the environment variable (for bootstrapping or local dev).**

---

## How to Update an API Key or Secret
1. Log in as an admin.
2. Go to the “Settings” section in the admin panel.
3. Update the value for the desired key (e.g., `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY`, etc.).
4. The backend will immediately use the new value for all future requests.

---

## Adding a New Integration
1. Add the key to the Setting table (via the admin panel or seed script).
2. In backend code, use the `getSetting` utility:
   ```ts
   import { getSetting } from './utils/settings';
   const apiKey = await getSetting('YOUR_API_KEY', process.env.YOUR_API_KEY);
   ```
3. Use this key in your integration logic.

---

## Example: Stripe Integration
- **Key:** `STRIPE_SECRET_KEY`
- **How to update:** Use the admin panel or seed script.
- **Backend usage:**
  ```ts
  import { getStripe } from './stripe';
  const stripe = await getStripe();
  ```

## Example: SendGrid Integration
- **Key:** `SENDGRID_API_KEY`
- **How to update:** Use the admin panel or seed script.
- **Backend usage:**
  ```ts
  import { getSetting } from './utils/settings';
  const sendgridKey = await getSetting('SENDGRID_API_KEY', process.env.SENDGRID_API_KEY);
  ```

---

## Security Best Practices
- **Never expose API keys/secrets to non-admin users or in logs.**
- **Restrict access to the settings API and admin panel to admin users only.**
- **Rotate keys regularly and update them via the admin panel.**
- **For local development, you can use environment variables as a fallback.**

---

## Troubleshooting
- If a key is missing, the backend will use the environment variable (if set).
- If you update a key in the admin panel, the backend will use the new value immediately (no restart required).
- For new integrations, always use the `getSetting` utility to fetch keys.

---

## Questions?
Contact the engineering lead or check the code in `src/utils/settings.ts` for more details. 