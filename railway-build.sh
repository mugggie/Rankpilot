#!/bin/bash

# 🚀 Railway Build Script for RankPilot API

echo "🚀 Building RankPilot API for Railway..."
echo "========================================"

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

# Install dependencies from root (monorepo)
print_status "Installing dependencies from root..."
npm install

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_error "Dependencies not installed properly"
    exit 1
fi

# Check for specific dependencies
print_status "Checking critical dependencies..."
if [ ! -d "node_modules/stripe" ]; then
    print_error "Stripe dependency not found"
    exit 1
fi

if [ ! -d "node_modules/nodemailer" ]; then
    print_error "Nodemailer dependency not found"
    exit 1
fi

if [ ! -d "node_modules/@prisma/client" ]; then
    print_error "Prisma client not found"
    exit 1
fi

print_success "All dependencies installed correctly"

# Generate Prisma client
print_status "Generating Prisma client..."
cd packages/prisma
npx prisma generate --schema=prisma/schema.prisma
cd ../..

# Build the API application
print_status "Building TypeScript application..."
cd apps/api
npm run build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
else
    print_error "Build failed"
    exit 1
fi

print_success "🎉 Railway build completed successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy to Railway"
echo "2. Set environment variables"
echo "3. Start the service"
echo "" 