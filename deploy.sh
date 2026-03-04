#!/bin/bash
cd /c/Users/EXCALIBUR/Documents/goldenupload3/goldenupload
git config --global core.pager ""
git add src/app/api/health/route.ts
echo "=== Git Status After Add ==="
git status --short
echo "=== Committing ==="
git commit -m "feat: Add health check endpoint"
echo "=== Commit Done, Now Pushing ==="
git push origin master
echo "=== Push Complete ==="
