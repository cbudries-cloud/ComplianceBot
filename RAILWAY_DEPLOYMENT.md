# Railway Deployment Guide

## 🚂 **Deploy ComplianceBot to Railway**

### **Prerequisites**
- Railway account (free tier available)
- GitHub repository with your code

### **Step 1: Connect Repository**

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your ComplianceBot repository
5. Railway will automatically detect it's a Node.js project

### **Step 2: Configure Environment Variables**

In Railway dashboard, go to your project → **Variables** tab and add:

```
HUBSPOT_TOKEN=pat-na1-your-token-here
OPENAI_API_KEY=sk-your-openai-key-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PROPERTY_LANDING_URL=landing_page_url
POLL_INTERVAL=86400000
PORT=3000
```

### **Step 3: Deploy**

Railway will automatically:
- ✅ Install dependencies (`npm install`)
- ✅ Install Playwright browsers
- ✅ Start the scheduler (`tsx src/scheduler.ts`)
- ✅ Run continuously

### **Step 4: Monitor**

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, memory, and network usage
- **Health**: Automatic health checks on `/healthz`

## 🔧 **Railway-Specific Features**

### **Automatic Deployments**
- Push to `main` branch → automatic deployment
- Pull requests → preview deployments
- Environment variables → secure secrets management

### **Scaling**
- **Free tier**: 512MB RAM, 1GB storage
- **Pro tier**: Up to 8GB RAM, auto-scaling
- **Perfect for daily compliance checking**

### **Monitoring**
- Real-time logs
- Performance metrics
- Error tracking
- Uptime monitoring

## 📊 **What Happens After Deployment**

1. **Railway starts** the ComplianceBot scheduler
2. **Every 24 hours** it polls HubSpot for new tickets
3. **Processes tickets** automatically with compliance checks
4. **Sends Slack notifications** for violations found
5. **Logs everything** to Railway's logging system
6. **Runs continuously** with zero maintenance

## 💰 **Cost**

- **Free tier**: Perfect for daily compliance checking
- **Pro tier**: $5/month if you need more resources
- **No server management** - Railway handles everything

## 🎯 **Benefits of Railway**

- ✅ **Simple deployment** - Git push to deploy
- ✅ **Zero configuration** - Works out of the box
- ✅ **Automatic scaling** - Handles traffic spikes
- ✅ **Built-in monitoring** - Logs and metrics included
- ✅ **Secure secrets** - Environment variables encrypted
- ✅ **Free tier available** - Perfect for this use case

Your ComplianceBot will run **completely autonomously** on Railway, checking HubSpot daily and sending compliance reports to Slack! 🚀
