import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/DoctorProfile.css';

export default function DoctorProfile() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setDoctor(data);
      if (data.profile_picture_path) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(data.profile_picture_path);
        setAvatarUrl(publicUrl);
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event) {
    try {
      setUploading(true);

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${(await supabase.auth.getUser()).data.user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update the doctor record with the new profile picture path
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ profile_picture_path: filePath })
        .eq('user_id', (await supabase.auth.getUser()).data.user.id);

      if (updateError) throw updateError;

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="doctor-profile">
      <div className="avatar-container">
        {avatarUrl ? (
          <img 
            src={avatarUrl}
            alt="Doctor avatar"
            className="avatar-image"
          />
        ) : (
          <div className="avatar-placeholder">
            {doctor?.full_name?.charAt(0) || '?'}
          </div>
        )}
        <label className="avatar-upload-label">
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'Uploading...' : 'Change Picture'}
        </label>
      </div>
      <div className="doctor-info">
        <h3>{doctor?.full_name}</h3>
        <p>{doctor?.specialty}</p>
      </div>
    </div>
  );
}