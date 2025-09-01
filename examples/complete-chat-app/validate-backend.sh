#!/bin/bash

echo "=== Validating Rails Backend Configuration ==="
echo

cd rails-backend

echo "1. Checking Gemfile syntax..."
ruby -c Gemfile > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Gemfile syntax is valid"
else
    echo "✗ Gemfile has syntax errors"
    exit 1
fi

echo
echo "2. Checking Rails configuration files..."

# Check config/application.rb
ruby -c config/application.rb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ config/application.rb syntax is valid"
else
    echo "✗ config/application.rb has syntax errors"
    exit 1
fi

# Check config/routes.rb
ruby -c config/routes.rb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ config/routes.rb syntax is valid"
else
    echo "✗ config/routes.rb has syntax errors"
    exit 1
fi

echo
echo "3. Checking ActionCable channel syntax..."

# Check ChatChannel
ruby -c app/channels/chat_channel.rb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ app/channels/chat_channel.rb syntax is valid"
else
    echo "✗ app/channels/chat_channel.rb has syntax errors"
    exit 1
fi

echo
echo "4. Checking controller syntax..."

# Check MessagesController
ruby -c app/controllers/messages_controller.rb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ app/controllers/messages_controller.rb syntax is valid"
else
    echo "✗ app/controllers/messages_controller.rb has syntax errors"
    exit 1
fi

echo
echo "5. Checking required files exist..."
required_files=(
    "config.ru"
    "config/environment.rb"
    "config/boot.rb"
    "config/cable.yml"
    "config/environments/development.rb"
    "config/environments/production.rb"
    "config/initializers/cors.rb"
    "app/channels/application_cable/connection.rb"
    "app/channels/application_cable/channel.rb"
    "app/controllers/application_controller.rb"
    "bin/rails"
)

all_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    exit 1
fi

echo
echo "=== All validation checks passed! ==="
echo "The Rails backend configuration is complete and ready to use."
echo
echo "To run the server (after installing dependencies):"
echo "  bundle install"
echo "  bundle exec rails server"