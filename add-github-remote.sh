#!/bin/bash

echo "🚀 Adding GitHub Remote Repository"
echo "=================================="
echo ""

echo "Please enter your GitHub username:"
read username

if [ -z "$username" ]; then
    echo "❌ Username cannot be empty. Please try again."
    exit 1
fi

echo ""
echo "Adding remote repository..."
git remote add origin "https://github.com/$username/RankPilot.git"

echo ""
echo "✅ Remote added successfully!"
echo ""

echo "Now pushing to GitHub..."
git push -u origin main

echo ""
echo "🎉 Your RankPilot code is now on GitHub!"
echo ""
echo "Next steps:"
echo "1. Visit https://github.com/$username/RankPilot"
echo "2. Verify all files are there"
echo "3. Follow QUICK_DEPLOY.md to deploy your platform"
echo "" 