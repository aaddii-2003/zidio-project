const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  mimetype: {
    type: String,
    required: [true, 'MIME type is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading'
  },
  processingError: {
    type: String,
    default: ''
  },
  metadata: {
    sheets: [{
      name: String,
      rowCount: Number,
      columnCount: Number,
      headers: [String]
    }],
    totalRows: Number,
    totalColumns: Number,
    fileType: String
  },
  analytics: {
    isProcessed: {
      type: Boolean,
      default: false
    },
    processedAt: Date,
    chartData: mongoose.Schema.Types.Mixed,
    statistics: mongoose.Schema.Types.Mixed,
    insights: [String]
  },
  aiAnalysis: {
    summary: String,
    insights: [{
      title: String,
      description: String,
      value: String
    }],
    columnAnalysis: mongoose.Schema.Types.Mixed,
    recommendations: [String],
    analyzedAt: Date
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Index for better query performance
fileSchema.index({ uploadedBy: 1, createdAt: -1 });
fileSchema.index({ status: 1 });
fileSchema.index({ tags: 1 });

module.exports = mongoose.model('File', fileSchema);

