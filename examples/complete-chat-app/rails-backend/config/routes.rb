Rails.application.routes.draw do
  # ActionCable endpoint
  mount ActionCable.server => '/cable'
  
  # API routes
  resources :messages, only: [:index, :create]
  
  # Health check
  get '/health', to: proc { [200, {}, ['OK']] }
end