# 🚀 RankPilot Deployment Guide

## **Quick Start: Vercel + Railway (Recommended)**

### **Step 1: Database Setup (Railway)**

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Create new project

2. **Add PostgreSQL Database**
   ```bash
   # In Railway dashboard:
   # 1. Click "New Service"
   # 2. Select "Database" → "PostgreSQL"
   # 3. Wait for provisioning
   ```

3. **Get Database URL**
   - Click on your PostgreSQL service
   - Go to "Connect" tab
   - Copy the `DATABASE_URL`

### **Step 2: Deploy API Backend (Railway)**

1. **Connect GitHub Repository**
   ```bash
   # In Railway dashboard:
   # 1. Click "New Service"
   # 2. Select "GitHub Repo"
   # 3. Connect your RankPilot repository
   # 4. Select the repository
   ```

2. **Configure API Service**
   ```bash
   # Set the following environment variables:
   DATABASE_URL="your-railway-postgres-url"
   NEXTAUTH_SECRET="generate-random-secret"
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   NODE_ENV="production"
   PORT="4001"
   ```

3. **Deploy API**
   ```bash
   # Railway will automatically:
   # 1. Install dependencies
   # 2. Run database migrations
   # 3. Start the API server
   ```

4. **Get API URL**
   - Copy the generated domain (e.g., `https://your-api.railway.app`)

### **Step 3: Deploy Frontend (Vercel)**

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   ```bash
   # 1. Click "New Project"
   # 2. Import your RankPilot repository
   # 3. Select the repository
   ```

3. **Configure Frontend**
   ```bash
   # Set environment variables:
   NEXTAUTH_URL="https://your-domain.vercel.app"
   NEXTAUTH_SECRET="same-secret-as-api"
   API_BASE_URL="https://your-api.railway.app"
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

4. **Deploy Frontend**
   ```bash
   # Vercel will automatically:
   # 1. Build the Next.js app
   # 2. Deploy to CDN
   # 3. Provide you with a URL
   ```

### **Step 4: Database Migration**

1. **Run Migrations**
   ```bash
   # In Railway API service terminal:
   cd packages/prisma
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Seed Initial Data**
   ```bash
   # Create initial tiers and admin user
   npx prisma db seed
   ```

### **Step 5: Configure Domains**

1. **Custom Domain (Optional)**
   ```bash
   # In Vercel:
   # 1. Go to project settings
   # 2. Add custom domain
   # 3. Update DNS records
   ```

2. **Update Environment Variables**
   ```bash
   # Update NEXTAUTH_URL with your custom domain
   NEXTAUTH_URL="https://yourdomain.com"
   ```

---

## **Alternative: DigitalOcean App Platform**

### **Step 1: Create DigitalOcean Account**
- Sign up at [digitalocean.com](https://digitalocean.com)
- Add payment method

### **Step 2: Create App**
```bash
# 1. Click "Create" → "Apps"
# 2. Connect GitHub repository
# 3. Select RankPilot repository
```

### **Step 3: Configure Services**
```bash
# Add these services:
# 1. PostgreSQL Database
# 2. API Service (Node.js)
# 3. Web Service (Next.js)
```

### **Step 4: Environment Variables**
```bash
# Set all environment variables as shown above
# DigitalOcean will handle the rest
```

---

## **Production Checklist**

### **✅ Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Stripe webhooks configured
- [ ] SSL certificates enabled
- [ ] Custom domain configured

### **✅ Post-Deployment**
- [ ] Test user registration
- [ ] Test audit creation
- [ ] Test billing integration
- [ ] Test PDF export
- [ ] Test admin panel
- [ ] Monitor error logs

### **✅ Security**
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] CORS configured properly
- [ ] SSL/TLS enabled

---

## **Environment Variables Reference**

### **Required Variables**
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# API
API_BASE_URL="https://your-api-domain.com"
NODE_ENV="production"
PORT="4001"
```

### **Optional Variables**
```bash
# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Redis (for queue processing)
REDIS_URL="redis://..."
```

---

## **Monitoring & Maintenance**

### **Health Checks**
```bash
# API Health Check
curl https://your-api-domain.com/health

# Frontend Health Check
curl https://yourdomain.com/api/health
```

### **Database Backup**
```bash
# Railway automatically backs up PostgreSQL
# DigitalOcean provides automated backups
# Set up manual backups for other providers
```

### **Logs & Monitoring**
```bash
# Railway: Built-in logging dashboard
# Vercel: Built-in analytics and logs
# DigitalOcean: App platform monitoring
```

---

## **Cost Estimation**

### **Vercel + Railway (Recommended)**
- **Vercel Pro**: $20/month (unlimited bandwidth)
- **Railway**: $5/month (starter plan)
- **Total**: ~$25/month

### **DigitalOcean App Platform**
- **Basic App**: $5/month
- **Database**: $7/month
- **Total**: ~$12/month

### **AWS/GCP/Azure**
- **EC2/Compute**: $10-50/month
- **RDS/Database**: $15-30/month
- **Total**: $25-80/month

---

## **Support & Troubleshooting**

### **Common Issues**
1. **Database Connection**: Check DATABASE_URL format
2. **CORS Errors**: Verify API_BASE_URL configuration
3. **Stripe Webhooks**: Ensure webhook URL is correct
4. **Build Failures**: Check environment variables

### **Getting Help**
- Check deployment platform documentation
- Review application logs
- Test locally with production environment variables
- Contact platform support if needed

---

## **Next Steps After Deployment**

1. **Set up monitoring** (UptimeRobot, Pingdom)
2. **Configure analytics** (Google Analytics, Mixpanel)
3. **Set up error tracking** (Sentry, LogRocket)
4. **Create backup strategy**
5. **Plan scaling strategy**
6. **Start marketing your platform**

**🎉 Your RankPilot platform is now ready for production deployment!** 