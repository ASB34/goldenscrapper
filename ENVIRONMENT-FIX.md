# 🚨 **URGENT: Environment Variables Setup**

## Issue Diagnosed ✅
Your app deployed successfully but the `/api/auth` endpoint is returning a 500 error because **environment variables are missing** in Vercel.

## 🔧 **IMMEDIATE FIX REQUIRED**

### Step 1: Add Environment Variables to Vercel

Go to your Vercel dashboard:
1. **Visit**: https://vercel.com/asbajans-3374s-projects/goldenupload
2. **Go to**: Settings → Environment Variables
3. **Add these required variables**:

```bash
# Database (CRITICAL)
DATABASE_URL=file:./data/production.db

# JWT Authentication (CRITICAL)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key

# Admin Login (CRITICAL)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here

# App Configuration (CRITICAL)
NEXTAUTH_SECRET=another-32-character-random-string
NEXTAUTH_URL=https://goldenupload.vercel.app

# Optional but recommended
OPENAI_API_KEY=your-openai-api-key
METALS_API_KEY=your-metals-api-key
```

### Step 2: Generate Required Secrets

Run these commands to generate secure secrets:

```bash
# For JWT_SECRET and NEXTAUTH_SECRET (32+ characters each)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# For ENCRYPTION_KEY (exactly 32 characters)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

### Step 3: Set Your Admin Password
Choose a secure admin password (minimum 8 characters) for `ADMIN_PASSWORD`.

### Step 4: Redeploy
After adding environment variables:
1. Go to Vercel → Deployments
2. Click "Redeploy" on the latest deployment
3. OR push a new commit to trigger auto-deploy

## 🎯 **Expected Result**
After setting environment variables:
- ✅ Login page should work at `/login`
- ✅ You can login with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- ✅ App should function normally

## 🔍 **Verify Environment Variables**
In Vercel dashboard, ensure you have at least these 6 critical variables:
1. `DATABASE_URL`
2. `JWT_SECRET`
3. `ENCRYPTION_KEY` 
4. `ADMIN_USERNAME`
5. `ADMIN_PASSWORD`
6. `NEXTAUTH_SECRET`

## 🚀 **Quick Test**
After redeployment, test:
1. Go to https://goldenupload.vercel.app
2. Should redirect to login page
3. Login with your admin credentials
4. Should access the dashboard

## ⚠️ **Important Notes**
- All secrets should be 32+ characters for security
- Use different values for each secret
- Never share these secrets publicly
- The app creates the database automatically on first run

Your app is deployed successfully - it just needs the environment variables! 🎉