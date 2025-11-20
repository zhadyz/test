# 🛡️ NIST 800-53 Compliance Explorer - Frontend

A modern React frontend for searching and exploring NIST 800-53 security controls with plain English explanations.

## ✨ Features

- **🔍 Smart Search**: Search controls by keywords (account, monitoring, access, etc.)
- **📖 Detailed Views**: Full control information with implementation guidance
- **💡 Plain English**: Complex security controls explained simply
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **⚡ Fast**: Built with Vite for lightning-fast development and builds

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Backend API running at `http://127.0.0.1:8000`

### Installation & Setup

```bash
# 1. Navigate to frontend directory
cd /Users/bradf/nist-compliance-app/frontend

# 2. Install dependencies (already done)
npm install

# 3. Start development server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

### 🔧 Backend Setup

Make sure your NIST 800-53 API backend is running:

```bash
# In a separate terminal
cd /Users/bradf/nist-compliance-app/backend
uvicorn main:app --host 127.0.0.1 --port 8000
```

## 📖 How to Use

### 1. Search for Controls
- Enter keywords like "account", "monitoring", "access", or "configuration"
- Click search or press Enter
- Use the suggestion buttons for quick searches

### 2. Browse Results
- View search results in an organized list
- See control ID, name, and preview of explanation
- Click any control to view full details

### 3. Explore Control Details
- **Plain English Explanation**: Simplified overview
- **Intent & Purpose**: What the control aims to achieve
- **Official NIST Text**: Complete regulatory text
- **Example Implementation**: Practical implementation guidance
- **Common Misinterpretations**: What to avoid

### 4. Navigate
- Use "Back to Search" to return to results
- Search for new terms anytime

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── SearchForm.jsx      # Search input and suggestions
│   │   ├── ControlList.jsx     # Search results display
│   │   └── ControlDetails.jsx  # Full control information
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Styling and responsive design
│   └── main.jsx               # Application entry point
├── index.html                 # HTML template
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🎨 Styling

The application uses clean, modern CSS with:
- **Responsive Design**: Mobile-first approach
- **Clean Typography**: Easy-to-read fonts and spacing
- **Color-coded Sections**: Different backgrounds for each control section
- **Hover Effects**: Interactive feedback for buttons and cards
- **Professional Layout**: Business-appropriate design

## 📱 Responsive Breakpoints

- **Desktop**: > 768px (full layout)
- **Tablet**: 768px - 480px (stacked layout)
- **Mobile**: < 480px (single column)

## 🔌 API Integration

The frontend connects to your FastAPI backend with these endpoints:

- `GET /api/search?q={keyword}` - Search controls
- `GET /api/control/{control_id}` - Get full control details
- `GET /api/health` - Health check

## 🛠️ Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🌐 Deployment

To deploy this frontend:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Serve the `dist` folder** using any static hosting service:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - GitHub Pages

3. **Update API URL** in `src/App.jsx` if needed:
   ```javascript
   const API_BASE_URL = 'https://your-api-domain.com'
   ```

## 🔧 Configuration

### API Base URL
Update the API URL in `src/App.jsx`:
```javascript
const API_BASE_URL = 'http://127.0.0.1:8000'  // Change as needed
```

### Port Configuration
To change the development port, update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000  // Your preferred port
  }
})
```

## 🐛 Troubleshooting

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API connection errors
1. Verify backend is running at `http://127.0.0.1:8000`
2. Check API URL in `src/App.jsx`
3. Look for CORS errors in browser console

### Build errors
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## 🎯 Next Steps

Ready to expand? Here are some ideas:

- **🏷️ Filters**: Add filtering by control family (AC, AU, CM, etc.)
- **💾 Favorites**: Save frequently accessed controls
- **📊 Dashboard**: Overview of compliance status
- **🔔 Notifications**: Alerts for control updates
- **📋 Export**: Export control details to PDF
- **🔐 Authentication**: User accounts and permissions

## 📞 Support

If you encounter issues:

1. Check that the backend API is running
2. Verify the API URL in the frontend code
3. Look for errors in the browser console
4. Test API endpoints directly at `http://127.0.0.1:8000/docs`

## 🎉 Success!

If you can search for "account" and see AC-2 (Account Management) in the results, your frontend is working perfectly! 

Click on any control to explore the full details with implementation guidance and common pitfalls.
