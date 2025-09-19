# 🔧 **PRISMA + SQLite - VERCEL ENVIRONMENT VARIABLES**

## **Go to**: https://vercel.com/asbajans-3374s-projects/goldenupload/settings/environment-variables

Add these **exact** environment variables:

### **CRITICAL - Required for App to Work**

**Variable Name**: `DATABASE_URL`  
**Value**: `file:./data/production.db`

**Variable Name**: `JWT_SECRET`  
**Value**: `e5472a5376643e9ca20db1e16f0e558c4e823915ca0242440c855a2d0df81556`

**Variable Name**: `NEXTAUTH_SECRET`  
**Value**: `cbb1ce9c53c733c7ee446ffd9a0963733421c76d4765dcf475fdc1e151b9cc37`

**Variable Name**: `ENCRYPTION_KEY`  
**Value**: `8411067307cdc0232e899f85adaad857`

**Variable Name**: `ADMIN_USERNAME`  
**Value**: `admin`

**Variable Name**: `ADMIN_PASSWORD`  
**Value**: `secureAdmin123!` _(or change to your preferred password)_

**Variable Name**: `NEXTAUTH_URL`  
**Value**: `https://goldenupload.vercel.app`

### **OPTIONAL - Add These for Full Functionality**

**Variable Name**: `OPENAI_API_KEY`  
**Value**: `your-openai-api-key-here` _(for AI content generation)_

**Variable Name**: `METALS_API_KEY`  
**Value**: `your-metals-api-key-here` _(for gold pricing)_

---

## **📋 SETUP STEPS:**

1. **Click each "+ Add" button** in Vercel Environment Variables page
2. **Copy/paste** the variable name and value exactly as shown above
3. **Set Environment** to "Production, Preview, Development"
4. **Click "Save"** for each variable
5. **After adding all variables**, go to Deployments tab
6. **Click "Redeploy"** on the latest deployment

## **🎯 RESULT:**
After redeployment:
- ✅ Go to: https://goldenupload.vercel.app
- ✅ Login with: `admin` / `secureAdmin123!`
- ✅ App should work with **Prisma + SQLite database**

## **🗄️ DATABASE INFO:**
- **Type**: SQLite (file-based)
- **Location**: `./data/production.db` (auto-created)
- **ORM**: Prisma
- **Auto-initialization**: Yes, on first deployment

## **🔐 LOGIN CREDENTIALS:**
- **Username**: `admin`
- **Password**: `secureAdmin123!` _(change this if desired)_

**Database will be created automatically on first run with Prisma!** 🚀