Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.server_timing = true

  if Rails.root.join('tmp', 'caching-dev.txt').exist?
    config.cache_store = :memory_store
    config.public_file_server.headers = {
      'Cache-Control' => "public, max-age=#{2.days.to_i}"
    }
  else
    config.action_controller.perform_caching = false
    config.cache_store = :null_store
  end

  config.active_record.migration_error = :page_load

  config.active_record.verbose_query_logs = true

  config.file_watcher = ActiveSupport::EventedFileUpdateChecker

  # ActionCable development configuration
  config.action_cable.disable_request_forgery_protection = true
end