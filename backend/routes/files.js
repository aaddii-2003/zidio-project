const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { body, validationResult } = require('express-validator');
const File = require('../models/File');
const { protect, authorize } = require('../middleware/auth');

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

// Helper function to generate chart data
const generateChartData = (data, chartType = 'bar') => {
  if (!data || data.length === 0) return null;

  const headers = data[0] || [];
  const chartData = {
    labels: [],
    datasets: []
  };

  // For bar/line charts, use first two columns
  if (chartType === 'bar' || chartType === 'line') {
    if (headers.length >= 2) {
      const xColumn = headers[0];
      const yColumn = headers[1];
      
      const xData = data.slice(1).map(row => row[0]).filter(val => val !== undefined && val !== '');
      const yData = data.slice(1).map(row => row[1]).filter(val => !isNaN(parseFloat(val)) && isFinite(val));
      
      if (xData.length > 0 && yData.length > 0) {
        chartData.labels = xData.slice(0, 20); // Limit to 20 items for performance
        chartData.datasets = [{
          label: yColumn,
          data: yData.slice(0, 20),
          backgroundColor: chartType === 'bar' ? 'rgba(54, 162, 235, 0.2)' : 'rgba(54, 162, 235, 0.1)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }];
      }
    }
  } else if (chartType === 'pie') {
    // For pie charts, use first column for labels and second for values
    if (headers.length >= 2) {
      const labelColumn = headers[0];
      const valueColumn = headers[1];
      
      const labels = data.slice(1).map(row => row[0]).filter(val => val !== undefined && val !== '');
      const values = data.slice(1).map(row => row[1]).filter(val => !isNaN(parseFloat(val)) && isFinite(val));
      
      if (labels.length > 0 && values.length > 0) {
        chartData.labels = labels.slice(0, 10); // Limit to 10 items for pie chart
        chartData.datasets = [{
          data: values.slice(0, 10),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
          ]
        }];
      }
    }
  }

  return chartData;
};

// Helper function to generate AI analysis
const generateAIAnalysis = async (fileId, allData) => {
  try {
    // Use the first sheet's data for AI analysis
    const firstSheetData = allData[0]?.data || [];
    
    if (firstSheetData.length === 0) {
      console.log('No data available for AI analysis');
      return;
    }

    const headers = firstSheetData[0] || [];
    const dataRows = firstSheetData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
    
    // Analyze each column
    const columnAnalysis = {};
    headers.forEach((header, index) => {
      const columnData = dataRows.map(row => row[index]);
      const dataType = detectDataType(columnData);
      const stats = calculateAdvancedStats(columnData, dataType);
      
      columnAnalysis[header] = {
        type: dataType,
        ...stats,
        description: generateColumnDescription(header, dataType, stats)
      };
    });

    // Generate AI summary
    const summary = generateAISummary(fileId, dataRows, columnAnalysis);
    
    // Generate insights
    const insights = generateAIInsights(dataRows, columnAnalysis);
    
    // Generate recommendations
    const recommendations = generateRecommendations(dataRows, columnAnalysis);

    // Store AI analysis in file record
    await File.findByIdAndUpdate(fileId, {
      'aiAnalysis': {
        summary,
        insights,
        columnAnalysis,
        recommendations,
        analyzedAt: new Date()
      }
    });

    console.log(`AI Analysis generated for file ${fileId}:`, {
      summary: summary.length,
      insights: insights.length,
      recommendations: recommendations.length
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    throw error;
  }
};

// Helper function to detect data types
const detectDataType = (values) => {
  const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
  
  if (nonNullValues.length === 0) return 'empty';
  
  // Check if all values are numbers
  const numericValues = nonNullValues.filter(val => !isNaN(parseFloat(val)) && isFinite(val));
  if (numericValues.length / nonNullValues.length > 0.8) return 'numeric';
  
  // Check if all values are dates
  const dateValues = nonNullValues.filter(val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.toString().match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/);
  });
  if (dateValues.length / nonNullValues.length > 0.8) return 'date';
  
  // Check if all values are booleans
  const booleanValues = nonNullValues.filter(val => 
    val.toString().toLowerCase() === 'true' || 
    val.toString().toLowerCase() === 'false' ||
    val.toString().toLowerCase() === 'yes' ||
    val.toString().toLowerCase() === 'no' ||
    val === 1 || val === 0
  );
  if (booleanValues.length / nonNullValues.length > 0.8) return 'boolean';
  
  return 'text';
};

// Helper function to calculate advanced statistics
const calculateAdvancedStats = (values, dataType) => {
  const stats = {
    count: values.length,
    nullCount: values.filter(val => val === null || val === undefined || val === '').length,
    uniqueCount: new Set(values.filter(val => val !== null && val !== undefined && val !== '')).size
  };

  if (dataType === 'numeric') {
    const numericValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).map(Number);
    if (numericValues.length > 0) {
      const sorted = numericValues.sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
      
      stats.mean = mean;
      stats.median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      stats.mode = getMode(numericValues);
      stats.min = Math.min(...numericValues);
      stats.max = Math.max(...numericValues);
      stats.range = stats.max - stats.min;
      stats.standardDeviation = Math.sqrt(variance);
      stats.variance = variance;
      stats.quartiles = {
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q2: stats.median,
        q3: sorted[Math.floor(sorted.length * 0.75)]
      };
      stats.outliers = detectOutliers(numericValues, mean, Math.sqrt(variance));
    }
  } else if (dataType === 'text') {
    const textValues = values.filter(val => val !== null && val !== undefined && val !== '');
    const valueCounts = {};
    textValues.forEach(val => {
      valueCounts[val] = (valueCounts[val] || 0) + 1;
    });
    
    stats.mostFrequent = Object.keys(valueCounts).reduce((a, b) => 
      valueCounts[a] > valueCounts[b] ? a : b, Object.keys(valueCounts)[0]
    );
    stats.valueCounts = valueCounts;
    stats.averageLength = textValues.reduce((sum, val) => sum + val.toString().length, 0) / textValues.length;
  }

  return stats;
};

// Helper function to get mode
const getMode = (values) => {
  const frequency = {};
  let maxFreq = 0;
  let mode = null;
  
  values.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) {
      maxFreq = frequency[val];
      mode = val;
    }
  });
  
  return maxFreq > 1 ? mode : null;
};

// Helper function to detect outliers using IQR method
const detectOutliers = (values, mean, stdDev) => {
  const sorted = values.sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(val => val < lowerBound || val > upperBound);
};

// Helper function to generate column description
const generateColumnDescription = (columnName, dataType, stats) => {
  let description = `This column contains ${dataType} data`;
  
  if (dataType === 'numeric') {
    if (stats.outliers && stats.outliers.length > 0) {
      description += ` with ${stats.outliers.length} outliers`;
    }
    if (stats.standardDeviation && stats.mean) {
      const cv = (stats.standardDeviation / Math.abs(stats.mean)) * 100;
      if (cv > 50) {
        description += ' and high variability';
      } else if (cv < 10) {
        description += ' with low variability';
      }
    }
  } else if (dataType === 'text') {
    if (stats.uniqueCount < 10) {
      description += ' and appears to be categorical';
    } else if (stats.averageLength > 50) {
      description += ' with long text values';
    }
  }
  
  if (stats.nullCount > 0) {
    const nullPercentage = (stats.nullCount / stats.count) * 100;
    description += ` (${nullPercentage.toFixed(1)}% missing values)`;
  }
  
  return description + '.';
};

// Helper function to generate AI summary
const generateAISummary = (fileId, data, columnAnalysis) => {
  const totalRows = data.length;
  const totalColumns = Object.keys(columnAnalysis).length;
  const numericColumns = Object.values(columnAnalysis).filter(col => col.type === 'numeric').length;
  const textColumns = Object.values(columnAnalysis).filter(col => col.type === 'text').length;
  const dateColumns = Object.values(columnAnalysis).filter(col => col.type === 'date').length;
  
  let summary = `This dataset contains ${totalRows.toLocaleString()} rows and ${totalColumns} columns. `;
  
  if (numericColumns > 0) {
    summary += `There are ${numericColumns} numeric columns suitable for statistical analysis. `;
  }
  
  if (textColumns > 0) {
    summary += `The dataset includes ${textColumns} text columns that may contain categorical or descriptive data. `;
  }
  
  if (dateColumns > 0) {
    summary += `Found ${dateColumns} date columns for temporal analysis. `;
  }
  
  const columnsWithNulls = Object.values(columnAnalysis).filter(col => col.nullCount > 0).length;
  if (columnsWithNulls > 0) {
    summary += `Data quality analysis shows ${columnsWithNulls} columns contain missing values. `;
  }
  
  if (totalRows > 1000) {
    summary += `This is a substantial dataset that would benefit from advanced analytics and visualization techniques.`;
  } else {
    summary += `This is a manageable dataset size for comprehensive analysis.`;
  }
  
  return summary;
};

// Helper function to generate AI insights
const generateAIInsights = (data, columnAnalysis) => {
  const insights = [];
  const numericColumns = Object.entries(columnAnalysis).filter(([_, analysis]) => analysis.type === 'numeric');
  const textColumns = Object.entries(columnAnalysis).filter(([_, analysis]) => analysis.type === 'text');
  
  // Data quality insights
  const totalRows = data.length;
  const columnsWithNulls = Object.values(columnAnalysis).filter(analysis => analysis.nullCount > 0).length;
  
  if (columnsWithNulls > 0) {
    insights.push({
      title: 'Data Quality',
      description: `${columnsWithNulls} columns contain missing values. Consider data cleaning strategies.`,
      value: `${Math.round((columnsWithNulls / Object.keys(columnAnalysis).length) * 100)}% of columns`
    });
  }
  
  // Dataset size insights
  if (totalRows > 10000) {
    insights.push({
      title: 'Large Dataset',
      description: 'This is a large dataset. Consider sampling for exploratory analysis.',
      value: `${totalRows.toLocaleString()} rows`
    });
  } else if (totalRows < 100) {
    insights.push({
      title: 'Small Dataset',
      description: 'This is a small dataset. Results may not be statistically significant.',
      value: `${totalRows} rows`
    });
  }
  
  // Numeric column insights
  numericColumns.forEach(([columnName, analysis]) => {
    if (analysis.outliers && analysis.outliers.length > 0) {
      insights.push({
        title: `Outliers in ${columnName}`,
        description: `Found ${analysis.outliers.length} outliers that may need investigation.`,
        value: `${analysis.outliers.length} outliers`
      });
    }
    
    if (analysis.standardDeviation && analysis.mean) {
      const coefficientOfVariation = (analysis.standardDeviation / Math.abs(analysis.mean)) * 100;
      if (coefficientOfVariation > 50) {
        insights.push({
          title: `High Variability in ${columnName}`,
          description: 'This column shows high variability which might indicate diverse data patterns.',
          value: `${coefficientOfVariation.toFixed(1)}% CV`
        });
      }
    }
  });
  
  // Text column insights
  textColumns.forEach(([columnName, analysis]) => {
    if (analysis.uniqueCount < 10) {
      insights.push({
        title: `Categorical Data in ${columnName}`,
        description: 'This column appears to be categorical with limited unique values.',
        value: `${analysis.uniqueCount} categories`
      });
    }
  });
  
  return insights;
};

// Helper function to generate recommendations
const generateRecommendations = (data, columnAnalysis) => {
  const recommendations = [];
  const numericColumns = Object.entries(columnAnalysis).filter(([_, analysis]) => analysis.type === 'numeric');
  const textColumns = Object.entries(columnAnalysis).filter(([_, analysis]) => analysis.type === 'text');
  
  // Data cleaning recommendations
  const columnsWithNulls = Object.entries(columnAnalysis).filter(([_, analysis]) => analysis.nullCount > 0);
  if (columnsWithNulls.length > 0) {
    recommendations.push('Consider imputing missing values or removing rows with nulls for better analysis');
  }
  
  // Visualization recommendations
  if (numericColumns.length >= 2) {
    recommendations.push('Create scatter plots to explore relationships between numeric variables');
  }
  
  if (textColumns.length > 0 && numericColumns.length > 0) {
    recommendations.push('Use bar charts or box plots to compare numeric values across text categories');
  }
  
  if (numericColumns.length > 0) {
    recommendations.push('Create histograms to understand the distribution of numeric variables');
  }
  
  // Statistical analysis recommendations
  if (numericColumns.length >= 2) {
    recommendations.push('Consider correlation analysis to identify relationships between numeric variables');
  }
  
  if (textColumns.length > 0) {
    recommendations.push('Perform frequency analysis on categorical variables to identify patterns');
  }
  
  return recommendations;
};

// Helper function to generate analytics
const generateAnalytics = async (fileId, allData) => {
  try {
    // Use the first sheet's data for analytics
    const firstSheetData = allData[0]?.data || [];
    
    if (firstSheetData.length === 0) {
      console.log('No data available for analytics generation');
      return;
    }

    // Calculate statistics
    const statistics = calculateStatistics(firstSheetData);
    
    // Generate chart data
    const chartData = {
      bar: generateChartData(firstSheetData, 'bar'),
      line: generateChartData(firstSheetData, 'line'),
      pie: generateChartData(firstSheetData, 'pie')
    };

    // Generate insights
    const insights = [];
    
    // Add insights based on data analysis
    if (statistics.numericColumns && Object.keys(statistics.numericColumns).length > 0) {
      insights.push(`Found ${Object.keys(statistics.numericColumns).length} numeric columns for analysis`);
    }
    
    if (statistics.textColumns && Object.keys(statistics.textColumns).length > 0) {
      insights.push(`Found ${Object.keys(statistics.textColumns).length} text columns for categorization`);
    }
    
    if (firstSheetData.length > 1000) {
      insights.push('Large dataset detected - consider data sampling for better performance');
    }

    // Update file with analytics
    await File.findByIdAndUpdate(fileId, {
      'analytics.isProcessed': true,
      'analytics.processedAt': new Date(),
      'analytics.chartData': chartData,
      'analytics.statistics': statistics,
      'analytics.insights': insights
    });

    console.log(`Analytics generated for file ${fileId}:`, {
      statistics: Object.keys(statistics.numericColumns).length + Object.keys(statistics.textColumns).length,
      insights: insights.length,
      chartData: Object.keys(chartData).length
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
};

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept Excel files
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Helper function to process Excel file
const processExcelFile = async (filePath, fileId) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const metadata = {
      sheets: [],
      totalRows: 0,
      totalColumns: 0,
      fileType: path.extname(filePath).toLowerCase()
    };

    let allData = [];

    // Process each sheet
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get headers (first row)
      const headers = jsonData[0] || [];
      
      // Filter out empty rows
      const dataRows = jsonData.filter(row => row.some(cell => cell !== undefined && cell !== ''));
      
      const sheetInfo = {
        name: sheetName,
        rowCount: dataRows.length,
        columnCount: headers.length,
        headers: headers
      };

      metadata.sheets.push(sheetInfo);
      metadata.totalRows += dataRows.length;
      metadata.totalColumns = Math.max(metadata.totalColumns, headers.length);

      // Store data for analytics
      allData.push({
        sheetName,
        data: dataRows,
        headers
      });
    });

    // Update file with metadata
    await File.findByIdAndUpdate(fileId, {
      metadata,
      status: 'completed',
      'analytics.isProcessed': true,
      'analytics.processedAt': new Date()
    });

    return { metadata, allData };
  } catch (error) {
    console.error('Excel processing error:', error);
    await File.findByIdAndUpdate(fileId, {
      status: 'failed',
      processingError: error.message
    });
    throw error;
  }
};

// @route   POST /api/files/upload
// @desc    Upload Excel file
// @access  Private
router.post('/upload', protect, upload.single('file'), [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage('Tags must be an array or valid JSON string'),
  body('isPublic')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value === 'true' || value === 'false';
      }
      return typeof value === 'boolean';
    })
    .withMessage('isPublic must be a boolean or string "true"/"false"')
], async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      body: req.body,
      user: req.user ? req.user._id : 'No user'
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const { description, tags, isPublic } = req.body;

    // Parse tags if it's a string
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Create file record in database
    const fileRecord = await File.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user._id,
      description: description || '',
      tags: parsedTags,
      isPublic: isPublic === 'true' || isPublic === true
    });

    // Process file asynchronously
    processExcelFile(req.file.path, fileRecord._id)
      .then(async ({ metadata, allData }) => {
        console.log(`✅ File processed successfully: ${fileRecord.originalName}`);
        
        // Generate analytics automatically
        try {
          await generateAnalytics(fileRecord._id, allData);
          console.log(`✅ Analytics generated for: ${fileRecord.originalName}`);
        } catch (analyticsError) {
          console.error(`❌ Analytics generation failed: ${fileRecord.originalName}`, analyticsError);
        }

        // Trigger AI analysis automatically
        try {
          const aiAnalysis = await generateAIAnalysis(fileRecord._id, allData);
          console.log(`✅ AI Analysis completed for: ${fileRecord.originalName}`);
        } catch (aiError) {
          console.error(`❌ AI Analysis failed: ${fileRecord.originalName}`, aiError);
        }
      })
      .catch(error => {
        console.error(`❌ File processing failed: ${fileRecord.originalName}`, error);
      });

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        file: {
          id: fileRecord._id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          size: fileRecord.size,
          status: fileRecord.status,
          uploadedAt: fileRecord.createdAt
        }
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error during file upload'
    });
  }
});

// @route   GET /api/files
// @desc    Get user's files
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { uploadedBy: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
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
      .populate('uploadedBy', 'name email')
      .select('-path'); // Exclude file path for security

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
    console.error('Get files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching files'
    });
  }
});

// @route   GET /api/files/:id
// @desc    Get file details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ status: 'error', message: 'Invalid file id' });
    }
    const file = await File.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user._id },
        { isPublic: true }
      ]
    }).populate('uploadedBy', 'name email');

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        file
      }
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching file'
    });
  }
});

// @route   DELETE /api/files/:id
// @desc    Delete file
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ status: 'error', message: 'Invalid file id' });
    }
    const file = await File.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found or access denied'
      });
    }

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete database record
    await File.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting file'
    });
  }
});

// @route   PUT /api/files/:id
// @desc    Update file metadata
// @access  Private
router.put('/:id', protect, [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ status: 'error', message: 'Invalid file id' });
    }
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const file = await File.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found or access denied'
      });
    }

    const { description, tags, isPublic } = req.body;
    const updateData = {};

    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedFile = await File.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name email');

    res.json({
      status: 'success',
      message: 'File updated successfully',
      data: {
        file: updatedFile
      }
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating file'
    });
  }
});

// ================== ADMIN ENDPOINTS ==================

// @route   GET /api/files/admin
// @desc    Get all files (admin only)
// @access  Private/Admin
// Note: using two-segment paths to avoid conflict with '/:id'
router.get('/admin/list', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, uploader, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (uploader) query.uploadedBy = uploader;
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const files = await File.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('uploadedBy', 'name email role');

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
    console.error('Admin get files error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching files' });
  }
});

// @route   DELETE /api/files/admin/:id
// @desc    Delete any file (admin only)
// @access  Private/Admin
router.delete('/admin/manage/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }

    if (fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { console.error('Admin delete disk file error:', e); }
    }

    await File.findByIdAndDelete(req.params.id);

    res.json({ status: 'success', message: 'File deleted successfully' });
  } catch (error) {
    console.error('Admin delete file error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while deleting file' });
  }
});

// @route   PUT /api/files/admin/:id
// @desc    Update file metadata (admin only)
// @access  Private/Admin
router.put('/admin/manage/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { description, tags, isPublic, status } = req.body;
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (status !== undefined) updateData.status = status;

    const updated = await File.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('uploadedBy', 'name email role');

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }

    res.json({ status: 'success', message: 'File updated successfully', data: { file: updated } });
  } catch (error) {
    console.error('Admin update file error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while updating file' });
  }
});

// @route   POST /api/files/:id/generate-analytics
// @desc    Manually generate analytics for a file
// @access  Private
router.post('/:id/generate-analytics', protect, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
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
        message: 'File must be completed before generating analytics'
      });
    }

    // Re-read the file and generate analytics
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on disk'
      });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetNames = workbook.SheetNames;
    let allData = [];

    // Process each sheet
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get headers (first row)
      const headers = jsonData[0] || [];
      
      // Filter out empty rows
      const dataRows = jsonData.filter(row => row.some(cell => cell !== undefined && cell !== ''));
      
      // Store data for analytics
      allData.push({
        sheetName,
        data: dataRows,
        headers
      });
    });

    // Generate analytics
    await generateAnalytics(file._id, allData);

    res.json({
      status: 'success',
      message: 'Analytics generated successfully'
    });
  } catch (error) {
    console.error('Analytics generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during analytics generation'
    });
  }
});

module.exports = router;
