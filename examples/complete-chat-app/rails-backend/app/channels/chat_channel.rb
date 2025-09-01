class ChatChannel < ApplicationCable::Channel
  def subscribed
    # Subscribe to the chat room
    room = params[:room] || 'general'
    stream_from "chat_room_#{room}"
    
    logger.info "Client subscribed to chat room: #{room}"
    
    # Broadcast that someone joined (optional)
    ActionCable.server.broadcast("chat_room_#{room}", {
      type: 'user_joined',
      message: 'Someone joined the chat',
      timestamp: Time.current.iso8601
    })
  end

  def unsubscribed
    # Cleanup when channel is unsubscribed
    room = params[:room] || 'general'
    logger.info "Client unsubscribed from chat room: #{room}"
    
    # Broadcast that someone left (optional)
    ActionCable.server.broadcast("chat_room_#{room}", {
      type: 'user_left', 
      message: 'Someone left the chat',
      timestamp: Time.current.iso8601
    })
  end

  def send_message(data)
    # Handle incoming message from client
    room = params[:room] || 'general'
    username = data['username'] || 'Anonymous'
    message_text = data['message']
    
    if message_text.present?
      # Broadcast the message to all subscribers in the room
      ActionCable.server.broadcast("chat_room_#{room}", {
        type: 'new_message',
        message: message_text,
        username: username,
        timestamp: Time.current.iso8601,
        id: SecureRandom.uuid
      })
      
      logger.info "Message sent to room #{room}: #{message_text}"
    end
  end
end