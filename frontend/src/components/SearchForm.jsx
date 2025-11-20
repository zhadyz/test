import { useState } from 'react'

function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="search-form">
      <h2>Search NIST 800-53 Controls</h2>
      <form onSubmit={handleSubmit} className="search-form-container">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter keywords (e.g. 'account', 'monitoring', 'access')"
            className="search-input"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="search-button"
          >
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>
      </form>
      
      <div className="search-suggestions">
        <p>💡 Try searching for:</p>
        <div className="suggestion-buttons">
          <button 
            onClick={() => setQuery('account')} 
            className="suggestion-btn"
            disabled={loading}
          >
            account
          </button>
          <button 
            onClick={() => setQuery('monitoring')} 
            className="suggestion-btn"
            disabled={loading}
          >
            monitoring
          </button>
          <button 
            onClick={() => setQuery('access')} 
            className="suggestion-btn"
            disabled={loading}
          >
            access
          </button>
          <button 
            onClick={() => setQuery('configuration')} 
            className="suggestion-btn"
            disabled={loading}
          >
            configuration
          </button>
        </div>
      </div>
    </div>
  )
}

export default SearchForm 