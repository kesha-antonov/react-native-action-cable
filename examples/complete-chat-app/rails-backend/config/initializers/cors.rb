# CORS configuration for React Native
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*' # In production, specify your React Native app domains
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: false
  end
end