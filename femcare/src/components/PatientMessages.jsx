import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSend, IoArrowBack, IoPerson, IoAdd, IoSearch } from 'react-icons/io5';
import { supabase } from '../supabaseClient';
import { subscribeToChannel, publishMessage } from '../api/ablyServices';
import '../styles/PatientMessages.css';
import Sidenav from './Sidenav';
import Header from './Header';

const PatientMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // New states for creating new conversations
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  // Channel subscription cleanup reference
  const channelCleanupRef = useRef(null);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarVisible(!isMobileSidebarVisible);
  };

  // Fetch user profile and conversations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        // Check if user is a patient
        let { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (patientError || !patientData) {
          navigate('/unauthorized');
          return;
        }
        
        setUserProfile({ ...patientData, userType: 'patient', user_id: user.id });
        
        // Fetch conversations with doctors
        await fetchConversations(patientData.id);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load messages. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [navigate]);

  // Fetch conversations for the patient
  const fetchConversations = async (patientId) => {
    try {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          last_message,
          doctor_id,
          doctors!conversations_doctor_id_fkey (
            id,
            full_name,
            specialty,
            profile_picture_path
          )
        `)
        .eq('patient_id', patientId)
        .order('updated_at', { ascending: false });
      
      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        setError(`Failed to load conversations: ${conversationsError.message}`);
        return;
      }
      
      // Process conversations to match expected format
      const processedConvos = conversationsData.map(conversation => ({
        ...conversation,
        doctor: conversation.doctors
      }));
      
      setConversations(processedConvos || []);
      
      // For debugging
      console.log('Fetched conversations:', processedConvos);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(`Failed to load conversations: ${err.message}`);
    }
  };

  // Load available doctors for creating new conversations
  const fetchAvailableDoctors = async () => {
    if (!userProfile) return;
    
    try {
      setLoadingDoctors(true);
      
      // Get all doctors
      const { data: allDoctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, profile_picture_path')
        .ilike('full_name', `%${searchQuery}%`)
        .order('full_name', { ascending: true });
      
      if (doctorsError) {
        throw doctorsError;
      }
      
      // Get existing conversation doctor IDs
      const existingDoctorIds = conversations.map(conv => conv.doctor_id);
      
      // Filter out doctors who already have a conversation
      const filteredDoctors = allDoctors.filter(
        doctor => !existingDoctorIds.includes(doctor.id)
      );
      
      setAvailableDoctors(filteredDoctors);
      setLoadingDoctors(false);
    } catch (err) {
      console.error('Error fetching available doctors:', err);
      setLoadingDoctors(false);
    }
  };

  // Fetch available doctors when search query changes or new conversation modal opens
  useEffect(() => {
    if (showNewConversation) {
      fetchAvailableDoctors();
    }
  }, [searchQuery, showNewConversation]);

  // Handle conversation selection
  const handleSelectConversation = async (conversation) => {
    try {
      setActiveConversation(conversation);
      
      // Clean up previous subscription if exists
      if (channelCleanupRef.current) {
        channelCleanupRef.current();
        channelCleanupRef.current = null;
      }
      
      // Fetch messages for this conversation
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        throw messagesError;
      }
      
      setMessages(messagesData || []);
      
      // Mark messages as read
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversation.id)
          .eq('receiver_id', user.id)
          .eq('is_read', false);
      }
      
      // Subscribe to real-time updates using Ably
      const channelName = `conversation:${conversation.id}`;
      
      // Store cleanup function for Ably subscription
      channelCleanupRef.current = subscribeToChannel(channelName, (newMessageData) => {
        // Add new message to the chat
        setMessages(prevMessages => {
          // Check if message already exists to prevent duplicates
          const messageExists = prevMessages.some(msg => msg.id === newMessageData.id);
          if (messageExists) return prevMessages;
          return [...prevMessages, newMessageData];
        });
        
        // Mark as read if the current user is the receiver
        if (user && newMessageData.receiver_id === user.id) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', newMessageData.id)
            .then();
        }
      });
      
    } catch (err) {
      console.error('Error selecting conversation:', err);
      setError(`Failed to load conversation messages: ${err.message}`);
    }
  };

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Get the doctor's user ID
      const doctorId = activeConversation.doctor_id;
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('id', doctorId)
        .single();
      
      if (doctorError) throw doctorError;
      
      const doctorUserId = doctorData.user_id;
      
      // Create the message
      const messageData = {
        conversation_id: activeConversation.id,
        sender_id: user.id,
        receiver_id: doctorUserId,
        content: newMessage
      };
      
      // Insert the message
      const { data: sentMessage, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Update conversation with last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConversation.id);
      
      // Add new message to the UI
      setMessages(prev => [...prev, sentMessage]);
      
      // Update conversation in the list
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              last_message: newMessage,
              updated_at: new Date().toISOString()
            };
          }
          return conv;
        })
      );
      
      // Publish to Ably for real-time updates
      await publishMessage(`conversation:${activeConversation.id}`, sentMessage);
      
      // Clear input
      setNewMessage('');
      setSendingMessage(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message: ${err.message}`);
      setSendingMessage(false);
    }
  };

  // Create a new conversation with a doctor
  const handleCreateConversation = async (doctor) => {
    try {
      if (!userProfile) throw new Error('User profile not loaded');
      
      // Create conversation using the RPC function from SQL
      const { data: conversationId, error } = await supabase
        .rpc('get_or_create_conversation', {
          p_patient_id: userProfile.id,
          p_doctor_id: doctor.id
        });
      
      if (error) throw error;
      
      // Fetch the created conversation
      const { data: newConversation, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          last_message,
          doctor_id,
          doctors!conversations_doctor_id_fkey (
            id,
            full_name,
            specialty,
            profile_picture_path
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Process the conversation to match expected format
      const processedConvo = {
        ...newConversation,
        doctor: newConversation.doctors
      };
      
      // Add to conversations list
      setConversations(prev => [processedConvo, ...prev]);
      
      // Select the new conversation
      setActiveConversation(processedConvo);
      
      // Close new conversation modal
      setShowNewConversation(false);
      setSearchQuery('');
      
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(`Failed to create conversation: ${err.message}`);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      if (channelCleanupRef.current) {
        channelCleanupRef.current();
      }
    };
  }, []);

  // Format time for display
  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Format date for conversations list
  const formatConversationDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  // Check if a message was sent by the current user
  const isOwnMessage = (senderId) => {
    return userProfile && userProfile.user_id === senderId;
  };

  // Sort conversations by most recent
  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.updated_at) - new Date(a.updated_at)
  );

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading messages...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="messages-page">
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileSidebarVisible ? 'mobile-visible' : ''}`}>
        <Sidenav 
          onCollapsedChange={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
      </div>

      <div className={`messages-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sidebar with conversations list */}
        <div className={`conversations-sidebar ${activeConversation ? 'hidden md:block' : ''}`}>
          <div className="sidebar-header">
            <h2>Messages</h2>
            <button 
              onClick={() => setShowNewConversation(true)}
              className="new-conversation-button"
              aria-label="New conversation"
            >
              <IoAdd size={20} />
            </button>
          </div>
          
          <div className="conversations-list">
            {sortedConversations.length === 0 ? (
              <div className="no-conversations">
                No conversations yet. Click the + button to start a new conversation with a doctor.
              </div>
            ) : (
              sortedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`conversation-item ${
                    activeConversation?.id === conversation.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="conversation-profile">
                    {conversation.doctor?.profile_picture_path ? (
                      <img
                        src={conversation.doctor.profile_picture_path}
                        alt={conversation.doctor.full_name}
                        className="profile-image"
                      />
                    ) : (
                      <div className="profile-placeholder">
                        <IoPerson size={24} />
                      </div>
                    )}
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <h3 className="conversation-name">{conversation.doctor?.full_name || 'Unknown Doctor'}</h3>
                        <span className="conversation-time">
                          {formatConversationDate(conversation.updated_at)}
                        </span>
                      </div>
                      <p className="conversation-preview">
                        {conversation.doctor?.specialty && (
                          <span className="specialty-tag">{conversation.doctor.specialty}</span>
                        )}
                        {conversation.last_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`chat-area ${!activeConversation ? 'hidden md:flex' : ''}`}>
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="chat-header">
                <button 
                  className="back-button md:hidden" 
                  onClick={() => setActiveConversation(null)}
                >
                  <IoArrowBack size={20} />
                </button>
                
                {activeConversation.doctor?.profile_picture_path ? (
                  <img
                    src={activeConversation.doctor.profile_picture_path}
                    alt={activeConversation.doctor.full_name}
                    className="chat-profile-image"
                  />
                ) : (
                  <div className="chat-profile-placeholder">
                    <IoPerson size={20} />
                  </div>
                )}
                
                <div className="chat-profile-info">
                  <h3>{activeConversation.doctor?.full_name || 'Unknown Doctor'}</h3>
                  <p>
                    {activeConversation.doctor?.specialty || 'Doctor'}
                  </p>
                </div>
              </div>
              
              {/* Messages */}
              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    No messages yet. Start a conversation with your doctor!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message-bubble ${
                        isOwnMessage(message.sender_id) ? 'own' : 'other'
                      }`}
                    >
                      <div
                        className={`message-content ${
                          isOwnMessage(message.sender_id) ? 'own' : 'other'
                        }`}
                      >
                        {message.content}
                      </div>
                      <div
                        className={`message-time ${
                          isOwnMessage(message.sender_id) ? 'own' : ''
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <div className="message-input-container">
                <form onSubmit={handleSendMessage} className="message-form">
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <IoSend size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-chat-container">
              <p className="empty-chat-title">Select a conversation</p>
              <p className="empty-chat-subtitle">Choose a doctor to start messaging</p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="new-chat-button"
              >
                <IoAdd size={20} /> New Conversation
              </button>
            </div>
          )}
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Message a Doctor</h3>
                <button 
                  onClick={() => {
                    setShowNewConversation(false);
                    setSearchQuery('');
                  }}
                  className="modal-close"
                >
                  &times;
                </button>
              </div>
              
              <div className="search-container">
                <div className="search-input-wrapper">
                  <div className="search-icon-container">
                    <IoSearch size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="doctors-list">
                {loadingDoctors ? (
                  <div className="loading-doctors">Loading doctors...</div>
                ) : availableDoctors.length === 0 ? (
                  <div className="no-doctors">
                    {searchQuery ? 'No doctors found' : 'No doctors available'}
                  </div>
                ) : (
                  availableDoctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="doctor-item"
                      onClick={() => handleCreateConversation(doctor)}
                    >
                      {doctor.profile_picture_path ? (
                        <img
                          src={doctor.profile_picture_path}
                          alt={doctor.full_name}
                          className="profile-image"
                        />
                      ) : (
                        <div className="profile-placeholder">
                          <IoPerson size={20} />
                        </div>
                      )}
                      <div>
                        <h4 className="conversation-name">{doctor.full_name}</h4>
                        {doctor.specialty && (
                          <p className="specialty-tag">{doctor.specialty}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sidebar toggle button */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Toggle sidebar"
      >
        ≡
      </button>
    </div>
  );
};
export default PatientMessages;