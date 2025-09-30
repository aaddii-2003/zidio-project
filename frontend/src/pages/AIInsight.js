import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  SparklesIcon, 
  DocumentIcon, 
  ChartBarIcon,
  CpuChipIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AIInsight = () => {
  const { files, fetchFiles } = useAnalytics();
  const { isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Intentionally avoid including fetchFiles in deps to prevent re-fetch loops
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const analyzeFile = async (fileId) => {
    if (!isAuthenticated) {
      setError('You must be logged in to analyze files');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // First check if AI analysis already exists
      const file = files.find(f => f._id === fileId);
      if (file && file.aiAnalysis) {
        setAiAnalysis(file.aiAnalysis);
        setLoading(false);
        return;
      }

      // If not, trigger new analysis
      console.log('Starting AI analysis for file:', fileId);
      const response = await axios.post(`/api/ai/analyze/${fileId}`);
      
      console.log('AI analysis response:', response.data);
      setAiAnalysis(response.data.data);
      
      // Refresh files list to get updated data
      await fetchFiles();
    } catch (err) {
      console.error('AI analysis error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to analyze file';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    
    // If AI analysis already exists, load it immediately
    if (file.aiAnalysis) {
      setAiAnalysis(file.aiAnalysis);
    } else {
      setAiAnalysis(null);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return '📊';
    } else if (ext === 'csv') {
      return '📈';
    }
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Authentication Required
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please log in to access AI insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">AI Insight</h1>
            <p className="text-purple-100 mt-1">
              Get intelligent analysis and insights from your Excel files using advanced AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Selection Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select File to Analyze
              </h3>
              
              <div className="space-y-3">
                {files.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      No files available. Upload a file first.
                    </p>
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file._id}
                      onClick={() => handleFileSelect(file)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFile?._id === file._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getFileIcon(file.originalName)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)} • {file.status}
                          </p>
                          {file.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                              {file.description}
                            </p>
                          )}
                        </div>
                        {file.status === 'completed' && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedFile && selectedFile.status === 'completed' && (
                <div className="mt-4">
                  <button
                    onClick={() => analyzeFile(selectedFile._id)}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <CpuChipIcon className="h-4 w-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Results Panel */}
        <div className="lg:col-span-2">
          {!selectedFile ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
              <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No file selected
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select a file from the left panel to begin AI analysis
              </p>
            </div>
          ) : selectedFile.status !== 'completed' ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-yellow-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                File not ready
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This file is still being processed. Please wait for it to complete.
              </p>
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Analysis Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : !aiAnalysis ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
              <LightBulbIcon className="mx-auto h-12 w-12 text-purple-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Ready for Analysis
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Click "Analyze with AI" to get intelligent insights about your data
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Summary */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
                  AI Summary
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-gray-700 dark:text-gray-300">
                    {aiAnalysis.summary}
                  </p>
                </div>
              </div>

              {/* Data Insights */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Data Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiAnalysis.insights?.map((insight, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {insight.description}
                      </p>
                      {insight.value && (
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                          {insight.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column Analysis */}
              {aiAnalysis.columnAnalysis && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Column Analysis
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(aiAnalysis.columnAnalysis).map(([columnName, analysis]) => (
                      <div key={columnName} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {columnName}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {analysis.type && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Type:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{analysis.type}</p>
                            </div>
                          )}
                          {analysis.count && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Count:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{analysis.count}</p>
                            </div>
                          )}
                          {analysis.unique && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Unique:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{analysis.unique}</p>
                            </div>
                          )}
                          {analysis.nullCount && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Nulls:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{analysis.nullCount}</p>
                            </div>
                          )}
                        </div>
                        {analysis.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            {analysis.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-500" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                        </div>
                        <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          {recommendation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsight;
