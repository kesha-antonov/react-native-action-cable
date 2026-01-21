#!/usr/bin/env node

/**
 * Simple demo script to test ActionCable message broadcasting
 * This simulates what the React Native app does
 */

import * as http from 'http'

interface MessagePayload {
  message: string
  username: string
  room: string
}

interface ApiResponse {
  status?: string
  message?: string
  [key: string]: unknown
}

console.log('=== ActionCable Integration Demo ===\n')

// Test the REST API endpoint
function testRestAPI(): void {
  console.log('1. Testing REST API endpoint...')

  const postData: string = JSON.stringify({
    message: 'Hello from demo script!',
    username: 'TestUser',
    room: 'general',
  } satisfies MessagePayload)

  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }

  const req = http.request(options, (res) => {
    let data = ''

    res.on('data', (chunk: Buffer) => {
      data += chunk
    })

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✓ REST API test successful')
        console.log('  Response:', JSON.parse(data) as ApiResponse)
      } else {
        console.log('✗ REST API test failed')
        console.log('  Status:', res.statusCode)
        console.log('  Response:', data)
      }
    })
  })

  req.on('error', (e: Error) => {
    console.log('✗ REST API test failed:')
    console.log('  Error:', e.message)
    console.log('  Make sure Rails server is running: bundle exec rails server')
  })

  req.write(postData)
  req.end()
}

// Test health check endpoint
function testHealthCheck(): void {
  console.log('\n2. Testing health check endpoint...')

  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
  }

  const req = http.request(options, (res) => {
    let data = ''

    res.on('data', (chunk: Buffer) => {
      data += chunk
    })

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✓ Health check successful')
        console.log('  Rails server is running and responding')
      } else {
        console.log('✗ Health check failed')
        console.log('  Status:', res.statusCode)
      }
    })
  })

  req.on('error', (e: Error) => {
    console.log('✗ Health check failed:')
    console.log('  Error:', e.message)
    console.log('  Make sure Rails server is running on localhost:3000')
  })

  req.end()
}

// Display WebSocket information
function displayWebSocketInfo(): void {
  console.log('\n3. ActionCable WebSocket Information:')
  console.log('  WebSocket URL: ws://localhost:3000/cable')
  console.log('  Channel: ChatChannel')
  console.log('  Default room: general')
  console.log('  Actions: send_message')
  console.log('')
  console.log('  In React Native, connect with:')
  console.log('  ActionCable.createConsumer("ws://localhost:3000/cable")')
}

// Run tests
console.log('Testing Rails backend integration...\n')

testHealthCheck()
setTimeout(() => {
  testRestAPI()
  setTimeout(() => {
    displayWebSocketInfo()
    console.log('\n=== Demo Complete ===')
    console.log('\nTo see real-time messaging:')
    console.log('1. Start Rails server: cd rails-backend && bundle exec rails server')
    console.log('2. Start React Native app: cd react-native-frontend && npm run android')
    console.log('3. Send messages through the React Native app UI')
  }, 1000)
}, 1000)
