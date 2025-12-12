# Setup Checklist & Access Links

## Current Status

### ✅ What's Working
- Frontend deployed on Railway (Status: **Online**)
- Backend deployed on AWS Elastic Beanstalk
- Environment variable `NEXT_PUBLIC_API_BASE_URL` is set

### ⚠️ Issues to Fix

1. **Environment Variable Missing Protocol**
   - Current: `GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
   - **Should be:** `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`
   - Backend only supports HTTP (not HTTPS)

2. **Railway Domain Not Configured**
   - Need to generate Railway domain or add custom domain

3. **Backend CORS Not Updated**
   - Need to add Railway frontend domain to backend CORS

## Step-by-Step Fixes

### Fix 1: Update Environment Variable in Railway

1. Go to Railway Dashboard → Your Service → **Variables** tab
2. Find `NEXT_PUBLIC_API_BASE_URL`
3. **Update the value to:**
   ```
   http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com
   ```
   (Add `http://` at the beginning)
4. Save - Railway will automatically redeploy

### Fix 2: Generate Railway Domain

1. Go to Railway Dashboard → Your Service → **Settings** tab
2. Scroll to **"Public Networking"** section
3. Click **"Generate Domain"** button
4. Railway will create a domain like: `your-app.up.railway.app`
5. **Note this domain** - you'll need it for backend CORS

### Fix 3: Update Backend CORS

Once you have the Railway domain, update AWS backend:

**Option A: Via AWS Console**
1. Go to AWS Elastic Beanstalk → Your Environment
2. Configuration → Software → Edit
3. Find or add `EB_ORIGIN` environment variable
4. Set value to: `https://your-app.up.railway.app` (replace with your actual Railway domain)
5. Click Apply

**Option B: Via CLI**
```bash
cd GaadiMech-CRM-Backend
eb setenv EB_ORIGIN="https://your-app.up.railway.app"
```

### Fix 4: Add Custom Domain (Optional - for crm.gaadimech.com)

1. In Railway → Settings → Public Networking
2. Click **"Custom Domain"** button
3. Enter: `crm.gaadimech.com`
4. Follow DNS instructions to configure in GoDaddy
5. Update backend CORS to include: `https://crm.gaadimech.com,http://crm.gaadimech.com`

## Access Links

### Current Access (After Fixes)

**Railway Default Domain:**
- `https://your-app.up.railway.app` (after generating domain)

**Custom Domain (After DNS Setup):**
- `http://crm.gaadimech.com`
- `https://crm.gaadimech.com`

### Backend URL
- `http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com`

## Testing Checklist

After making the fixes:

- [ ] Environment variable updated with `http://` protocol
- [ ] Railway domain generated
- [ ] Backend CORS updated with Railway domain
- [ ] Frontend accessible at Railway domain
- [ ] Login page loads
- [ ] API calls work (check browser console)
- [ ] No CORS errors in browser console

## Quick Test Commands

```bash
# Test backend
curl http://GaadiMech-CRM-Backend-env.eba-vhhjmtea.ap-south-1.elasticbeanstalk.com

# Test frontend (after domain is generated)
curl https://your-app.up.railway.app
```

## Troubleshooting

### If Frontend Shows Errors:
1. Check Railway deployment logs
2. Verify environment variable is correct (with `http://`)
3. Check browser console for errors

### If API Calls Fail:
1. Verify backend CORS includes your Railway domain
2. Check backend is accessible
3. Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly

### If Custom Domain Doesn't Work:
1. Wait 5-15 minutes for DNS propagation
2. Verify DNS records in GoDaddy
3. Check Railway domain status shows "Active"

