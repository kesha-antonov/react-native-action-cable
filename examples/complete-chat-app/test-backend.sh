#!/bin/bash

# Simple test script to validate the Rails backend setup

echo "=== Testing Rails Backend Setup ==="
echo

# Check if we can require the Rails environment
cd rails-backend

echo "1. Testing Rails environment..."
ruby -e "
begin
  require_relative 'config/environment'
  puts '✓ Rails environment loads successfully'
rescue => e
  puts '✗ Rails environment failed to load:'
  puts e.message
  exit 1
end
"

echo
echo "2. Testing ActionCable channel..."
ruby -e "
require_relative 'config/environment'
begin
  ChatChannel.new(nil, {})
  puts '✓ ChatChannel class loads successfully'
rescue => e
  puts '✗ ChatChannel failed to load:'
  puts e.message
  exit 1
end
"

echo
echo "3. Testing routes..."
ruby -e "
require_relative 'config/environment'
begin
  routes = Rails.application.routes.routes.map(&:path).map(&:spec).sort
  puts '✓ Routes loaded successfully:'
  routes.each { |r| puts '  ' + r }
rescue => e
  puts '✗ Routes failed to load:'
  puts e.message
  exit 1
end
"

echo
echo "=== All tests passed! ==="