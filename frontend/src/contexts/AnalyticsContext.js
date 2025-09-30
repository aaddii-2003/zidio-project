import React, { createContext, useContext, useReducer } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AnalyticsContext = createContext();

const initialState = {
  files: [],
  currentFile: null,
  analytics: null,
  overview: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalFiles: 0,
    hasNext: false,
    hasPrev: false
  }
};

const analyticsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'SET_FILES':
      return {
        ...state,
        files: action.payload.files,
        pagination: action.payload.pagination,
        loading: false
      };
    case 'ADD_FILE':
      return {
        ...state,
        files: [action.payload, ...state.files],
        pagination: {
          ...state.pagination,
          totalFiles: state.pagination.totalFiles + 1
        }
      };
    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(file => 
          file._id === action.payload._id ? action.payload : file
        )
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(file => file._id !== action.payload),
        pagination: {
          ...state.pagination,
          totalFiles: state.pagination.totalFiles - 1
        }
      };
    case 'SET_CURRENT_FILE':
      return {
        ...state,
        currentFile: action.payload
      };
    case 'SET_ANALYTICS':
      return {
        ...state,
        analytics: action.payload,
        loading: false
      };
    case 'SET_OVERVIEW':
      return {
        ...state,
        overview: action.payload,
        loading: false
      };
    default:
      return state;
  }
};

export const AnalyticsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(analyticsReducer, initialState);

  const fetchFiles = async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`/api/files?${queryParams}`);
      
      dispatch({
        type: 'SET_FILES',
        payload: {
          files: response.data.data.files,
          pagination: response.data.data.pagination
        }
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch files';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    }
  };

  const uploadFile = async (file, metadata = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', metadata.description || '');
      formData.append('tags', JSON.stringify(metadata.tags || []));
      formData.append('isPublic', metadata.isPublic || false);

      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      dispatch({
        type: 'ADD_FILE',
        payload: response.data.data.file
      });

      toast.success('File uploaded successfully!');
      return { success: true, file: response.data.data.file };
    } catch (error) {
      const message = error.response?.data?.message || 'File upload failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const fetchFileDetails = async (fileId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await axios.get(`/api/files/${fileId}`);
      
      dispatch({
        type: 'SET_CURRENT_FILE',
        payload: response.data.data.file
      });

      return response.data.data.file;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch file details';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return null;
    }
  };

  const fetchAnalytics = async (fileId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('Fetching analytics for file:', fileId);
      const response = await axios.get(`/api/analytics/file/${fileId}`);
      
      console.log('Analytics response:', response.data);
      
      const analytics = response.data.data.analytics;
      console.log('Analytics data:', analytics);
      
      if (analytics.chartData) {
        console.log('Chart data available:', analytics.chartData);
        Object.keys(analytics.chartData).forEach(type => {
          console.log(`${type} chart data:`, analytics.chartData[type]);
        });
      } else {
        console.log('No chart data in analytics response');
      }
      
      dispatch({
        type: 'SET_ANALYTICS',
        payload: analytics
      });

      return analytics;
    } catch (error) {
      console.error('Analytics fetch error:', error);
      const message = error.response?.data?.message || 'Failed to fetch analytics';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return null;
    }
  };

  const fetchOverview = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await axios.get('/api/analytics/overview');
      
      dispatch({
        type: 'SET_OVERVIEW',
        payload: response.data.data.overview
      });

      return response.data.data.overview;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch overview';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return null;
    }
  };

  const updateFile = async (fileId, updateData) => {
    try {
      const response = await axios.put(`/api/files/${fileId}`, updateData);
      
      dispatch({
        type: 'UPDATE_FILE',
        payload: response.data.data.file
      });

      toast.success('File updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'File update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      
      dispatch({
        type: 'REMOVE_FILE',
        payload: fileId
      });

      toast.success('File deleted successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'File deletion failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const generateCustomChart = async (fileId, chartType, xColumnIndex, yColumnIndex) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('Generating custom chart:', { fileId, chartType, xColumnIndex, yColumnIndex });
      
      const response = await axios.post(`/api/analytics/file/${fileId}/chart`, {
        chartType,
        xColumnIndex,
        yColumnIndex
      });
      
      console.log('Custom chart response:', response.data);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      return response.data.data;
    } catch (error) {
      console.error('Custom chart generation error:', error);
      const message = error.response?.data?.message || 'Failed to generate custom chart';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return null;
    }
  };

  const deleteFileWithAnalytics = async (fileId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('Deleting file:', fileId);
      
      const response = await axios.delete(`/api/analytics/file/${fileId}`);
      
      console.log('File deletion response:', response.data);
      
      dispatch({
        type: 'REMOVE_FILE',
        payload: fileId
      });

      toast.success('File deleted successfully!');
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true };
    } catch (error) {
      console.error('File deletion error:', error);
      const message = error.response?.data?.message || 'File deletion failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: message };
    }
  };

  const fetchColumnHeaders = async (fileId) => {
    try {
      const response = await axios.get(`/api/analytics/file/${fileId}/columns`);
      return response.data.data.headers;
    } catch (error) {
      console.error('Column headers fetch error:', error);
      return [];
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    fetchFiles,
    uploadFile,
    fetchFileDetails,
    fetchAnalytics,
    fetchOverview,
    updateFile,
    deleteFile,
    generateCustomChart,
    deleteFileWithAnalytics,
    fetchColumnHeaders,
    clearError
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};


