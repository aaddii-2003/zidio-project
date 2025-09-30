# Excel Analytics Platform

A comprehensive web application for uploading, processing, and visualizing Excel data with beautiful 3D charts and analytics. Built with React.js frontend and Node.js backend.

## 🚀 Features

- **Modern React.js Frontend** with Tailwind CSS
- **Express.js Backend** with MongoDB database
- **File Upload** with Multer middleware
- **Three.js Animations** for enhanced visual appeal
- **Chart Visualization** with Chart.js
- **Authentication System** with JWT
- **Admin Dashboard** with user management
- **Responsive Design** for all devices
- **3D Data Visualizations** using Three.js and React Three Fiber
- **Real-time Analytics** with comprehensive statistics
- **Public File Sharing** for community discovery

## 🛠️ Tech Stack

### Frontend
- React.js 18
- Tailwind CSS
- Chart.js & React-Chartjs-2
- Three.js & React-Three-Fiber
- React Router DOM
- Axios
- React Hot Toast
- React Dropzone

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- XLSX for Excel processing
- Bcryptjs for password hashing
- Express Rate Limit
- Helmet for security

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd excel-analytics-platform
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set up environment variables
```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your configuration
# Update MONGODB_URI, JWT_SECRET, and other settings
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in backend/.env
```

### 5. Start the application
```bash
# From the root directory
npm run dev

# Or start individually:
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm start
```

## 🎯 Usage

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Getting Started

1. **Register/Login**: Create an account or login to access the platform
2. **Upload Files**: Upload Excel files (.xlsx, .xls, .csv) up to 10MB
3. **View Analytics**: Access comprehensive analytics and 3D visualizations
4. **Share Publicly**: Make files public for community discovery
5. **Explore Data**: Browse public files and discover interesting datasets

### Features Overview

#### File Upload
- Drag and drop interface
- Support for Excel and CSV files
- File metadata and tagging
- Public/private sharing options

#### Analytics Dashboard
- Real-time data processing
- Interactive 2D charts (Bar, Line, Pie)
- 3D data visualizations
- Statistical analysis
- Data insights and recommendations

#### 3D Visualizations
- Interactive 3D bar charts
- Scatter plot visualizations
- Surface plot representations
- Orbit controls for navigation
- Real-time data rendering

#### User Management
- JWT-based authentication
- User profiles and preferences
- Theme switching (Light/Dark)
- Account settings

## 🔧 Configuration

### Backend Configuration
Update `backend/.env` with your settings:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/excel-analytics

# Server
PORT=5000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS
CLIENT_URL=http://localhost:3000
```

### Frontend Configuration
The frontend automatically connects to the backend API. Update the proxy settings in `frontend/src/setupProxy.js` if needed.

## 📁 Project Structure

```
excel-analytics-platform/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── File.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── files.js
│   │   ├── analytics.js
│   │   └── users.js
│   ├── uploads/
│   ├── package.json
│   ├── server.js
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   ├── ProtectedRoute.js
│   │   │   └── ThreeJSVisualization.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   ├── ThemeContext.js
│   │   │   └── AnalyticsContext.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── FileUpload.js
│   │   │   ├── FileDetails.js
│   │   │   ├── Analytics.js
│   │   │   ├── Profile.js
│   │   │   ├── PublicFiles.js
│   │   │   └── NotFound.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
├── package.json
└── README.md
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Update environment variables for production
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Ensure file upload directory is properly configured

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3
3. Update API endpoints for production

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=your-production-frontend-url
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@excelanalytics.com or create an issue in the repository.

## 🔮 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced ML-based insights
- [ ] Custom visualization templates
- [ ] API for third-party integrations
- [ ] Mobile app development
- [ ] Advanced data export options
- [ ] Team workspaces
- [ ] Data versioning and history

---

Built with ❤️ using React, Express.js, MongoDB, and Three.js