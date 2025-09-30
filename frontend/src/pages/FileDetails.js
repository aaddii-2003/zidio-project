import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { 
  DocumentIcon, 
  ChartBarIcon, 
  EyeIcon, 
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const FileDetails = () => {
  const { id } = useParams();
  const { currentFile, loading, fetchFileDetails, deleteFile } = useAnalytics();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generatingAnalytics, setGeneratingAnalytics] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFileDetails(id);
    }
  }, [id]);

  const handleDelete = async () => {
    const result = await deleteFile(id);
    if (result.success) {
      // Redirect to dashboard after successful deletion
      window.location.href = '/dashboard';
    }
  };

  const handleGenerateAnalytics = async () => {
    try {
      setGeneratingAnalytics(true);
      const response = await fetch(`/api/files/${id}/generate-analytics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        // Refresh file details to show updated analytics
        await fetchFileDetails(id);
        alert('Analytics generated successfully!');
      } else {
        alert('Error generating analytics: ' + result.message);
      }
    } catch (error) {
      console.error('Error generating analytics:', error);
      alert('Error generating analytics: ' + error.message);
    } finally {
      setGeneratingAnalytics(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">File not found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The file you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            {currentFile.originalName}
          </h2>
          <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              Uploaded {new Date(currentFile.createdAt).toLocaleDateString()}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <UserIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              {currentFile.uploadedBy?.name || 'Unknown'}
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          {currentFile.status === 'completed' && (
            <>
              <Link
                to={`/analytics/${currentFile._id}`}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
              <button
                onClick={handleGenerateAnalytics}
                disabled={generatingAnalytics}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingAnalytics ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CpuChipIcon className="h-4 w-4 mr-2" />
                )}
                {generatingAnalytics ? 'Generating...' : 'Generate Analytics'}
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* File Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            File Information
          </h3>
          
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Original Name</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentFile.originalName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Size</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatFileSize(currentFile.size)}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Type</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentFile.mimetype}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentFile.status)}`}>
                  {currentFile.status}
                </span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Analytics</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentFile.analytics?.isProcessed 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {currentFile.analytics?.isProcessed ? 'Processed' : 'Not Processed'}
                </span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Public</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {currentFile.isPublic ? 'Yes' : 'No'}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(currentFile.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {currentFile.description && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentFile.description}</dd>
            </div>
          )}

          {currentFile.tags && currentFile.tags.length > 0 && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</dt>
              <dd className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {currentFile.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      {currentFile.metadata && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Data Structure
            </h3>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Rows</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentFile.metadata.totalRows?.toLocaleString() || 'N/A'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Columns</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentFile.metadata.totalColumns || 'N/A'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sheets</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentFile.metadata.sheets?.length || 0}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentFile.metadata.fileType || 'Unknown'}
                </dd>
              </div>
            </dl>

            {currentFile.metadata.sheets && currentFile.metadata.sheets.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Sheets</h4>
                <div className="space-y-3">
                  {currentFile.metadata.sheets.map((sheet, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">{sheet.name}</h5>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div>Rows: {sheet.rowCount?.toLocaleString() || 0}</div>
                        <div>Columns: {sheet.columnCount || 0}</div>
                      </div>
                      {sheet.headers && sheet.headers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Headers:</p>
                          <div className="flex flex-wrap gap-1">
                            {sheet.headers.slice(0, 10).map((header, headerIndex) => (
                              <span
                                key={headerIndex}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              >
                                {header}
                              </span>
                            ))}
                            {sheet.headers.length > 10 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{sheet.headers.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteConfirm(false)} />
            
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                      Delete File
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete "{currentFile.originalName}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  onClick={handleDelete}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDetails;
