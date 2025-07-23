# 🚀 Vercel Deployment Guide - RankPilot

## **Quick Fix for Vercel Issues**

### **Step 1: Import Repository Correctly**

1. **Go to [Vercel.com](https://vercel.com)**
2. **Click "New Project"**
3. **Import Git Repository**
4. **Select**: `mugggie/Rankpilot`
5. **Framework Preset**: Select **"Next.js"**
6. **Root Directory**: Leave as `/` (root)
7. **Build Command**: `cd apps/web && npm run build`
8. **Output Directory**: `apps/web/.next`
9. **Install Command**: `npm install`

### **Step 2: Environment Variables**

Set these environment variables in Vercel:

```bash
# Authentication
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-random-secret-key

# API Configuration
API_BASE_URL=https://your-api.railway.app
NEXT_PUBLIC_API_BASE_URL=https://your-api.railway.app

# Stripe (if you have it)
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **Step 3: Build Settings**

In Vercel project settings:

**Build & Development Settings:**
- **Framework Preset**: Next.js
- **Build Command**: `cd apps/web && npm run build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `npm install`
- **Root Directory**: `/` (leave empty)

**Environment Variables:**
- Add all the variables listed above

### **Step 4: Deploy**

1. **Click "Deploy"**
2. **Wait for build to complete**
3. **Check build logs for any errors**

---

## **🚨 Common Issues & Solutions**

### **Issue 1: "Build Command Failed"**

**Solution:**
1. Go to Project Settings → General
2. Set Build Command: `cd apps/web && npm run build`
3. Set Output Directory: `apps/web/.next`
4. Redeploy

### **Issue 2: "Module not found"**

**Solution:**
1. Check that all dependencies are in `apps/web/package.json`
2. Make sure `npm install` runs successfully
3. Check for missing imports

### **Issue 3: "TypeScript errors"**

**Solution:**
- The config now ignores TypeScript errors during build
- This is temporary for deployment
- Fix errors later for production

### **Issue 4: "Environment variables not found"**

**Solution:**
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Make sure variable names match exactly
4. Redeploy

### **Issue 5: "API routes not working"**

**Solution:**
1. Check that API routes are in `apps/web/src/pages/api/`
2. Make sure NextAuth is properly configured
3. Verify environment variables are set

---

## **🔧 Manual Deployment Steps**

If the automatic deployment fails, try these steps:

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**

```bash
vercel login
```

### **Step 3: Deploy from Web Directory**

```bash
cd apps/web
vercel --prod
```

### **Step 4: Set Environment Variables**

```bash
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add API_BASE_URL
```

---

## **✅ Success Checklist**

After deployment, verify:

- [ ] Build completes without errors
- [ ] Website loads at your Vercel URL
- [ ] No console errors in browser
- [ ] Environment variables are accessible
- [ ] API routes work (if any)
- [ ] Authentication works (if configured)

---

## **🎯 Your Vercel URL**

Once deployed, your platform will be available at:
`https://your-app-name.vercel.app`

---

## **📞 Need Help?**

If you're still having issues:

1. **Check Vercel Build Logs** - Look for specific error messages
2. **Verify Repository** - Make sure code is pushed to GitHub
3. **Check Environment Variables** - Ensure all are set correctly
4. **Contact Support** - Vercel has excellent support

**Your RankPilot platform will be live once Vercel deployment succeeds!** 🚀 