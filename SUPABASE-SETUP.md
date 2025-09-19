# 🚀 **SUPABASE SETUP GUIDE - GOLDEN UPLOAD**

## 🏗️ **Step 1: Create Supabase Project**

1. **Go to Supabase**: https://supabase.com
2. **Sign up/Login** with GitHub account
3. **Create New Project**:
   - Organization: Select your organization
   - Name: `golden-upload` 
   - Database Password: Generate a strong password
   - Region: Choose closest to your users (Europe West recommended)
   - Pricing Plan: Start with **Free tier**

## 🗄️ **Step 2: Setup Database Schema**

1. **Go to SQL Editor** in Supabase Dashboard
2. **Copy and paste** the entire content from `supabase-setup.sql`
3. **Click "Run"** to execute the schema
4. **Verify** tables are created in the Table Editor

## 🔑 **Step 3: Get API Keys**

In Supabase Dashboard → Settings → API:

1. **Project URL** → Copy this to `NEXT_PUBLIC_SUPABASE_URL`
2. **Anon Public Key** → Copy this to `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
3. **Service Role Key** → Copy this to `SUPABASE_SERVICE_ROLE_KEY`

## ⚙️ **Step 4: Configure Authentication**

1. **Go to Authentication** → Settings
2. **Disable email confirmations** for development:
   - Email Confirmations: OFF
   - Email Auth: ON
3. **Add your domain** to Site URL:
   - Site URL: `https://goldenupload.vercel.app`
   - Redirect URLs: `https://goldenupload.vercel.app/**`

## 🌐 **Step 5: Update Vercel Environment Variables**

Go to: https://vercel.com/asbajans-3374s-projects/goldenupload/settings/environment-variables

**Add these environment variables:**

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...

# JWT & Encryption (REQUIRED)
JWT_SECRET=e5472a5376643e9ca20db1e16f0e558c4e823915ca0242440c855a2d0df81556
ENCRYPTION_KEY=8411067307cdc0232e899f85adaad857

# App Configuration (REQUIRED)
NEXTAUTH_URL=https://goldenupload.vercel.app
NEXTAUTH_SECRET=cbb1ce9c53c733c7ee446ffd9a0963733421c76d4765dcf475fdc1e151b9cc37

# Optional APIs
OPENAI_API_KEY=your-openai-key
METALS_API_KEY=your-metals-key
```

## 🚀 **Step 6: Deploy to Vercel**

```bash
vercel --prod
```

## 🎯 **Step 7: Test the Application**

1. **Visit**: https://goldenupload.vercel.app
2. **Sign up** with email/password
3. **Login** and access dashboard
4. **Test** product import and publishing

## 🔐 **Authentication Flow**

With Supabase, users will:
1. **Sign up** with email/password
2. **Automatically get** a user_id in auth.users
3. **Access** their own data via RLS policies
4. **No manual admin creation** needed

## 📊 **Database Tables Created**

- ✅ **products** - Product data with variants
- ✅ **publishing_logs** - Operation tracking  
- ✅ **user_settings** - User configuration
- ✅ **xau_rates** - Gold pricing data
- ✅ **RLS policies** - Row-level security
- ✅ **Indexes** - Performance optimization

## 🎉 **Benefits of Supabase**

- 🔐 **Built-in authentication** with RLS
- 📊 **Real-time subscriptions** 
- 🔄 **Automatic backups**
- 📈 **Scalable PostgreSQL**
- 🌐 **Dashboard for data management**
- 🚀 **Edge functions support**

## 🆘 **Troubleshooting**

### Authentication Issues
- Check Site URL matches your domain
- Verify API keys are correct
- Check RLS policies are enabled

### Database Connection
- Verify SUPABASE_URL format
- Check service role key permissions
- Test connection in Supabase dashboard

### Build Errors  
- Ensure all environment variables are set
- Check TypeScript types match database schema
- Verify import paths for lib/supabase

**Your Golden Upload app will be much more robust with Supabase!** 🏆