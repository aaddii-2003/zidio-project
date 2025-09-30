const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const { protect } = require('../middleware/auth');

const router = express.Router();

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

// @route   POST /api/ai/analyze/:id
// @desc    Analyze file with AI
// @access  Private
router.post('/analyze/:id', protect, async (req, res) => {
  try {
    console.log(`AI Analysis request for file: ${req.params.id} by user: ${req.user._id}`);
    
    const file = await File.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user._id },
        { isPublic: true }
      ]
    });

    if (!file) {
      console.log(`File not found: ${req.params.id}`);
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    console.log(`File found: ${file.originalName}, status: ${file.status}`);

    if (file.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'File must be completed before analysis'
      });
    }

    if (!fs.existsSync(file.path)) {
      console.log(`File not found on disk: ${file.path}`);
      return res.status(404).json({
        status: 'error',
        message: 'File not found on disk'
      });
    }

    console.log(`Reading file from: ${file.path}`);
    // Read and process the file
    const workbook = XLSX.readFile(file.path);
    const sheetNames = workbook.SheetNames;
    console.log(`Found sheets: ${sheetNames.join(', ')}`);
    
    const firstSheet = workbook.Sheets[sheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    console.log(`Data rows: ${jsonData.length}`);
    
    if (jsonData.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No data found in file'
      });
    }

    const headers = jsonData[0] || [];
    const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
    
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
    console.log('Generating AI summary...');
    const summary = generateAISummary(file, dataRows, columnAnalysis);
    
    // Generate insights
    console.log('Generating insights...');
    const insights = generateAIInsights(dataRows, columnAnalysis);
    
    // Generate recommendations
    console.log('Generating recommendations...');
    const recommendations = generateRecommendations(dataRows, columnAnalysis);

    console.log(`AI Analysis completed: ${insights.length} insights, ${recommendations.length} recommendations`);

    res.json({
      status: 'success',
      data: {
        summary,
        insights,
        columnAnalysis,
        recommendations,
        metadata: {
          fileName: file.originalName,
          totalRows: dataRows.length,
          totalColumns: headers.length,
          analyzedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during AI analysis'
    });
  }
});

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
const generateAISummary = (file, data, columnAnalysis) => {
  const totalRows = data.length;
  const totalColumns = Object.keys(columnAnalysis).length;
  const numericColumns = Object.values(columnAnalysis).filter(col => col.type === 'numeric').length;
  const textColumns = Object.values(columnAnalysis).filter(col => col.type === 'text').length;
  const dateColumns = Object.values(columnAnalysis).filter(col => col.type === 'date').length;
  
  let summary = `This ${file.originalName.split('.').pop().toUpperCase()} file contains ${totalRows.toLocaleString()} rows and ${totalColumns} columns. `;
  
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

module.exports = router;


