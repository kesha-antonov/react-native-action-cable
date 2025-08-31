/**
 * Example React component showing proper ActionCable connection management
 * 
 * This demonstrates how to prevent multiple connections when components
 * remount during development (Hot Reload) or app restarts.
 */

import React, { Component } from 'react';
import { initActionCable, cleanupActionCable } from '../../helpers/ActionCable';

class ConversationList extends Component {
  actionCableConnection = null;

  componentDidMount = async () => {
    // Initialize ActionCable connection
    this.actionCableConnection = await initActionCable();
  };

  componentWillUnmount = () => {
    // Clean up the connection when component unmounts
    if (this.actionCableConnection) {
      this.actionCableConnection.disconnect();
      this.actionCableConnection = null;
    }
    
    // Optional: Clean up the global ActionCable consumer
    // This is useful if you want to completely reset the connection
    // cleanupActionCable();
  };

  render = () => {
    return (
      // Your component JSX here
    );
  };
}

export default ConversationList;