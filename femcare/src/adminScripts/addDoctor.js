// adminScripts/addDoctor.js
// Run this script to add a doctor account
// Note: In a production environment, you would create a proper admin interface

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function createDoctorAccount() {
  try {
    // Collect doctor information
    const email = await question('Enter doctor email: ')
    const password = await question('Enter doctor password: ')
    const fullName = await question('Enter doctor full name: ')
    const specialty = await question('Enter doctor specialty: ')
    
    // Create user in Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
        specialty: specialty,
        user_type: 'doctor'
      }
    })
    
    if (authError) throw authError
    
    console.log('Doctor account created in Auth:', userData.user.id)
    
    // Insert into doctors table
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .insert([
        {
          user_id: userData.user.id,
          full_name: fullName,
          email: email,
          specialty: specialty
        }
      ])
      .select()
    
    if (doctorError) throw doctorError
    
    console.log('Doctor added to doctors table:', doctorData)
    console.log('Doctor account created successfully')
    
  } catch (error) {
    console.error('Error creating doctor account:', error.message)
  } finally {
    rl.close()
  }
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

createDoctorAccount()