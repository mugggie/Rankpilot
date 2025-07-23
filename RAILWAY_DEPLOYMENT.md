# 🚀 Railway Deployment Guide for RankPilot

## Overview
This guide will help you deploy the RankPilot API to Railway, a modern platform for deploying applications.

## Prerequisites
- GitHub repository connected to Railway
- Railway account (free tier available)
- Environment variables ready

## Step-by-Step Deployment

### 1. Connect to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign in with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `Rankpilot` repository

### 2. Configure the Project
Railway will automatically detect the configuration from:
- `railway.json` - Main configuration
- `railway.toml` - Alternative configuration
- `apps/api/package.json` - Dependencies and scripts

### 3. Set Environment Variables
In your Railway project dashboard, go to the "Variables" tab and add:

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Redis (for background jobs)
REDIS_URL=your_redis_connection_string

# App
NODE_ENV=production
PORT=3000
```

### 4. Deploy
1. Railway will automatically start the deployment
2. The build process will:
   - Install dependencies from root
   - Generate Prisma client
   - Build TypeScript application
   - Start the API server

### 5. Get Your API URL
Once deployed, Railway will provide you with a URL like:
```
https://your-app-name.railway.app
```

This is your **API Base URL** for the frontend configuration.

## Troubleshooting

### Build Errors

#### Missing Dependencies
If you see errors like "Cannot find module", the dependencies are now included in `apps/api/package.json`:
- `stripe`
- `nodemailer`
- `bcrypt`
- `cookie-parser`
- `zod`
- `jsonwebtoken`
- `bullmq`
- `ioredis`

#### TypeScript Errors
The build process now ignores TypeScript errors for deployment. If you want to fix them later:
1. Update `apps/api/tsconfig.json`
2. Add proper type annotations
3. Run `npm run build` locally to test

### Runtime Errors

#### Database Connection
Make sure your `DATABASE_URL` is correct:
```
postgresql://username:password@host:port/database
```

#### Port Issues
The API runs on port 3000 by default. Railway will automatically assign a port if needed.

### Health Check
The API includes a health check endpoint at `/health`. Railway will use this to monitor the service.

## Manual Deployment (Alternative)

If automatic deployment fails, you can use the Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `PORT` | Server port | No (auto-assigned) |

## Next Steps

1. **Test the API**: Use the health check endpoint
2. **Update Frontend**: Set the API base URL in your Vercel deployment
3. **Monitor**: Check Railway logs for any issues
4. **Scale**: Upgrade Railway plan if needed

## Support

If you encounter issues:
1. Check Railway logs in the dashboard
2. Verify environment variables
3. Test locally with the same configuration
4. Check the Railway documentation

## API Endpoints

Once deployed, your API will be available at:
- Health Check: `https://your-app-name.railway.app/health`
- API Base: `https://your-app-name.railway.app/api`

Use this base URL in your Vercel frontend deployment! 