import React, { useState, useEffect } from 'react'
import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { SystemProvider } from './contexts/SystemContext'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom'

import Navigation from './components/Navigation'
import ControlExplorer from './components/ControlExplorer'
import Landing from './components/Landing'
import ErrorBoundary from './components/ErrorBoundary'
import ControlDetails from './components/ControlDetails';
import ControlBrowser from './components/ControlBrowser';
import { ENHANCED_CONTROLS, allControls, baseControls } from './data/controls';

function AppContent() {
  const [currentView, setCurrentView] = useState('landing')
  const [selectedControl, setSelectedControl] = useState(null)
  const [controls, setControls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  const loadControls = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Fetching controls from API (paginated)...')

      // Fetch all controls using pagination (200 per page is max)
      let allControlsData = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`/api/controls/paginated?page=${page}&page_size=200`)
        console.log(`📡 API Response page ${page} status:`, res.status)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        if (data.controls && Array.isArray(data.controls)) {
          allControlsData = [...allControlsData, ...data.controls]
          console.log(`📦 Loaded page ${page}: ${data.controls.length} controls (total: ${allControlsData.length})`)

          // Check if there are more pages
          hasMore = data.pagination.has_next
          page++
        } else {
          hasMore = false
        }
      }

      if (allControlsData.length > 0) {
        console.log(`✅ Setting ${allControlsData.length} controls from API`)
        setControls(allControlsData)
      } else {
        // Fallback to local dataset (use allControls to include enhancements)
        console.log('⚠️ Falling back to local dataset - API returned no data')
        setControls(allControls)
      }
    } catch (e) {
      // Fallback to local dataset on error (use allControls to include enhancements)
      console.error('❌ API fetch failed:', e.message)
      setControls(allControls)
      setError('Using local embedded controls (API unavailable).')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadControls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNavigate = (viewId) => {
    if (viewId === 'landing') {
      navigate('/');
    } else if (viewId === 'control-explorer') {
      navigate('/control-explorer');
      } else {
      setCurrentView(viewId);
    }
  }

  const handleControlSelect = (control) => {
    setSelectedControl(control)
    setCurrentView('control-explorer')
  }

  // Handler for Details button
  const handleDetails = (control) => {
    navigate(`/controls/${control.control_id}`);
  };

  // Handler for back from details
  const handleBack = () => {
    navigate('/control-explorer');
  };

  // Toggle favorite handler
  const toggleFavorite = (controlId) => {
    setFavorites(prev =>
      prev.includes(controlId)
        ? prev.filter(id => id !== controlId)
        : [...prev, controlId]
    );
  };

  // Find control by ID for details page
  const ControlDetailsWrapper = () => {
    const { controlId } = useParams();
    const control = controls.find(c => c.control_id === controlId);
    const isFavorite = favorites && favorites.includes(controlId);
    return (
      <ControlDetails
        control={control}
        allControls={controls}
        onBack={handleBack}
        isFavorite={isFavorite}
        onToggleFavorite={() => toggleFavorite(controlId)}
      />
    );
  };

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-2">⚠️ Error Loading Controls</div>
            <div className="text-gray-600 dark:text-gray-400">{error}</div>
            <button 
              onClick={loadControls}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    switch (currentView) {
      case 'landing':
        return (
          <Landing 
            onNavigate={handleNavigate}
            onControlSelect={handleControlSelect}
            controls={controls}
          />
        )
      case 'control-explorer':
        return (
          <ControlExplorer
            controls={controls}
            onControlSelect={handleControlSelect}
            handleDetails={handleDetails}
          />
        )
      default:
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Feature Not Available</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The requested feature "{currentView}" is not available in this MVP.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navigation
        currentView={currentView}
        onNavigate={handleNavigate}
      />
      <main className="relative">
        <Routes>
          <Route path="/" element={<Landing onNavigate={handleNavigate} onControlSelect={handleControlSelect} controls={controls} />} />
          <Route path="/control-explorer" element={<ControlExplorer controls={controls} onControlSelect={handleControlSelect} handleDetails={handleDetails} />} />
          <Route path="/controls" element={<ControlBrowser onControlSelect={handleControlSelect} />} />
          <Route path="/controls/:controlId" element={<ControlDetailsWrapper />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SystemProvider>
          <Router>
            <AppContent />
          </Router>
        </SystemProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
