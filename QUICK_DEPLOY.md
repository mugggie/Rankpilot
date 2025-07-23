# 🚀 Quick Deploy Guide - RankPilot

## **Deploy in 10 Minutes!**

### **Step 1: Prepare Your Repository**
```bash
# Make sure your code is committed to GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### **Step 2: Deploy API to Railway**

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create New Project**
4. **Add PostgreSQL Database:**
   - Click "New Service" → "Database" → "PostgreSQL"
   - Wait for provisioning
   - Copy the `DATABASE_URL`

5. **Deploy API:**
   - Click "New Service" → "GitHub Repo"
   - Connect your RankPilot repository
   - Set environment variables:
     ```
     DATABASE_URL="your-postgres-url"
     NEXTAUTH_SECRET="generate-random-secret"
     STRIPE_SECRET_KEY="sk_test_..."
     STRIPE_PUBLISHABLE_KEY="pk_test_..."
     STRIPE_WEBHOOK_SECRET="whsec_..."
     NODE_ENV="production"
     PORT="4001"
     ```
   - Deploy!

### **Step 3: Deploy Frontend to Vercel**

1. **Go to [Vercel.com](https://vercel.com)**
2. **Sign up with GitHub**
3. **Import Project:**
   - Click "New Project"
   - Import your RankPilot repository
   - Set environment variables:
     ```
     NEXTAUTH_URL="https://your-app.vercel.app"
     NEXTAUTH_SECRET="same-secret-as-api"
     API_BASE_URL="https://your-api.railway.app"
     STRIPE_PUBLISHABLE_KEY="pk_test_..."
     ```
   - Deploy!

### **Step 4: Run Database Migrations**

```bash
# In Railway API service terminal:
cd packages/prisma
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### **Step 5: Test Your Deployment**

1. **Visit your Vercel URL**
2. **Create an account**
3. **Create a project**
4. **Run an audit**
5. **Test billing**

---

## **🎯 Your URLs**

- **Frontend**: `https://your-app.vercel.app`
- **API**: `https://your-api.railway.app`
- **Database**: Managed by Railway

---

## **💰 Cost Breakdown**

- **Vercel**: Free tier (then $20/month)
- **Railway**: $5/month
- **Total**: ~$25/month for production

---

## **🎉 You're Live!**

Your RankPilot platform is now deployed and ready to generate revenue!

**Next Steps:**
1. Configure custom domain
2. Set up Stripe webhooks
3. Add monitoring
4. Start marketing

---

## **Need Help?**

- Check the full `DEPLOYMENT.md` guide
- Run `./deploy-production.sh` for automated deployment
- Contact platform support if needed 