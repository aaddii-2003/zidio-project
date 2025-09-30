const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate basic statistics
const calculateStatistics = (data) => {
  const stats = {
    count: data.length,
    numericColumns: {},
    textColumns: {},
    dateColumns: {}
  };

  if (data.length === 0) return stats;

  const headers = data[0] || [];
  
  // Analyze each column
  headers.forEach((header, index) => {
    const columnData = data.slice(1).map(row => row[index]).filter(val => val !== undefined && val !== '');
    
    if (columnData.length === 0) return;

    // Check if column contains numeric data
    const numericData = columnData.filter(val => !isNaN(parseFloat(val)) && isFinite(val));
    
    if (numericData.length > 0) {
      const numbers = numericData.map(Number);
      const sorted = numbers.sort((a, b) => a - b);
      
      stats.numericColumns[header] = {
        count: numbers.length,
        sum: numbers.reduce((a, b) => a + b, 0),
        mean: numbers.reduce((a, b) => a + b, 0) / numbers.length,
        median: sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        range: Math.max(...numbers) - Math.min(...numbers),
        standardDeviation: Math.sqrt(
          numbers.reduce((acc, val) => acc + Math.pow(val - (numbers.reduce((a, b) => a + b, 0) / numbers.length), 2), 0) / numbers.length
        )
      };
    } else {
      // Text data analysis
      const uniqueValues = [...new Set(columnData)];
      const valueCounts = {};
      columnData.forEach(val => {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });

      stats.textColumns[header] = {
        count: columnData.length,
        uniqueCount: uniqueValues.length,
        mostFrequent: Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b),
        valueCounts: valueCounts
      };
    }
  });

  return stats;
};

// Helper: convert possible Excel serial date numbers to ISO-like labels
const excelSerialToDateLabel = (value) => {
  const num = Number(value);
  // Excel serial date range heuristic (roughly years 1990-2090)
  if (!Number.isNaN(num) && num > 30000 && num < 80000) {
    // Excel epoch: 1899-12-30
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(num) * msPerDay);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
};

// Helper: robust numeric parsing (handles commas, currency symbols, percentages)
const parseNumericValue = (val) => {
  if (val === null || val === undefined) return NaN;
  const str = String(val).trim();
  if (str.length === 0) return NaN;
  // Detect percentage and strip the symbol (keep raw number for chart)
  const isPercent = /%\s*$/.test(str);
  const cleaned = str
    .replace(/[,\s]/g, '') // remove commas and spaces
    .replace(/^[^0-9+\-\.]+/, '') // strip leading non-numeric like currency
    .replace(/%$/, '');
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return NaN;
  return isPercent ? num /* optionally: num/100 */ : num;
};

// Helper function to generate chart data with custom column selection
const generateChartData = (data, chartType = 'bar', xColumnIndex = 0, yColumnIndex = 1) => {
  if (!data || data.length === 0) {
    console.log('No data provided to generateChartData');
    return null;
  }

  const headers = data[0] || [];
  if (headers.length < 2) {
    console.log('Insufficient columns for chart generation');
    return null;
  }

  // Validate column indices
  if (xColumnIndex < 0 || xColumnIndex >= headers.length || 
      yColumnIndex < 0 || yColumnIndex >= headers.length) {
    console.log('Invalid column indices');
    return null;
  }

  const chartData = {
    labels: [],
    datasets: []
  };

  try {
    // For bar/line charts, use selected columns
    if (chartType === 'bar' || chartType === 'line') {
      const xColumn = headers[xColumnIndex];
      const yColumn = headers[yColumnIndex];
      
      // Process data rows and ensure matching pairs
      const validRows = data.slice(1).filter(row => {
        if (!row) return false;
        const xVal = row[xColumnIndex];
        const yRaw = row[yColumnIndex];
        if (xVal === undefined || xVal === '') return false;
        if (yRaw === undefined || yRaw === '') return false;
        const yNum = parseNumericValue(yRaw);
        return Number.isFinite(yNum);
      });
      
      if (validRows.length > 0) {
        const xData = validRows.map(row => excelSerialToDateLabel(row[xColumnIndex])).slice(0, 50);
        const yData = validRows.map(row => parseNumericValue(row[yColumnIndex])).slice(0, 50);
        
        chartData.labels = xData;
        chartData.datasets = [{
          label: yColumn,
          data: yData,
          backgroundColor: chartType === 'bar' ? 'rgba(54, 162, 235, 0.2)' : 'rgba(54, 162, 235, 0.1)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }];
        
        console.log(`Generated ${chartType} chart with ${xData.length} data points using columns: ${xColumn} (X) and ${yColumn} (Y)`);
      } else {
        console.log('No valid data rows found for bar/line chart');
      }
    } else if (chartType === 'pie') {
      // For pie charts, use selected columns for labels and values
      const labelColumn = headers[xColumnIndex];
      const valueColumn = headers[yColumnIndex];
      
      // Process data rows and ensure matching pairs
      const validRows = data.slice(1).filter(row => 
        row && 
        row[xColumnIndex] !== undefined && 
        row[xColumnIndex] !== '' && 
        row[yColumnIndex] !== undefined && 
        row[yColumnIndex] !== '' &&
        !isNaN(parseFloat(row[yColumnIndex])) && 
        isFinite(parseFloat(row[yColumnIndex]))
      );
      
      if (validRows.length > 0) {
        const labels = validRows.map(row => String(row[xColumnIndex])).slice(0, 10);
        const values = validRows.map(row => parseFloat(row[yColumnIndex])).slice(0, 10);
        
        chartData.labels = labels;
        chartData.datasets = [{
          data: values,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
          ]
        }];
        
        console.log(`Generated pie chart with ${labels.length} data points using columns: ${labelColumn} (labels) and ${valueColumn} (values)`);
      } else {
        console.log('No valid data rows found for pie chart');
      }
    }
  } catch (error) {
    console.error('Error generating chart data:', error);
    return null;
  }

  return chartData;
};

// @route   GET /api/analytics/file/:id
// @desc    Get analytics for a specific file
// @access  Private
router.get('/file/:id', protect, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user._id },
        { isPublic: true }
      ]
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'File is still being processed'
      });
    }

    // If analytics already processed, return cached data
    if (file.analytics.isProcessed && file.analytics.statistics) {
      return res.json({
        status: 'success',
        data: {
          file: {
            id: file._id,
            originalName: file.originalName,
            metadata: file.metadata
          },
          analytics: file.analytics
        }
      });
    }

    // Process file for analytics
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on disk'
      });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Filter out empty rows
    const data = jsonData.filter(row => row.some(cell => cell !== undefined && cell !== ''));

    // Calculate statistics
    const statistics = calculateStatistics(data);
    
    // Generate chart data with default column selection
    const chartData = {
      bar: generateChartData(data, 'bar', 0, 1),
      line: generateChartData(data, 'line', 0, 1),
      pie: generateChartData(data, 'pie', 0, 1)
    };

    // Ensure all chart data has proper labels
    Object.keys(chartData).forEach(chartType => {
      if (chartData[chartType] && chartData[chartType].datasets) {
        chartData[chartType].datasets.forEach(dataset => {
          if (!dataset.label || dataset.label === 'undefined') {
            dataset.label = data[0]?.[1] || 'Values';
          }
        });
      }
    });

    // Generate insights
    const insights = [];
    
    // Add insights based on data analysis
    if (statistics.numericColumns && Object.keys(statistics.numericColumns).length > 0) {
      insights.push(`Found ${Object.keys(statistics.numericColumns).length} numeric columns for analysis`);
    }
    
    if (statistics.textColumns && Object.keys(statistics.textColumns).length > 0) {
      insights.push(`Found ${Object.keys(statistics.textColumns).length} text columns for categorization`);
    }
    
    if (data.length > 1000) {
      insights.push('Large dataset detected - consider data sampling for better performance');
    }

    // Update file with analytics
    await File.findByIdAndUpdate(file._id, {
      'analytics.isProcessed': true,
      'analytics.processedAt': new Date(),
      'analytics.chartData': chartData,
      'analytics.statistics': statistics,
      'analytics.insights': insights
    });

    res.json({
      status: 'success',
      data: {
        file: {
          id: file._id,
          originalName: file.originalName,
          metadata: file.metadata
        },
        analytics: {
          isProcessed: true,
          processedAt: new Date(),
          chartData,
          statistics,
          insights
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while processing analytics'
    });
  }
});

// @route   GET /api/analytics/overview
// @desc    Get analytics overview for user's files
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user._id });
    
    const overview = {
      totalFiles: files.length,
      processedFiles: files.filter(f => f.status === 'completed').length,
      failedFiles: files.filter(f => f.status === 'failed').length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      averageFileSize: files.length > 0 ? files.reduce((sum, file) => sum + file.size, 0) / files.length : 0,
      fileTypes: {},
      recentUploads: files
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(file => ({
          id: file._id,
          name: file.originalName,
          size: file.size,
          status: file.status,
          uploadedAt: file.createdAt
        }))
    };

    // Count file types
    files.forEach(file => {
      const ext = path.extname(file.originalName).toLowerCase();
      overview.fileTypes[ext] = (overview.fileTypes[ext] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: {
        overview
      }
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching overview'
    });
  }
});

// @route   GET /api/analytics/public
// @desc    Get public files for discovery
// @access  Public
router.get('/public', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query for public files
    const query = { isPublic: true, status: 'completed' };
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const files = await File.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('uploadedBy', 'name')
      .select('-path -analytics.chartData'); // Exclude sensitive data

    const total = await File.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        files,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalFiles: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Public files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching public files'
    });
  }
});

// @route   POST /api/analytics/file/:id/chart
// @desc    Generate chart with custom column selection
// @access  Private
router.post('/file/:id/chart', protect, async (req, res) => {
  try {
    const { chartType, xColumnIndex, yColumnIndex } = req.body;
    
    if (!chartType || xColumnIndex === undefined || yColumnIndex === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: chartType, xColumnIndex, yColumnIndex'
      });
    }

    const file = await File.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user._id },
        { isPublic: true }
      ]
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'File is still being processed'
      });
    }

    // Process file for chart data
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on disk'
      });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Filter out empty rows
    const data = jsonData.filter(row => row.some(cell => cell !== undefined && cell !== ''));

    // Generate chart data with custom column selection
    const chartData = generateChartData(data, chartType, parseInt(xColumnIndex), parseInt(yColumnIndex));

    if (!chartData) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to generate chart with selected columns'
      });
    }

    res.json({
      status: 'success',
      data: {
        chartData,
        chartType,
        xColumnIndex: parseInt(xColumnIndex),
        yColumnIndex: parseInt(yColumnIndex),
        headers: data[0] || [],
        xColumnName: data[0]?.[xColumnIndex] || 'X-Axis',
        yColumnName: data[0]?.[yColumnIndex] || 'Y-Axis'
      }
    });
  } catch (error) {
    console.error('Custom chart generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while generating custom chart'
    });
  }
});

// @route   DELETE /api/analytics/file/:id
// @desc    Delete a file and its analytics
// @access  Private
router.delete('/file/:id', protect, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found or you do not have permission to delete it'
      });
    }

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Deleted file from disk: ${file.path}`);
      } catch (diskError) {
        console.error('Error deleting file from disk:', diskError);
        // Continue with database deletion even if disk deletion fails
      }
    }

    // Delete file from database
    await File.findByIdAndDelete(file._id);

    res.json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting file'
    });
  }
});

// @route   GET /api/analytics/file/:id/columns
// @desc    Get column headers from a file
// @access  Private
router.get('/file/:id/columns', protect, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user._id },
        { isPublic: true }
      ]
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'File is still being processed'
      });
    }

    // Process file to get column headers
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on disk'
      });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Get headers from first row
    const headers = jsonData[0] || [];

    res.json({
      status: 'success',
      data: {
        headers: headers,
        totalColumns: headers.length
      }
    });
  } catch (error) {
    console.error('Column headers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching column headers'
    });
  }
});

module.exports = router;

