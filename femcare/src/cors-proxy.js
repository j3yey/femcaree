// cors-proxy.js - Create this file in your backend or as a serverless function

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// Supabase configuration
const supabaseUrl = 'https://oolpmrioihlbfxsux.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use server-side service key

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3174', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request body
app.use(express.json());

// Initialize Supabase with service role for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Proxy endpoint for conversations
app.get('/api/conversations', async (req, res) => {
  try {
    // Get auth token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Use the token to make an authenticated request to Supabase
    const { data: user } = await supabase.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to determine if doctor or patient
    let doctorData = null;
    let patientData = null;
    let userProfile = null;

    // Check if user is a doctor
    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (doctor) {
      doctorData = doctor;
      userProfile = { ...doctor, userType: 'doctor' };
    } else {
      // Check if user is a patient
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (patient) {
        patientData = patient;
        userProfile = { ...patient, userType: 'patient' };
      }
    }

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Fetch conversations based on user type
    let conversations;
    if (userProfile.userType === 'doctor') {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          last_message,
          patient_id,
          patients:patient_id (
            id,
            full_name,
            profile_picture_path
          )
        `)
        .eq('doctor_id', doctorData.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      conversations = data;
    } else {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          last_message,
          doctors:doctor_id (
            id,
            full_name,
            specialty,
            profile_picture_path
          )
        `)
        .eq('patient_id', patientData.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      conversations = data;
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add other proxy endpoints as needed for messages, etc.

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CORS proxy server running on port ${PORT}`);
});

module.exports = app; // For serverless deployment