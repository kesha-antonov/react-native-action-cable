require_relative 'boot'

require 'rails'
require 'active_model/railtie'
require 'active_record/railtie'
require 'action_controller/railtie'
require 'action_cable/engine'

Bundler.require(*Rails.groups)

module ChatApp
  class Application < Rails::Application
    config.load_defaults 8.0

    # API-only application
    config.api_only = true

    # ActionCable configuration
    config.action_cable.mount_path = '/cable'
    config.action_cable.url = 'ws://localhost:3000/cable'
    config.action_cable.allowed_request_origins = [
      'http://localhost:3000',
      /http:\/\/localhost:\d+/,
      /https:\/\/localhost:\d+/
    ]
  end
end
