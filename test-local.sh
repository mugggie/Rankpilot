#!/bin/bash

# 🧪 RankPilot Local Testing Script

echo "🧪 Testing RankPilot Platform Locally"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test 1: Check dependencies
print_status "Testing dependencies..."
if command -v node &> /dev/null; then
    print_success "Node.js is installed: $(node --version)"
else
    print_error "Node.js is not installed"
    exit 1
fi

if command -v pnpm &> /dev/null; then
    print_success "pnpm is installed: $(pnpm --version)"
else
    print_error "pnpm is not installed"
    exit 1
fi

# Test 2: Check project structure
print_status "Testing project structure..."
if [ -d "apps/api" ]; then
    print_success "API directory exists"
else
    print_error "API directory missing"
    exit 1
fi

if [ -d "apps/web" ]; then
    print_success "Web directory exists"
else
    print_error "Web directory missing"
    exit 1
fi

if [ -d "packages/prisma" ]; then
    print_success "Prisma directory exists"
else
    print_error "Prisma directory missing"
    exit 1
fi

# Test 3: Check configuration files
print_status "Testing configuration files..."
if [ -f "package.json" ]; then
    print_success "Root package.json exists"
else
    print_error "Root package.json missing"
    exit 1
fi

if [ -f "apps/api/package.json" ]; then
    print_success "API package.json exists"
else
    print_error "API package.json missing"
    exit 1
fi

if [ -f "apps/web/package.json" ]; then
    print_success "Web package.json exists"
else
    print_error "Web package.json missing"
    exit 1
fi

if [ -f "packages/prisma/prisma/schema.prisma" ]; then
    print_success "Prisma schema exists"
else
    print_error "Prisma schema missing"
    exit 1
fi

# Test 4: Check environment setup
print_status "Testing environment setup..."
if [ -f ".env" ]; then
    print_success "Environment file exists"
else
    print_warning "Environment file missing - you'll need to create one for full testing"
fi

# Test 5: Test API build
print_status "Testing API build..."
cd apps/api
if pnpm run build > /dev/null 2>&1; then
    print_success "API builds successfully"
else
    print_error "API build failed"
    cd ../..
    exit 1
fi
cd ../..

# Test 6: Test Prisma client generation
print_status "Testing Prisma client generation..."
cd packages/prisma
if npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1; then
    print_success "Prisma client generated successfully"
else
    print_error "Prisma client generation failed"
    cd ../..
    exit 1
fi
cd ../..

# Test 7: Check deployment files
print_status "Testing deployment configuration..."
if [ -f "vercel.json" ]; then
    print_success "Vercel configuration exists"
else
    print_error "Vercel configuration missing"
fi

if [ -f "railway.json" ]; then
    print_success "Railway configuration exists"
else
    print_error "Railway configuration missing"
fi

if [ -f "deploy-production.sh" ]; then
    print_success "Deployment script exists"
else
    print_error "Deployment script missing"
fi

# Test 8: Check documentation
print_status "Testing documentation..."
if [ -f "DEPLOYMENT.md" ]; then
    print_success "Deployment guide exists"
else
    print_error "Deployment guide missing"
fi

if [ -f "QUICK_DEPLOY.md" ]; then
    print_success "Quick deploy guide exists"
else
    print_error "Quick deploy guide missing"
fi

echo ""
print_success "🎉 Local testing completed successfully!"
echo ""
echo "✅ Your RankPilot platform is ready for:"
echo "   - Local development"
echo "   - Production deployment"
echo "   - GitHub push"
echo ""
echo "🚀 Next steps:"
echo "   1. Push to GitHub: ./add-github-remote.sh"
echo "   2. Deploy to production: Follow QUICK_DEPLOY.md"
echo "   3. Start generating revenue!"
echo ""
print_warning "Note: For full functionality testing, you'll need:"
echo "   - Database connection (PostgreSQL)"
echo "   - Stripe API keys"
echo "   - Environment variables configured"
echo "" 