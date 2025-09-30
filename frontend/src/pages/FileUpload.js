import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const FileUpload = () => {
  const [uploadData, setUploadData] = useState({
    description: '',
    tags: '',
    isPublic: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  const [selectedXColumn, setSelectedXColumn] = useState(0);
  const [selectedYColumn, setSelectedYColumn] = useState(1);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [generatingAnalytics, setGeneratingAnalytics] = useState(false);

  const { uploadFile, generateCustomChart, fetchColumnHeaders } = useAnalytics();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);

    try {
      const result = await uploadFile(file, {
        description: uploadData.description,
        tags: uploadData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPublic: uploadData.isPublic
      });

      if (result.success) {
        setUploadedFile(result.file);
        setUploadData({
          description: '',
          tags: '',
          isPublic: false
        });
        
        // Wait for file processing, then show column selection
        setTimeout(async () => {
          try {
            // Try to fetch column headers multiple times if file is still processing
            let attempts = 0;
            const maxAttempts = 5;
            
            const fetchHeaders = async () => {
              attempts++;
              try {
                const headers = await fetchColumnHeaders(result.file._id);
                if (headers && headers.length > 0) {
                  setAvailableColumns(headers);
                  setShowColumnSelection(true);
                  return true;
                }
              } catch (error) {
                console.log(`Attempt ${attempts}: File still processing or error:`, error.message);
              }
              
              if (attempts < maxAttempts) {
                setTimeout(fetchHeaders, 2000); // Try again in 2 seconds
              } else {
                // Fallback to mock columns if all attempts fail
                console.log('Using fallback columns after max attempts');
                const mockColumns = ['Column 1', 'Column 2', 'Column 3', 'Column 4'];
                setAvailableColumns(mockColumns);
                setShowColumnSelection(true);
              }
            };
            
            fetchHeaders();
          } catch (error) {
            console.error('Error in column header fetching process:', error);
            // Fallback to mock columns
            const mockColumns = ['Column 1', 'Column 2', 'Column 3', 'Column 4'];
            setAvailableColumns(mockColumns);
            setShowColumnSelection(true);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [uploadData, uploadFile]);

  const handleGenerateAnalytics = async () => {
    if (!uploadedFile) return;
    
    setGeneratingAnalytics(true);
    try {
      // Generate analytics with selected columns
      const result = await generateCustomChart(uploadedFile._id, 'bar', selectedXColumn, selectedYColumn);
      if (result) {
        // Navigate directly to analytics page
        navigate(`/analytics/${uploadedFile._id}`);
      }
    } catch (error) {
      console.error('Analytics generation error:', error);
    } finally {
      setGeneratingAnalytics(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUploadData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setUploading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Upload Excel File
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload your Excel file to start creating beautiful 3D visualizations and analytics.
        </p>
      </div>

      {!uploadedFile ? (
        <div className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
              isDragActive
                ? isDragReject
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isDragActive
                  ? isDragReject
                    ? 'File type not supported'
                    : 'Drop the file here'
                  : 'Drag and drop your Excel file here'}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                or click to browse files
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Supports .xlsx, .xls, and .csv files up to 10MB
              </p>
            </div>
          </div>

          {/* Upload Options */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Upload Options
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Describe your data..."
                  value={uploadData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags (optional)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Enter tags separated by commas (e.g., sales, quarterly, revenue)"
                  value={uploadData.tags}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  checked={uploadData.isPublic}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Make this file public (others can view and analyze it)
                </label>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          {uploading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Uploading file...
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>Please wait while we process your file. This may take a few moments.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Success State */
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <DocumentIcon className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                File uploaded successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p><strong>File:</strong> {uploadedFile.originalName}</p>
                <p><strong>Status:</strong> {uploadedFile.status}</p>
                <p className="mt-2">
                  Your file is being processed. You'll be able to view analytics once processing is complete.
                </p>
              </div>
              <div className="mt-4">
                <div className="flex space-x-3">
                  <button
                    onClick={resetUpload}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700"
                  >
                    Upload Another File
                  </button>
                  {uploadedFile.status === 'completed' && (
                    <button
                      onClick={async () => {
                        try {
                          const headers = await fetchColumnHeaders(uploadedFile._id);
                          if (headers && headers.length > 0) {
                            setAvailableColumns(headers);
                          } else {
                            // Fallback to mock columns
                            const mockColumns = ['Column 1', 'Column 2', 'Column 3', 'Column 4'];
                            setAvailableColumns(mockColumns);
                          }
                          setShowColumnSelection(true);
                        } catch (error) {
                          console.error('Error fetching headers:', error);
                          // Use fallback columns
                          const mockColumns = ['Column 1', 'Column 2', 'Column 3', 'Column 4'];
                          setAvailableColumns(mockColumns);
                          setShowColumnSelection(true);
                        }
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      Generate Analytics
                    </button>
                  )}
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={resetUpload}
                  className="inline-flex bg-green-50 dark:bg-green-900/20 rounded-md p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Selection Modal */}
      {showColumnSelection && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Columns for Analytics
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    X-Axis (Labels)
                  </label>
                  <select
                    value={selectedXColumn}
                    onChange={(e) => setSelectedXColumn(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {availableColumns.map((column, index) => (
                      <option key={index} value={index}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Y-Axis (Values)
                  </label>
                  <select
                    value={selectedYColumn}
                    onChange={(e) => setSelectedYColumn(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {availableColumns.map((column, index) => (
                      <option key={index} value={index}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowColumnSelection(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateAnalytics}
                  disabled={generatingAnalytics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {generatingAnalytics ? 'Generating...' : 'Generate Analytics'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;


