import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Sidenav from './Sidenav.jsx';
import { 
  FaDownload, 
  FaTrash, 
  FaUpload, 
  FaFile, 
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaFileWord,
  FaSearch,
  FaInfoCircle,
  FaTimes
} from 'react-icons/fa'; 
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/MedicalRecords.css';

export default function MedicalRecords() {
    const { user, signOut } = useAuth();
    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef(null);
    
    // Enhanced toast notification function
    const showNotification = (msg, type = 'success') => {
        setToastMessage(msg);
        setToastType(type);
        setShowToast(true);
        
        // Auto hide toast after 5 seconds
        setTimeout(() => {
            setShowToast(false);
        }, 5000);
    };

    // Fetch user's medical records on component mount
    useEffect(() => {
        if (user) {
            fetchMedicalRecords();
        }
    }, [user]);
    
    // Filter files based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredFiles(files);
        } else {
            const filtered = files.filter(file => 
                file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredFiles(filtered);
        }
    }, [searchTerm, files]);

    // Function to fetch all medical records for the current user
    const fetchMedicalRecords = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('medical_records')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFiles(data || []);
            setFilteredFiles(data || []);
        } catch (error) {
            console.error('Error fetching medical records:', error.message);
            showNotification('Failed to load medical records', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (event) => {
        try {
            setUploading(true);
            setMessage('');
            
            const file = event.target.files[0];
            if (!file) return;
    
            // Create a unique file path for storage that matches our policy
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            
            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('records')
                .upload(filePath, file);
    
            if (uploadError) throw uploadError;
    
            // Get the public URL for the file
            const { data: { publicUrl } } = supabase.storage
                .from('records')
                .getPublicUrl(filePath);
    
            // Insert record in the database
            const { error: insertError } = await supabase
                .from('medical_records')
                .insert({
                    user_id: user.id,
                    file_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    file_path: filePath,
                    public_url: publicUrl
                });
    
            if (insertError) throw insertError;
    
            showNotification('File uploaded successfully!');
            
            // Refresh the file list
            fetchMedicalRecords();
        } catch (error) {
            console.error('Error uploading file:', error.message);
            showNotification('Failed to upload file: ' + error.message, 'error');
        } finally {
            setUploading(false);
            // Clear the file input
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    // Function to download a file
    const downloadFile = async (filePath, fileName) => {
        try {
            const { data, error } = await supabase.storage
                .from('records')
                .download(filePath);
                
            if (error) throw error;
            
            // Create a download link
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(`Downloaded ${fileName} successfully`);
        } catch (error) {
            console.error('Error downloading file:', error.message);
            showNotification('Failed to download file: ' + error.message, 'error');
        }
    };

    // Function to delete a file
    const deleteFile = async (id, filePath, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }
        
        try {
            // First delete from storage
            const { error: storageError } = await supabase.storage
                .from('records')
                .remove([filePath]);
                
            if (storageError) throw storageError;
            
            // Then delete from database
            const { error: dbError } = await supabase
                .from('medical_records')
                .delete()
                .eq('id', id);
                    
            if (dbError) throw dbError;
            
            showNotification('File deleted successfully');
            
            // Refresh the file list
            fetchMedicalRecords();
        } catch (error) {
            console.error('Error deleting file:', error.message);
            showNotification('Failed to delete file: ' + error.message, 'error');
        }
    };

    // Format file size for display
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // Get file icon based on file type
    const getFileIcon = (fileType) => {
        if (fileType.includes('pdf')) {
            return <FaFilePdf />;
        } else if (fileType.includes('image')) {
            return <FaFileImage />;
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            return <FaFileWord />;
        } else {
            return <FaFileAlt />;
        }
    };
    
    // Get file type class
    const getFileTypeClass = (fileType) => {
        if (fileType.includes('pdf')) {
            return 'file-badge-pdf';
        } else if (fileType.includes('image')) {
            return 'file-badge-image';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            return 'file-badge-doc';
        } else {
            return 'file-badge-default';
        }
    };
    
    // Get file icon class
    const getFileIconClass = (fileType) => {
        if (fileType.includes('pdf')) {
            return 'file-icon-pdf';
        } else if (fileType.includes('image')) {
            return 'file-icon-image';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            return 'file-icon-doc';
        } else {
            return 'file-icon-default';
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const event = { target: { files: [file] } };
            handleFileUpload(event);
        }
    }, []);
    
    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
    };
    
    // Trigger file input click
    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    // Table loading skeleton component
    const TableSkeleton = () => (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            File Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Size
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Uploaded
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(3)].map((_, index) => (
                        <tr key={index}>
                            <td className="px-6 py-4">
                                <div className="h-6 w-48 loading-skeleton rounded"></div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="h-6 w-24 loading-skeleton rounded-full"></div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="h-6 w-16 loading-skeleton rounded"></div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="h-6 w-32 loading-skeleton rounded"></div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="h-6 w-24 loading-skeleton rounded"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="dashboard-container">
            <Sidenav onSignOut={signOut} />
            
            <div className="main-content p-8 lg:p-12">
                <div className="sticky top-0 bg-white z-10 pb-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl font-bold text-gray-800 mb-3">Medical Records</h1>
                        <hr className="border-gray-200 mb-6" />
                        <p className="text-gray-600 text-lg">Securely manage and store your medical documents</p>
                    </motion.div>
                </div>
                
                {/* Side by side layout container */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Upload Section - Takes 40% width on large screens */}
                    <motion.div 
                        className="glass-card rounded-2xl mb-8 lg:mb-0 transition-all hover:shadow-lg lg:w-2/5"
                        whileHover={{ scale: 1.005 }}
                    >
                        <div className="p-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                                <FaCloudUploadAlt className="mr-3 text-blue-500 text-3xl" />
                                Upload New Record
                            </h2>
                            <div 
                                className={`upload-zone ${isDragging ? 'dropzone-active' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={triggerFileInput}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                                <div className="flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <FaUpload className={`mx-auto text-4xl text-blue-400 mb-4 ${isDragging ? 'animate-bounce' : ''}`} />
                                        <p className="text-gray-700 font-medium mb-2">Drag and drop your file here</p>
                                        <p className="text-gray-500 text-sm">or click to browse files</p>
                                        <div className="mt-4 text-xs text-gray-400 flex items-center justify-center">
                                            <FaInfoCircle className="mr-2" />
                                            Supported files: PDF, DOC, DOCX, JPG, PNG
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {uploading && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-3 text-blue-500 mt-4 bg-blue-50 p-4 rounded-lg"
                                    >
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                        Uploading your file...
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                    
                    {/* Files List Section - Takes 60% width on large screens */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card2 rounded-2xl shadow-sm transition-all hover:shadow-lg lg:w-3/5"
                    >
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                                <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-4 md:mb-0">
                                    <FaFile className="mr-3 text-blue-500" />
                                    Your Records
                                </h2>
                                
                                {/* Search bar */}
                                <div className="relative w-full md:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search files..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                                    {searchTerm && (
                                        <button 
                                            onClick={clearSearch}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isLoading ? (
                                <TableSkeleton />
                            ) : filteredFiles.length === 0 ? (
                                <motion.div 
                                    className="empty-state"
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                >
                                    {searchTerm ? (
                                        <>
                                            <div className="empty-state-icon">
                                                <FaSearch className="mx-auto" />
                                            </div>
                                            <h3 className="text-xl font-medium text-gray-900 mb-3">No Matching Records</h3>
                                            <p className="text-gray-500 max-w-sm mx-auto">
                                                We couldn't find any files matching "{searchTerm}".
                                                Try a different search term or clear the search.
                                            </p>
                                            <button 
                                                onClick={clearSearch}
                                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                Clear Search
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="empty-state-icon">
                                                <FaFile className="mx-auto" />
                                            </div>
                                            <h3 className="text-xl font-medium text-gray-900 mb-3">No Records Found</h3>
                                            <p className="text-gray-500 max-w-sm mx-auto">
                                                Start by uploading your first medical record. We support various file formats 
                                                including PDF, DOC, DOCX, JPG, and PNG.
                                            </p>
                                            <button 
                                                onClick={triggerFileInput}
                                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                Upload First Record
                                            </button>
                                        </>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    File Name
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Size
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Uploaded
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredFiles.map((file, index) => (
                                                <motion.tr 
                                                    key={file.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="table-row"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className={`file-icon ${getFileIconClass(file.file_type)}`}>
                                                                {getFileIcon(file.file_type)}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {file.file_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`file-badge ${getFileTypeClass(file.file_type)}`}>
                                                            {file.file_type.split('/')[1].toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {formatFileSize(file.file_size)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {formatDate(file.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => downloadFile(file.file_path, file.file_name)}
                                                                className="btn-action btn-download"
                                                                title="Download"
                                                            >
                                                                <FaDownload />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteFile(file.id, file.file_path, file.file_name)}
                                                                className="btn-action btn-delete"
                                                                title="Delete"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
                
                {/* Toast Notification */}
                <AnimatePresence>
                    {showToast && (
                        <motion.div 
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            className={`toast ${toastType === 'error' ? 'toast-error' : 'toast-success'}`}
                        >
                            {toastType === 'error' ? (
                                <FaTimes className="text-red-600" />
                            ) : (
                                <FaDownload className="text-green-600" />
                            )}
                            <span>{toastMessage}</span>
                            <button 
                                onClick={() => setShowToast(false)} 
                                className="ml-auto text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}