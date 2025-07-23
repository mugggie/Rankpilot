#!/bin/bash

# 🚀 Deploy RankPilot Web to Vercel

echo "🚀 Deploying RankPilot Web to Vercel"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

# Navigate to web directory
print_status "Navigating to web directory..."
cd apps/web

# Login to Vercel if not already logged in
print_status "Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    print_status "Please login to Vercel..."
    vercel login
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

print_success "🎉 Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Deploy API to Railway"
echo "3. Update API URLs"
echo "" 