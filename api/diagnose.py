#!/usr/bin/env python3
"""
Diagnostic script to check if everything is set up correctly
"""

import os
import sys
import subprocess

print("=" * 60)
print("Claude Playwright MCP API - Diagnostics")
print("=" * 60)

# Get paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
env_path = os.path.join(project_root, '.env')

print(f"\n📁 Paths:")
print(f"   Script dir: {script_dir}")
print(f"   Project root: {project_root}")
print(f"   .env path: {env_path}")

# Check 1: .env file
print(f"\n1️⃣  Checking .env file...")
if os.path.exists(env_path):
    print(f"   ✓ .env file exists at {env_path}")

    # Try to read it
    try:
        with open(env_path, 'r') as f:
            lines = f.readlines()
            has_api_key = any('ANTHROPIC_API_KEY' in line for line in lines)

            if has_api_key:
                print(f"   ✓ ANTHROPIC_API_KEY found in .env")
            else:
                print(f"   ✗ ANTHROPIC_API_KEY not found in .env")
                print(f"   → Add: ANTHROPIC_API_KEY=sk-ant-...")
    except Exception as e:
        print(f"   ✗ Error reading .env: {e}")
else:
    print(f"   ✗ .env file NOT FOUND at {env_path}")
    print(f"   → Create .env file in project root with:")
    print(f"      ANTHROPIC_API_KEY=sk-ant-...")
    print(f"      PROFILE_PHONE_NUMERO=5551234567")
    print(f"      PROFILE_PHONE_PASSWORD=YourPassword")

# Check 2: Node.js
print(f"\n2️⃣  Checking Node.js...")
try:
    result = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        print(f"   ✓ Node.js installed: {result.stdout.strip()}")
    else:
        print(f"   ✗ Node.js not working properly")
except FileNotFoundError:
    print(f"   ✗ Node.js not found")
    print(f"   → Install Node.js from https://nodejs.org")
except Exception as e:
    print(f"   ✗ Error checking Node.js: {e}")

# Check 3: npm dependencies
print(f"\n3️⃣  Checking Node.js dependencies...")
node_modules = os.path.join(project_root, 'node_modules')
if os.path.exists(node_modules):
    print(f"   ✓ node_modules folder exists")

    # Check for key dependencies
    deps = ['@anthropic-ai/sdk', 'dotenv', 'playwright', 'fs-extra']
    for dep in deps:
        dep_path = os.path.join(node_modules, dep)
        if os.path.exists(dep_path):
            print(f"   ✓ {dep} installed")
        else:
            print(f"   ✗ {dep} NOT installed")
else:
    print(f"   ✗ node_modules NOT FOUND")
    print(f"   → Run: npm install")

# Check 4: Python dependencies
print(f"\n4️⃣  Checking Python dependencies...")
try:
    import fastapi
    print(f"   ✓ fastapi installed")
except ImportError:
    print(f"   ✗ fastapi NOT installed")
    print(f"   → Run: pip install -r requirements.txt")

try:
    import uvicorn
    print(f"   ✓ uvicorn installed")
except ImportError:
    print(f"   ✗ uvicorn NOT installed")
    print(f"   → Run: pip install -r requirements.txt")

# Check 5: claude-agent-api.js
print(f"\n5️⃣  Checking agent script...")
agent_path = os.path.join(project_root, 'claude-agent-api.js')
if os.path.exists(agent_path):
    print(f"   ✓ claude-agent-api.js exists")
else:
    print(f"   ✗ claude-agent-api.js NOT FOUND at {agent_path}")

# Check 6: playwright-mcp-server.js
print(f"\n6️⃣  Checking MCP server...")
mcp_path = os.path.join(project_root, 'playwright-mcp-server.js')
if os.path.exists(mcp_path):
    print(f"   ✓ playwright-mcp-server.js exists")
else:
    print(f"   ✗ playwright-mcp-server.js NOT FOUND at {mcp_path}")

# Check 7: API server status
print(f"\n7️⃣  Checking API server...")
try:
    import requests
    response = requests.get("http://localhost:8000/", timeout=2)
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ API server is running")
        print(f"   Version: {data.get('version', 'unknown')}")
    else:
        print(f"   ⚠️  API server responded with status {response.status_code}")
except requests.exceptions.ConnectionError:
    print(f"   ⚠️  API server is NOT running")
    print(f"   → Start it with: python main.py")
except Exception as e:
    print(f"   ✗ Error checking API server: {e}")

print("\n" + "=" * 60)
print("Summary")
print("=" * 60)

issues = []

if not os.path.exists(env_path):
    issues.append(".env file missing")

if not os.path.exists(node_modules):
    issues.append("Node.js dependencies not installed")

if issues:
    print("\n❌ Issues found:")
    for issue in issues:
        print(f"   - {issue}")
    print("\n👉 Fix these issues before running the API")
else:
    print("\n✅ All checks passed! You should be able to run the API")
    print("\n📝 Next steps:")
    print("   1. Start API: python main.py")
    print("   2. Test API: python test_api.py")

print()
