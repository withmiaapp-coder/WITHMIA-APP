#!/bin/bash

echo "========================================"
echo " PUSHING TO GITHUB FOR RAILWAY DEPLOY"
echo "========================================"
echo ""

cd "/c/Users/angel/OneDrive - UNIVERSIDAD ANDRES BELLO/Documents/WITHMIA/mia-app"

echo "[1/3] Adding files..."
git add .

echo "[2/3] Committing changes..."
git commit -m "feat: Add Railway deployment configuration and remove AWS"

echo "[3/3] Pushing to GitHub..."
git push origin main

echo ""
echo "========================================"
echo " ✅ DONE! Now go to railway.app"
echo "========================================"
echo ""

read -p "Press Enter to close..."
