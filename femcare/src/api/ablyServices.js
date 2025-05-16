import React from 'react';
import { Ably } from 'ably';

// Create an Ably instance
const createAblyClient = () => {
  // Use environment variable if available (for production)
  const apiKey = process.env.REACT_APP_ABLY_API_KEY || 'BNJk9g.SK-MXA:A4605sq6wJIekCFesj48rKYQAJPIhkN1x1X1FwBp8oA';
  
  return new Ably.Realtime({
    key: apiKey,
    clientId: `webapp-${Math.random().toString(36).substring(2, 9)}`, // Generate random client ID
    echoMessages: false // Don't receive messages sent by this client
  });
};

// Singleton pattern for Ably client
let ablyClientInstance = null;

// Get or create the Ably client instance
export const getAblyClient = () => {
  if (!ablyClientInstance) {
    ablyClientInstance = createAblyClient();
    
    // Add connection state logging for debugging
    ablyClientInstance.connection.on('connected', () => {
      console.log('Ably connection successful');
    });
    
    ablyClientInstance.connection.on('failed', (err) => {
      console.error('Ably connection failed:', err);
    });
    
    ablyClientInstance.connection.on('disconnected', () => {
      console.log('Ably disconnected');
    });
  }
  
  return ablyClientInstance;
};

// Function to create or get a channel
export const getChannel = (channelName) => {
  const client = getAblyClient();
  return client.channels.get(channelName);
};

// Subscribe to a channel and receive messages
export const subscribeToChannel = (channelName, callback) => {
  try {
    const channel = getChannel(channelName);
    
    // Debug log
    console.log(`Subscribing to channel: ${channelName}`);
    
    // Subscribe to all messages on this channel
    channel.subscribe((message) => {
      console.log(`Received message on ${channelName}:`, message);
      callback(message.data);
    });
    
    // Return a function to unsubscribe
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      channel.unsubscribe();
    };
  } catch (error) {
    console.error(`Error subscribing to channel ${channelName}:`, error);
    return () => {}; // Return empty cleanup function
  }
};

// Publish a message to a channel
export const publishMessage = async (channelName, message) => {
  try {
    const channel = getChannel(channelName);
    console.log(`Publishing to channel ${channelName}:`, message);
    await channel.publish('message', message);
    return true;
  } catch (error) {
    console.error(`Error publishing to channel ${channelName}:`, error);
    return false;
  }
};

// Check connection status
export const getConnectionState = () => {
  const client = getAblyClient();
  return client.connection.state;
};

// Manually connect to Ably
export const connectToAbly = () => {
  const client = getAblyClient();
  client.connection.connect();
};

// Manually disconnect from Ably
export const disconnectFromAbly = () => {
  if (ablyClientInstance) {
    ablyClientInstance.connection.close();
  }
};

// Listen for connection state changes
export const onConnectionStateChange = (callback) => {
  const client = getAblyClient();
  client.connection.on(callback);
  
  // Return a function to remove the listener
  return () => {
    client.connection.off(callback);
  };
};

// Create a presence instance for a channel
export const enterChannelPresence = async (channelName, presenceData) => {
  const channel = getChannel(channelName);
  await channel.presence.enter(presenceData);
};

// Get members present in a channel
export const getChannelPresence = async (channelName) => {
  const channel = getChannel(channelName);
  return await channel.presence.get();
};

// Subscribe to presence changes
export const subscribeToPresence = (channelName, callback) => {
  const channel = getChannel(channelName);
  
  channel.presence.subscribe('enter', (member) => {
    callback('enter', member);
  });
  
  channel.presence.subscribe('leave', (member) => {
    callback('leave', member);
  });
  
  // Return a function to unsubscribe
  return () => {
    channel.presence.unsubscribe();
  };
};

// Custom hook for using Ably in React components
export const useAbly = (channelName, onMessage) => {
  const [connectionState, setConnectionState] = React.useState('disconnected');
  
  React.useEffect(() => {
    // Set up connection state monitoring
    const stateChangeListener = (stateChange) => {
      setConnectionState(stateChange.current);
    };
    
    const cleanup = onConnectionStateChange(stateChangeListener);
    
    // Set up message subscription if channelName and callback provided
    let messageCleanup = () => {};
    if (channelName && onMessage) {
      messageCleanup = subscribeToChannel(channelName, onMessage);
    }
    
    // Initial connection state
    setConnectionState(getConnectionState());
    
    // Clean up on unmount
    return () => {
      cleanup();
      messageCleanup();
    };
  }, [channelName, onMessage]);
  
  return { connectionState };
};

export default {
  getAblyClient,
  getChannel,
  subscribeToChannel,
  publishMessage,
  getConnectionState,
  connectToAbly,
  disconnectFromAbly,
  onConnectionStateChange,
  enterChannelPresence,
  getChannelPresence,
  subscribeToPresence,
  useAbly
};