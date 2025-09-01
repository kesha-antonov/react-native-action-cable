#!/bin/bash

echo "=== Complete Chat App Example Validation ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Track overall success
overall_success=true

echo "1. Validating Rails Backend..."
echo "================================"

cd rails-backend

# Check Gemfile
ruby -c Gemfile > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Gemfile syntax is valid"
else
    print_error "Gemfile has syntax errors"
    overall_success=false
fi

# Check Rails files
rails_files=(
    "config/application.rb"
    "config/routes.rb" 
    "config/boot.rb"
    "config/environment.rb"
    "app/channels/chat_channel.rb"
    "app/controllers/messages_controller.rb"
    "app/controllers/application_controller.rb"
    "app/channels/application_cable/connection.rb"
    "app/channels/application_cable/channel.rb"
)

for file in "${rails_files[@]}"; do
    if [ -f "$file" ]; then
        ruby -c "$file" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "$file syntax is valid"
        else
            print_error "$file has syntax errors"
            overall_success=false
        fi
    else
        print_error "$file is missing"
        overall_success=false
    fi
done

# Check required configuration files exist
config_files=(
    "config.ru"
    "config/cable.yml"
    "config/environments/development.rb"
    "config/environments/production.rb"
    "config/initializers/cors.rb"
    "bin/rails"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
        overall_success=false
    fi
done

echo
echo "2. Validating React Native Frontend..."
echo "======================================"

cd ../react-native-frontend

# Check package.json
if [ -f "package.json" ]; then
    node -e "
    try { 
        const pkg = require('./package.json'); 
        console.log('✓ package.json is valid JSON');
        const deps = pkg.dependencies || {};
        if (deps['@kesha-antonov/react-native-action-cable']) {
            console.log('✓ ActionCable library is listed in dependencies');
        } else {
            console.log('✗ ActionCable library missing from dependencies');
            process.exit(1);
        }
    } catch(e) { 
        console.log('✗ package.json error:', e.message); 
        process.exit(1); 
    }" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "package.json validation passed"
    else
        print_error "package.json validation failed"
        overall_success=false
    fi
else
    print_error "package.json is missing"
    overall_success=false
fi

# Check React Native files
if [ -f "App.js" ]; then
    node -c App.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "App.js syntax is valid"
    else
        print_error "App.js has syntax errors"
        overall_success=false
    fi
else
    print_error "App.js is missing"
    overall_success=false
fi

# Check all component files
if [ -d "src" ]; then
    js_files_valid=true
    while IFS= read -r -d '' file; do
        node -c "$file" > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            print_error "$file has syntax errors"
            js_files_valid=false
            overall_success=false
        fi
    done < <(find src -name "*.js" -print0)
    
    if [ "$js_files_valid" = true ]; then
        print_success "All React Native components have valid syntax"
    fi
else
    print_error "src directory is missing"
    overall_success=false
fi

# Check required React Native files
rn_files=(
    "index.js"
    "app.json"
    "babel.config.js"
    "src/services/ChatService.js"
    "src/components/ChatScreen.js"
    "src/components/MessageList.js"
    "src/components/MessageInput.js"
    "src/components/ConnectionStatus.js"
)

for file in "${rn_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
        overall_success=false
    fi
done

echo
echo "3. Validation Summary"
echo "===================="

if [ "$overall_success" = true ]; then
    print_success "All validation checks passed!"
    echo
    print_info "The complete chat app example is ready to use:"
    print_info ""
    print_info "Rails Backend:"
    print_info "  cd rails-backend"
    print_info "  bundle install"
    print_info "  bundle exec rails server"
    print_info ""
    print_info "React Native Frontend:"
    print_info "  cd react-native-frontend"
    print_info "  npm install"
    print_info "  npm run android  # or npm run ios"
    echo
else
    print_error "Some validation checks failed!"
    print_error "Please review the errors above and fix them before using the example."
    exit 1
fi