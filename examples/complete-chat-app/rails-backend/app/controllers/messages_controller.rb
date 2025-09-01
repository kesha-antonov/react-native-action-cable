class MessagesController < ApplicationController
  # GET /messages
  # Returns recent messages (in a real app, you'd persist messages to a database)
  def index
    # For this simple example, return empty array
    # In a real app, you'd query from database: Message.recent.limit(50)
    render json: {
      messages: [],
      info: "This example doesn't persist messages. Use ActionCable for real-time messaging."
    }
  end

  # POST /messages
  # Send a message via REST API (will also broadcast via ActionCable)
  def create
    username = params[:username] || 'Anonymous'
    message_text = params[:message]
    room = params[:room] || 'general'
    
    if message_text.present?
      # Broadcast via ActionCable
      ActionCable.server.broadcast("chat_room_#{room}", {
        type: 'new_message',
        message: message_text,
        username: username,
        timestamp: Time.current.iso8601,
        id: SecureRandom.uuid
      })
      
      render json: { 
        status: 'Message sent',
        message: message_text,
        username: username,
        room: room
      }
    else
      render json: { error: 'Message cannot be blank' }, status: :bad_request
    end
  end
end