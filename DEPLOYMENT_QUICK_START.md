# Quick Start: Railway Deployment

Quick reference for deploying to Railway with custom domain `crm.gaadimech.com`.

## Prerequisites Checklist

- [ ] Railway account created
- [ ] GitHub repository created and code pushed
- [ ] AWS backend deployed and URL known
- [ ] GoDaddy account access

## Deployment Steps (5 Minutes)

### 1. Deploy to Railway

1. Go to https://railway.app → **New Project** → **Deploy from GitHub**
2. Select your `GaadiMech-CRM-Frontend` repository
3. Wait for build to complete

### 2. Set Environment Variable

In Railway → Your Service → **Variables**, add:

```
NEXT_PUBLIC_API_BASE_URL=https://your-aws-backend.elasticbeanstalk.com
```

Replace with your actual AWS backend URL.

### 3. Add Custom Domain

1. Railway → Settings → **Domains** → **Add Domain**
2. Enter: `crm.gaadimech.com`
3. Railway will show DNS instructions

### 4. Configure GoDaddy DNS

1. GoDaddy → **DNS Management** for `gaadimech.com`
2. Add **CNAME** record:
   - **Name:** `crm`
   - **Value:** `your-app.up.railway.app` (from Railway)
3. Save and wait 5-15 minutes

### 5. Update Backend CORS

In AWS Elastic Beanstalk → Configuration → Software → Environment Properties:

```
EB_ORIGIN=https://crm.gaadimech.com,http://crm.gaadimech.com
```

Or via CLI:
```bash
cd GaadiMech-CRM-Backend
eb setenv EB_ORIGIN="https://crm.gaadimech.com,http://crm.gaadimech.com"
```

### 6. Test

- ✅ HTTP: http://crm.gaadimech.com
- ✅ HTTPS: https://crm.gaadimech.com
- ✅ Railway: https://your-app.up.railway.app

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Railway build logs |
| DNS not working | Wait 15-30 min, verify GoDaddy DNS records |
| SSL error | Wait 5-10 min after adding domain |
| CORS errors | Verify `EB_ORIGIN` includes your domain |
| API errors | Check `NEXT_PUBLIC_API_BASE_URL` is correct |

## Full Guide

See `RAILWAY_DEPLOYMENT.md` for detailed instructions.

