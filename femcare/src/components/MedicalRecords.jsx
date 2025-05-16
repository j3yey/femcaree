import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Sidenav from './Sidenav.jsx';
import Header from './Header.jsx';
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
  FaTimes,
  FaFolder,
  FaHeart,
  FaCheck
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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        return savedState ? JSON.parse(savedState) : false;
    });
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);
    const fileInputRef = useRef(null);

    // Handler functions
    const handleSidebarCollapse = (collapsed) => {
        setIsSidebarCollapsed(collapsed);
    };

    const toggleMobileSidebar = () => {
        setIsMobileSidebarVisible(!isMobileSidebarVisible);
    };

    const showNotification = (msg, type = 'success') => {
        setToastMessage(msg);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
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
    
    // Toggle mobile search
    const toggleMobileSearch = () => {
        setShowMobileSearch(!showMobileSearch);
        if (!showMobileSearch) {
            setSearchTerm('');
        }
    };
    
    // Trigger file input click
    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const handleSignOut = () => {
        signOut();
    };

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    return (
        <div className="app-container">
            <Header isSidebarCollapsed={isSidebarCollapsed} />
            <div className="app-layout">
                <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileSidebarVisible ? 'mobile-visible' : ''}`}>
                    <Sidenav 
                        onCollapsedChange={handleSidebarCollapse}
                        onSignOut={handleSignOut}
                    />
                </div>
                <div className="main-content">
                    <div className="profile-main">
                        {/* Existing content inside content-container */}
                        <div className="content-container">
                            {/* Header Section */}
                            <motion.div 
                                className="page-header"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="header-content">
                                    
                                    <div className="header-actions">
                                        
                                    </div>
                                </div>
                              
                            </motion.div>

                            {/* Search Bar - Mobile Optimized */}
                            <div className="mobile-search-bar">
                                <div className={`search-container ${showMobileSearch ? 'active' : ''}`}>
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search your records..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={clearSearch}
                                            className="clear-search"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                                <button className="search-toggle" onClick={toggleMobileSearch}>
                                    {showMobileSearch ? <FaTimes /> : <FaSearch />}
                                </button>
                            </div>

                            {/* Main Content Grid */}
                            <div className="records-grid">
                                {/* Upload Section */}
                                <motion.div 
                                    className="upload-section"
                                    whileHover={{ scale: 1.005 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <div className="upload-container">
                                        <div 
                                            className={`dropzone ${isDragging ? 'active' : ''}`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            onClick={triggerFileInput}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="hidden-input"
                                            />
                                            <div className="dropzone-content">
                                                <FaUpload className={`upload-icon ${isDragging ? 'bouncing' : ''}`} />
                                                <h3>Drag & drop files here</h3>
                                                <p>or click to browse files</p>
                                                <div className="file-types">
                                                    <div className="file-type-icon"><FaFilePdf title="PDF" /></div>
                                                    <div className="file-type-icon"><FaFileWord title="DOC" /></div>
                                                    <div className="file-type-icon"><FaFileImage title="Images" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Files List Section */}
                                <motion.div 
                                    className="files-section"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="files-container">
                                        <div className="files-header">
                                            <div className="desktop-search-bar">
                                                <FaSearch className="search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search your records..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                                {searchTerm && (
                                                    <button 
                                                        onClick={clearSearch}
                                                        className="clear-search"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {isLoading ? (
                                            <div className="loading-skeleton">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="skeleton-row">
                                                        <div className="skeleton-cell w-40" />
                                                        <div className="skeleton-cell w-20" />
                                                        <div className="skeleton-cell w-20" />
                                                        <div className="skeleton-cell w-30" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : filteredFiles.length === 0 ? (
                                            <div className="empty-state">
                                                <FaFolder className="empty-icon" />
                                                <h3>
                                                    {searchTerm ? 'No matching records' : 'No records yet'}
                                                </h3>
                                                <p>
                                                    {searchTerm 
                                                        ? `We couldn't find any files matching "${searchTerm}"`
                                                        : 'Upload your first medical record to get started'}
                                                </p>
                                                <button 
                                                    onClick={searchTerm ? clearSearch : triggerFileInput}
                                                    className="action-button primary"
                                                >
                                                    {searchTerm ? 'Clear Search' : 'Upload First Record'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="files-table">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th className="th-file">File Name</th>
                                                            <th className="th-type">Type</th>
                                                            <th className="th-size">Size</th>
                                                            <th className="th-date">Uploaded</th>
                                                            <th className="th-actions">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredFiles.map((file, index) => (
                                                            <motion.tr 
                                                                key={file.id}
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                className="file-row"
                                                            >
                                                                <td className="td-file">
                                                                    <div className="file-info">
                                                                        <div className={`file-icon ${getFileIconClass(file.file_type)}`}>
                                                                            {getFileIcon(file.file_type)}
                                                                        </div>
                                                                        <span className="file-name">
                                                                            {file.file_name}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="td-type">
                                                                    <span className={`file-badge ${getFileTypeClass(file.file_type)}`}>
                                                                        {file.file_type.split('/')[1].toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="td-size">{formatFileSize(file.file_size)}</td>
                                                                <td className="td-date">{formatDate(file.created_at)}</td>
                                                                <td className="td-actions">
                                                                    <div className="file-actions">
                                                                        <button
                                                                            onClick={() => downloadFile(file.file_path, file.file_name)}
                                                                            className="action-button download"
                                                                            title="Download"
                                                                        >
                                                                            <FaDownload />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteFile(file.id, file.file_path, file.file_name)}
                                                                            className="action-button delete"
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
                                                
                                                {/* Mobile Card View for Files */}
                                                <div className="mobile-files-view">
                                                    {filteredFiles.map((file, index) => (
                                                        <motion.div 
                                                            key={file.id}
                                                            className="file-card"
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                        >
                                                            <div className="file-card-header">
                                                                <div className={`file-icon ${getFileIconClass(file.file_type)}`}>
                                                                    {getFileIcon(file.file_type)}
                                                                </div>
                                                                <div className="file-card-info">
                                                                    <h4 className="file-name">{file.file_name}</h4>
                                                                    <div className="file-meta">
                                                                        <span className={`file-badge ${getFileTypeClass(file.file_type)}`}>
                                                                            {file.file_type.split('/')[1].toUpperCase()}
                                                                        </span>
                                                                        <span className="file-size">{formatFileSize(file.file_size)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="file-card-footer">
                                                                <div className="file-date">
                                                                    <span className="date-label">Uploaded:</span>
                                                                    {formatDate(file.created_at)}
                                                                </div>
                                                                <div className="file-actions">
                                                                    <button
                                                                        onClick={() => downloadFile(file.file_path, file.file_name)}
                                                                        className="action-button download"
                                                                        title="Download"
                                                                    >
                                                                        <FaDownload />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteFile(file.id, file.file_path, file.file_name)}
                                                                        className="action-button delete"
                                                                        title="Delete"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Toast Notification */}
                            <AnimatePresence>
                                {showToast && (
                                    <motion.div 
                                        className={`toast-notification ${toastType}`}
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 50 }}
                                    >
                                        <div className="toast-content">
                                            {toastType === 'error' ? <FaTimes /> : <FaDownload />}
                                            <span>{toastMessage}</span>
                                            <button onClick={() => setShowToast(false)} className="toast-close">
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* FAB for mobile upload */}
                            <button 
                                className="mobile-upload-fab"
                                onClick={triggerFileInput}
                                disabled={uploading}
                            >
                                <FaCloudUploadAlt />
                            </button>
                        </div>
                    </div>
                </div>
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
}