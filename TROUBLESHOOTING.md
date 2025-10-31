# Troubleshooting API Issues

## Your Current Issues

Based on your test output, the agent is **crashing when it receives messages**. Here's how to fix it:

## Step 1: Run Diagnostics

First, pull the latest fixes and run the diagnostic script:

```bash
# Pull the latest fixes
git pull origin claude/review-api-folder-011CUfcbpiGR5TwAJbRyfCgP

# Run diagnostics
cd api
python diagnose.py
```

This will check:
- ✅ Is `.env` file in the right location?
- ✅ Does it have `ANTHROPIC_API_KEY`?
- ✅ Is Node.js installed?
- ✅ Are npm dependencies installed?
- ✅ Are Python dependencies installed?

## Step 2: Fix Common Issues

### Issue 1: Missing .env File

**Symptom:**
```
⚠️  WARNING: .env file not found in project root!
```

**Solution:**
```bash
# Go to project root (NOT api folder!)
cd /Users/adolfocoronado/Desktop/C-P-MCP

# Create .env file
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-your-key-here
PROFILE_PHONE_NUMERO=5551234567
PROFILE_PHONE_PASSWORD=YourPassword123
EOF

# Verify it exists
ls -la .env
cat .env
```

### Issue 2: Missing Node Modules

**Symptom:**
```
✗ node_modules NOT FOUND
```

**Solution:**
```bash
# In project root
npm install

# Verify
ls node_modules/@anthropic-ai/sdk
```

### Issue 3: Agent Crashes Immediately

**Symptom:**
```
Agent process died unexpectedly (exit code: 1)
```

**This means the agent crashed on startup. To see why:**

```bash
# Test the agent directly
cd /Users/adolfocoronado/Desktop/C-P-MCP
node claude-agent-api.js --api

# You should see error messages explaining what's wrong
# Common issues:
# - Missing ANTHROPIC_API_KEY
# - Missing dependencies
# - Invalid .env file
```

## Step 3: Test Again

After fixing the issues above:

```bash
# Terminal 1: Start the API server
cd /Users/adolfocoronado/Desktop/C-P-MCP/api
python main.py

# Terminal 2: Run the test
cd /Users/adolfocoronado/Desktop/C-P-MCP/api
python test_api.py
```

## Expected Good Output

```
============================================================
Testing Claude Playwright MCP API
============================================================

Project root: /Users/adolfocoronado/Desktop/C-P-MCP
Looking for .env at: /Users/adolfocoronado/Desktop/C-P-MCP/.env
✓ .env file found!

1. Testing health endpoint...
   ✓ Status: 200

2. Checking initial agent status...
   ✓ Agent running: False

3. Starting agent...
   ✓ Status: started
   ✓ PID: 12345

4. Checking agent status after start...
   ✓ Agent running: True

5. Sending test message to agent...
   HTTP Status: 200
   Response: {'status': 'sent', 'message': 'Message sent to agent', ...}
   ✓ Status: sent

6. Stopping agent...
   ✓ Status: stopped

7. Final status check...
   ✓ Agent running: False
```

## Understanding the Fixes

The issues you experienced were caused by:

1. **Wrong working directory**: The API was running the agent from the `api/` folder, so it couldn't find the `.env` file in the project root
   - **Fixed**: Now runs from project root

2. **Poor error handling**: When the agent crashed, the API returned HTTPException without a 'status' key
   - **Fixed**: Now always returns JSON with 'status' key

3. **Broken pipe not handled**: When agent died, trying to stop it caused "broken pipe" error
   - **Fixed**: Now catches BrokenPipeError gracefully

## What the API Server Shows

When you run `python main.py`, you should see output like:

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000

# When agent starts:
[AGENT] ready: {'type': 'ready', 'sessionId': 1234567890, ...}

# When you send a message:
[AGENT] log: {'type': 'log', 'message': '🤖 Claude está pensando...', ...}
[AGENT] tool_use: {'type': 'tool_use', 'tool': 'navigate', ...}

# If there's an error:
[AGENT ERROR] Error: Cannot find module 'dotenv'
```

## Still Having Issues?

If the agent still crashes, run it directly to see the error:

```bash
cd /Users/adolfocoronado/Desktop/C-P-MCP

# Test in API mode
echo '{"type":"message","content":"test"}' | node claude-agent-api.js --api

# OR test in interactive mode
node claude-agent-api.js
```

The error messages will tell you exactly what's wrong!

## Quick Checklist

- [ ] `.env` file exists in project root (NOT in api folder)
- [ ] `.env` contains valid `ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Ran `npm install` in project root
- [ ] Ran `pip install -r requirements.txt` in api folder
- [ ] Can run `node claude-agent-api.js --api` without errors
- [ ] FastAPI server is running (`python main.py`)

Once all these are checked, the API should work perfectly! 🚀
