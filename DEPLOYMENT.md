# Deploy Backend to Vercel

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Git installed on your computer

## Step-by-Step Deployment Guide

### 1. Prepare Your Code
✅ Already done! Your code is ready for deployment.

### 2. Initialize Git Repository (if not already done)
```bash
cd Backend
git init
git add .
git commit -m "Initial commit for Vercel deployment"
```

### 3. Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., "backend-api")
3. Don't initialize with README (we already have code)
4. Copy the repository URL

### 4. Push to GitHub
```bash
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### 5. Deploy to Vercel

#### Option A: Using Vercel Website (Recommended)
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Other
   - **Root Directory:** Backend (if your repo has Backend folder)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add each variable from your .env file:
     ```
     PORT=3000
     SUPABASE_URL=your_supabase_url
     SUPABASE_KEY=your_supabase_key
     EMAIL_USER=your_email
     EMAIL_PASS=your_app_password
     ```
6. Click "Deploy"

#### Option B: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? backend-api
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add PORT
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add EMAIL_USER
vercel env add EMAIL_PASS

# Deploy to production
vercel --prod
```

### 6. Test Your Deployment
After deployment, Vercel will give you a URL like:
`https://your-project.vercel.app`

Test your endpoints:
- GET: `https://your-project.vercel.app/`
- POST: `https://your-project.vercel.app/email/sendcustomemail`
- GET: `https://your-project.vercel.app/ring/getring/allrings`

### 7. Important Notes

#### File Uploads
⚠️ Vercel serverless functions have a 4.5MB request limit and no persistent file system.
- The `/upload` route will work but uploaded files are temporary
- Consider using cloud storage (AWS S3, Cloudinary) for production

#### Environment Variables
- Never commit .env file to GitHub
- Always add environment variables in Vercel dashboard
- Update EMAIL_PASS with your Gmail App Password

#### Custom Domain (Optional)
1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 8. Update Frontend
Update your frontend API calls to use the Vercel URL:
```javascript
const API_URL = 'https://your-project.vercel.app';
```

## Troubleshooting

### Deployment Failed
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Environment Variables Not Working
- Make sure they're added in Vercel dashboard
- Redeploy after adding variables
- Check variable names match exactly

### CORS Issues
- Update CORS origin in server.js to your frontend URL
- Add your domain to allowed origins

### Email Not Sending
- Verify EMAIL_USER and EMAIL_PASS are set correctly
- Use Gmail App Password, not regular password
- Check Vercel function logs for errors

## Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm project-name

# Pull environment variables locally
vercel env pull
```

## Support
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
