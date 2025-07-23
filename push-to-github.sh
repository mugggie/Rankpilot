#!/bin/bash

# 🚀 Push RankPilot to GitHub Script

echo "🚀 RankPilot GitHub Push Guide"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Create GitHub Repository${NC}"
echo "1. Go to https://github.com"
echo "2. Click 'New repository'"
echo "3. Repository name: RankPilot"
echo "4. Description: AI-powered SEO audit platform with billing, analytics, and admin features"
echo "5. Make it Public (recommended) or Private"
echo "6. Don't initialize with README (you already have files)"
echo "7. Click 'Create repository'"
echo ""

echo -e "${BLUE}Step 2: Copy the repository URL${NC}"
echo "You'll see something like: https://github.com/YOUR_USERNAME/RankPilot.git"
echo ""

echo -e "${BLUE}Step 3: Add the remote repository${NC}"
echo "Replace YOUR_USERNAME with your actual GitHub username:"
echo ""
echo -e "${YELLOW}git remote add origin https://github.com/YOUR_USERNAME/RankPilot.git${NC}"
echo ""

echo -e "${BLUE}Step 4: Push to GitHub${NC}"
echo -e "${YELLOW}git push -u origin main${NC}"
echo ""

echo -e "${BLUE}Step 5: Verify the push${NC}"
echo "1. Go to your GitHub repository"
echo "2. You should see all your files there"
echo "3. The repository is now ready for deployment!"
echo ""

echo -e "${GREEN}🎉 After pushing to GitHub, you can deploy using:${NC}"
echo "1. Follow QUICK_DEPLOY.md for 10-minute deployment"
echo "2. Or run ./deploy-production.sh for automated deployment"
echo ""

echo -e "${YELLOW}Need help? Check DEPLOYMENT.md for detailed instructions.${NC}" 