
import { supabase } from "../supabaseClient";
import { publishMessage } from "./ablyServices";

export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Check if user is a patient
  let { data: patientData } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (patientData) {
    return { ...patientData, userType: 'patient', user_id: user.id };
  }
  
  // Check if user is a doctor
  let { data: doctorData } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (doctorData) {
    return { ...doctorData, userType: 'doctor', user_id: user.id };
  }
  
  return null;
};

// Get all conversations for the current user
export const getConversations = async () => {
  const userProfile = await getUserProfile();
  
  if (!userProfile) return [];
  
  let query;
  
  if (userProfile.userType === 'patient') {
    // For patients, fetch conversations with doctor details using explicit relationship name
    query = supabase
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
      .eq('patient_id', userProfile.id)
      .order('updated_at', { ascending: false });
  } else {
    // For doctors, fetch conversations with patient details using explicit relationship name
    query = supabase
      .from('conversations')
      .select(`
        id,
        updated_at,
        last_message,
        patient_id,
        patients!conversations_patient_id_fkey (
          id,
          full_name,
          profile_picture_path
        )
      `)
      .eq('doctor_id', userProfile.id)
      .order('updated_at', { ascending: false });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  
  // Process the data to maintain backward compatibility with existing code
  const processedData = data.map(conversation => {
    // For patients viewing their conversations with doctors
    if (userProfile.userType === 'patient') {
      return {
        ...conversation,
        doctor: conversation.doctors
      };
    } 
    // For doctors viewing their conversations with patients
    else {
      return {
        ...conversation,
        patient: conversation.patients
      };
    }
  });
  
  return processedData;
};

// Get a specific conversation by ID
export const getConversation = async (conversationId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      patient_id,
      doctor_id,
      patients!conversations_patient_id_fkey (
        id,
        full_name,
        profile_picture_path
      ),
      doctors!conversations_doctor_id_fkey (
        id,
        full_name,
        specialty,
        profile_picture_path
      )
    `)
    .eq('id', conversationId)
    .single();
  
  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
  
  // Process the data to maintain backward compatibility
  return {
    ...data,
    patient: data.patients,
    doctor: data.doctors
  };
};

// Get messages for a specific conversation
export const getMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return data;
};

// Send a new message
export const sendMessage = async (conversationId, content, receiverId) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Create the message object
  const messageData = {
    conversation_id: conversationId,
    sender_id: user.id,
    receiver_id: receiverId,
    content: content
  };
  
  // Insert the message into the database
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    return null;
  }
  
  // Update the conversation's last_message and updated_at
  await supabase
    .from('conversations')
    .update({
      last_message: content,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);
  
  // Notify via Ably that a new message was sent
  try {
    const channelName = `conversation:${conversationId}`;
    await publishMessage(channelName, data);
  } catch (ablyError) {
    console.error('Error publishing to Ably:', ablyError);
    // Continue even if Ably fails - the message is stored in the database
  }
  
  return data;
};

// Create a new conversation between a patient and doctor
export const createConversation = async (patientId, doctorId) => {
  const { data, error } = await supabase
    .rpc('get_or_create_conversation', {
      p_patient_id: patientId,
      p_doctor_id: doctorId
    });
  
  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
  
  return data;
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;
  
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', user.id)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Count unread messages for a user
export const getUnreadMessagesCount = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;
  
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error counting unread messages:', error);
    return 0;
  }
  
  return count || 0;
};