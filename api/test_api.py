#!/usr/bin/env python3
"""
Simple test script for Claude Playwright MCP API
"""

import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def test_api():
    print("=" * 60)
    print("Testing Claude Playwright MCP API")
    print("=" * 60)

    # 1. Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   ✓ Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        print("   Make sure the API server is running: python main.py")
        sys.exit(1)

    # 2. Check initial status
    print("\n2. Checking initial agent status...")
    try:
        response = requests.get(f"{BASE_URL}/api/status")
        status = response.json()
        print(f"   ✓ Agent running: {status['is_running']}")
        print(f"   Connected clients: {status['connected_clients']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # 3. Start agent
    print("\n3. Starting agent...")
    try:
        response = requests.post(f"{BASE_URL}/api/agent/start")
        result = response.json()
        print(f"   ✓ Status: {result['status']}")
        print(f"   Message: {result['message']}")
        if 'pid' in result:
            print(f"   PID: {result['pid']}")

        # Wait for agent to fully start
        print("   Waiting 3 seconds for agent to initialize...")
        time.sleep(3)
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return

    # 4. Check status after start
    print("\n4. Checking agent status after start...")
    try:
        response = requests.get(f"{BASE_URL}/api/status")
        status = response.json()
        print(f"   ✓ Agent running: {status['is_running']}")
        if status['pid']:
            print(f"   PID: {status['pid']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # 5. Send a simple message
    print("\n5. Sending test message to agent...")
    try:
        test_message = "Hola, ¿estás listo?"
        response = requests.post(
            f"{BASE_URL}/api/agent/message",
            json={"message": test_message}
        )
        result = response.json()
        print(f"   ✓ Status: {result['status']}")
        print(f"   Message: {result['message']}")
        print(f"   Note: Check WebSocket for agent's response")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Wait a bit for response
    print("   Waiting 5 seconds for agent to process...")
    time.sleep(5)

    # 6. Stop agent
    print("\n6. Stopping agent...")
    try:
        response = requests.post(f"{BASE_URL}/api/agent/stop")
        result = response.json()
        print(f"   ✓ Status: {result['status']}")
        print(f"   Message: {result['message']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # 7. Final status check
    print("\n7. Final status check...")
    try:
        response = requests.get(f"{BASE_URL}/api/status")
        status = response.json()
        print(f"   ✓ Agent running: {status['is_running']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)
    print("\nNote: For real-time responses, you need to connect via WebSocket.")
    print("See API_USAGE.md for WebSocket examples.")

if __name__ == "__main__":
    test_api()
