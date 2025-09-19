# 🏆 Golden Upload - E-commerce Automation Platform

A comprehensive Next.js 14 application for automating product management between Etsy and PrestaShop, featuring AI-powered content generation and XAU (gold) pricing integration.

## 🚀 **PRODUCTION READY** - [View Deployment Guide](./DEPLOYMENT.md)

## ✨ Features

### 🤖 **AI-Powered Content Generation**
- Multi-language product descriptions (Turkish, English, Arabic, Italian)
- SEO-optimized titles and keywords
- OpenAI GPT integration with intelligent prompting

### 🥇 **XAU Gold Pricing System**
- Real-time gold (troy ounce) pricing integration
- Automatic markup calculations
- Currency conversion support

### 🛒 **PrestaShop Integration**
- Complete API integration with XML support
- Combination products with variants
- Automatic category hierarchy creation
- Stock quantity management per variant
- Image upload and management
- Attribute group/value automation

### 📦 **Product Import System**
- CSV file import with validation
- URL-based product import from Etsy
- Image processing and optimization
- Batch processing capabilities

### 🏷️ **Category Management**
- Automatic category creation from Etsy hierarchy
- Multi-language category support
- Parent-child relationship handling
- Intelligent category mapping

### 📊 **Dashboard & Analytics**
- Real-time publishing status
- Operation logs and tracking
- User-friendly interface with shadcn/ui
- Responsive design

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL) with RLS
- **Deployment**: Vercel with optimized functions
- **AI**: OpenAI GPT-4 integration
- **APIs**: PrestaShop XML API, Metals API for gold prices
- **Authentication**: Supabase Auth

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd goldenupload
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Fill in your API keys and configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

Follow the detailed [Deployment Guide](./DEPLOYMENT.md) for production setup with Vercel and Supabase.

## 📋 Environment Variables

### Required for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
NEXTAUTH_URL=your-production-url
NEXTAUTH_SECRET=your-nextauth-secret
```

### Optional
```env
METALS_API_KEY=your-metals-api-key
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

## 🎯 Usage

### 1. **Setup User Configuration**
- Add PrestaShop API credentials
- Configure OpenAI API key
- Set markup percentages

### 2. **Import Products**
- Upload CSV file with product data
- Or import directly from Etsy URLs
- System processes images and extracts data

### 3. **AI Content Generation**
- Automatic multi-language descriptions
- SEO-optimized titles and keywords
- Intelligent content adaptation

### 4. **Publish to PrestaShop**
- One-click publishing with full automation
- Category creation and assignment
- Stock management and variants
- Image upload and processing

## 🔧 API Endpoints

### Core APIs
- `POST /api/upload` - CSV file processing
- `POST /api/etsy-import` - URL-based import
- `POST /api/ai-rewrite` - Content generation
- `POST /api/publish` - PrestaShop publishing
- `GET /api/xau-pricing` - Gold price calculation

### Management APIs
- `GET /api/products` - Product listing
- `PUT /api/products/[id]` - Product updates
- `GET /api/settings` - User configuration
- `POST /api/publishing-logs` - Operation tracking

## 📊 Database Schema

### Core Tables
- **products** - Product data with variants and pricing
- **publishing_logs** - Operation tracking and status
- **user_settings** - User configuration and API keys
- **xau_rates** - Gold pricing history

### Features
- Row Level Security (RLS) for data isolation
- Automatic timestamps and triggers
- Optimized indexes for performance
- JSON fields for flexible data storage

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

## 📈 Performance

### Optimizations
- **Image processing**: Optimized uploads and compression
- **API efficiency**: Batch operations and caching
- **Database**: Indexed queries and RLS policies
- **Functions**: 60-second timeout for long operations

### Monitoring
- Vercel Analytics integration
- Real-time function logs
- Database performance metrics
- Error tracking and logging

## 🔐 Security

- **Authentication**: Supabase Auth with RLS
- **API Security**: Rate limiting and validation
- **Data Protection**: Encrypted environment variables
- **HTTPS**: Enforced SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For deployment assistance or technical support:
- Check the [Deployment Guide](./DEPLOYMENT.md)
- Review function logs in Vercel dashboard
- Monitor database performance in Supabase
- Check API response times and success rates

## 🎉 Success Stories

**Golden Upload** successfully automates:
- ✅ Product import from multiple sources
- ✅ AI-powered content generation in 4 languages
- ✅ Complex PrestaShop integration with variants
- ✅ Real-time gold pricing and markup calculations
- ✅ Automatic category hierarchy management
- ✅ Professional image processing and upload

**Ready for production use** with scalable cloud infrastructure! 🚀

## 📱 Application Flow

### 1. Login
- Simple admin authentication
- JWT token stored in httpOnly cookie
- Redirects to dashboard upon success

### 2. Settings Configuration
- Configure API keys for Etsy, Shopify, PrestaShop
- Select AI provider (OpenAI or Z.ai)
- All keys are encrypted before database storage

### 3. Product Management
- **Fetch**: Import products from Etsy API
- **AI Rewrite**: Generate SEO-optimized content in 4 languages
- **Edit**: Manual content editing capability
- **Publish**: Distribute to multiple platforms

### 4. AI Content Rewriting
- Optimizes titles and descriptions for SEO
- Generates content in English, Turkish, Italian, Arabic
- Creates language-specific keyword lists
- Maintains original product essence

## 🔧 API Endpoints

### Authentication
- `POST /api/auth` - Login
- `GET /api/auth/check` - Check authentication status
- `POST /api/auth/logout` - Logout

### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Save settings

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Fetch from platforms
- `POST /api/products/rewrite` - AI content rewrite

### Publishing
- `POST /api/publish` - Publish to platforms

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **API Key Encryption**: All API keys encrypted in database
- **HttpOnly Cookies**: Prevents XSS attacks
- **Environment Variables**: Sensitive data in env files
- **Request Validation**: Input validation on all endpoints

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables:
     - `DATABASE_URL` - Use Vercel's edge-compatible database
     - `JWT_SECRET` - Strong random secret
     - `ADMIN_USERNAME` - Your admin username
     - `ADMIN_PASSWORD` - Your admin password  
     - `ENCRYPTION_KEY` - 32-character encryption key
     - `NEXTAUTH_URL` - Your deployed URL
     - `NEXTAUTH_SECRET` - NextAuth secret

3. **Database Migration**:
```bash
# After deployment, run:
npx prisma generate
npx prisma db push
```

### Database Options for Production

**Option 1: Vercel Edge (SQLite)**
- Default setup, works out of the box
- Good for small to medium applications

**Option 2: Supabase (PostgreSQL)**
```bash
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

**Option 3: PlanetScale (MySQL)**  
```bash
# Update DATABASE_URL in .env
DATABASE_URL="mysql://user:password@host:3306/dbname"
```

## 🎨 Customization

### Adding New Languages
1. Update the AI prompt in `/api/products/rewrite/route.ts`
2. Add language handling in the frontend components
3. Update the database schema if needed

### Adding New Platforms
1. Create new API integration in `/api/publish/route.ts`
2. Add platform-specific settings in `/api/settings/route.ts`
3. Update frontend UI to include new platform options

### Modifying AI Prompts
Edit the `AI_REWRITE_PROMPT` constant in `/api/products/rewrite/route.ts` to customize content generation.

## 🐛 Troubleshooting

### Common Issues

**Authentication Problems**:
- Check JWT_SECRET is set
- Verify cookie settings
- Ensure NEXTAUTH_URL matches your domain

**Database Issues**:
- Run `npx prisma generate` after schema changes
- Use `npx prisma db push` to sync database
- Check DATABASE_URL format

**API Integration Issues**:
- Verify API keys are correctly encrypted
- Check network connectivity
- Review API endpoint URLs

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check environment variable configuration
4. Verify database connectivity

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
npm update
npx prisma generate
```

### Database Migrations
```bash
# After schema changes
npx prisma generate
npx prisma db push
```

### Backup Database
```bash
# For SQLite
cp prisma/dev.db prisma/backup.db
```

---

**Built with ❤️ using Next.js 14, TypeScript, and modern web technologies.**