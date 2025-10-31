#!/usr/bin/env node
/**
 * Test script to verify claude-agent-api.js works in API mode
 * This spawns the agent with --api flag and sends test messages via stdin
 */

const { spawn } = require('child_process');
const readline = require('readline');

console.log('=' .repeat(60));
console.log('Testing claude-agent-api.js in API mode');
console.log('=' .repeat(60));

// Spawn the agent in API mode
console.log('\n1. Starting agent with --api flag...');
const agent = spawn('node', ['claude-agent-api.js', '--api']);

let messageCount = 0;

// Listen to stdout (agent responses)
const rl = readline.createInterface({
  input: agent.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    messageCount++;

    console.log(`\n[Message ${messageCount}] Type: ${message.type}`);

    switch (message.type) {
      case 'ready':
        console.log(`   ✓ Agent ready! Session ID: ${message.sessionId}`);
        console.log('   Waiting 2 seconds before sending test message...');

        // Send a test message after agent is ready
        setTimeout(() => {
          console.log('\n2. Sending test message to agent...');
          const testMessage = JSON.stringify({
            type: 'message',
            content: 'Hola, ¿estás funcionando correctamente?'
          });
          agent.stdin.write(testMessage + '\n');
          console.log('   ✓ Message sent!');
        }, 2000);
        break;

      case 'log':
        console.log(`   Log: ${message.message}`);
        break;

      case 'user_message':
        console.log(`   User: ${message.content}`);
        break;

      case 'tool_use':
        console.log(`   Tool: ${message.tool}(${JSON.stringify(message.args)})`);
        break;

      case 'tool_result':
        console.log(`   Result: ${message.result?.substring(0, 100)}...`);
        break;

      case 'response':
        console.log(`   ✓ Response received!`);
        console.log(`   Content: ${message.content?.substring(0, 200)}...`);
        console.log(`   Has code: ${message.hasCode}`);
        if (message.savedFiles && message.savedFiles.length > 0) {
          console.log(`   Saved files: ${message.savedFiles.join(', ')}`);
        }

        // After receiving response, send exit command
        console.log('\n3. Sending exit command...');
        setTimeout(() => {
          const exitMessage = JSON.stringify({ type: 'exit' });
          agent.stdin.write(exitMessage + '\n');
        }, 1000);
        break;

      case 'file_saved':
        console.log(`   ✓ File saved: ${message.filepath}`);
        break;

      case 'error':
        console.log(`   ✗ Error: ${message.error}`);
        break;

      case 'shutdown':
        console.log('   ✓ Agent shutting down gracefully');
        break;

      default:
        console.log(`   Unknown type: ${JSON.stringify(message)}`);
    }
  } catch (e) {
    console.log('   [Non-JSON output]:', line);
  }
});

// Listen to stderr (errors)
agent.stderr.on('data', (data) => {
  console.error(`   [STDERR]: ${data.toString().trim()}`);
});

// Handle agent exit
agent.on('exit', (code) => {
  console.log('\n' + '='.repeat(60));
  console.log(`Agent process exited with code: ${code}`);
  console.log('='.repeat(60));

  if (code === 0) {
    console.log('\n✓ Test completed successfully!');
  } else {
    console.log('\n✗ Test failed with error code:', code);
  }

  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT, stopping agent...');
  const exitMessage = JSON.stringify({ type: 'exit' });
  agent.stdin.write(exitMessage + '\n');
  setTimeout(() => {
    agent.kill();
    process.exit(1);
  }, 2000);
});
