import React, { useState, useEffect } from 'react'

const MOCK_RESOURCES = [
  'aws_s3',
  'aws_iam',
  'linux_server',
  'aws_ec2'
]

export default function InventoryMapper() {
  const [selectedResources, setSelectedResources] = useState([])
  const [customResource, setCustomResource] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [adaptLoading, setAdaptLoading] = useState({})
  const [adaptResults, setAdaptResults] = useState({})
  const [forceRefresh, setForceRefresh] = useState(false)
  const [cacheStats, setCacheStats] = useState(null)
  const [cacheLoading, setCacheLoading] = useState(false)

  // User-editable environment and tools
  const [envCloud, setEnvCloud] = useState('AWS')
  const [envCiCd, setEnvCiCd] = useState('GitLab')
  const [envOs, setEnvOs] = useState('Ubuntu')
  const [toolsInput, setToolsInput] = useState('terraform, linux')

  const environment = { cloud: envCloud, ci_cd: envCiCd, os: envOs }
  const tools = toolsInput.split(',').map(t => t.trim()).filter(Boolean)

  // Fetch cache stats on component mount
  useEffect(() => {
    fetchCacheStats()
  }, [])

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/controls/cache/stats')
      if (response.ok) {
        const stats = await response.json()
        setCacheStats(stats)
      }
    } catch (err) {
      console.error('Failed to fetch cache stats:', err)
    }
  }

  const clearCache = async () => {
    setCacheLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/controls/cache', {
        method: 'DELETE'
      })
      if (response.ok) {
        const result = await response.json()
        alert(`Cache cleared successfully! Removed ${result.cleared_entries} entries.`)
        await fetchCacheStats()
      } else {
        throw new Error('Failed to clear cache')
      }
    } catch (err) {
      alert('Failed to clear cache: ' + err.message)
    } finally {
      setCacheLoading(false)
    }
  }

  const handleResourceToggle = (resource) => {
    setSelectedResources(prev =>
      prev.includes(resource)
        ? prev.filter(r => r !== resource)
        : [...prev, resource]
    )
  }

  const handleAddCustomResource = () => {
    if (customResource.trim() && !selectedResources.includes(customResource.trim())) {
      setSelectedResources(prev => [...prev, customResource.trim()])
      setCustomResource('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('http://localhost:8000/api/inventory/map-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources: selectedResources })
      })
      if (!response.ok) throw new Error('Failed to fetch mapping')
      const data = await response.json()
      setResult(data.mappings)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdapt = async (controlId, resource) => {
    setAdaptLoading(prev => ({ ...prev, [controlId + resource]: true }))
    setError(null)
    try {
      const url = forceRefresh 
        ? 'http://localhost:8000/api/controls/adapt?force_refresh=true'
        : 'http://localhost:8000/api/controls/adapt'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          control_id: controlId,
          resource,
          tools,
          environment
        })
      })
      if (!response.ok) throw new Error('Failed to fetch adaptation')
      const data = await response.json()
      setAdaptResults(prev => ({ 
        ...prev, 
        [controlId + resource]: {
          explanation: data.explanation,
          cached: data.cached
        }
      }))
      // Refresh cache stats after AI call
      await fetchCacheStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdaptLoading(prev => ({ ...prev, [controlId + resource]: false }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 mt-8 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-dark-900 transition-colors duration-300">Live Environment-to-Control Mapping</h2>
      <p className="mb-4 text-gray-600 dark:text-dark-600 transition-colors duration-300">Select or enter your environment resources to see relevant NIST 800-53 controls and explanations.</p>
      
      {/* Cache Management Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-300 transition-colors duration-300">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-dark-900 transition-colors duration-300">GPT Response Cache</h3>
        {cacheStats && (
          <div className="text-sm text-gray-600 dark:text-dark-600 mb-3 transition-colors duration-300">
            <div>Total entries: <span className="font-semibold">{cacheStats.total_entries}</span></div>
            <div>Valid entries: <span className="font-semibold text-green-600 dark:text-green-400">{cacheStats.valid_entries}</span></div>
            <div>Expired entries: <span className="font-semibold text-orange-600 dark:text-orange-400">{cacheStats.expired_entries}</span></div>
            <div>TTL: <span className="font-semibold">{cacheStats.ttl_hours} hours</span></div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="mr-2 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <span className="text-sm text-gray-700 dark:text-dark-700 transition-colors duration-300">Force refresh (skip cache)</span>
          </label>
          <button
            onClick={clearCache}
            disabled={cacheLoading}
            className="px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded text-sm disabled:opacity-50 hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
          >
            {cacheLoading ? 'Clearing...' : 'Clear Cache'}
          </button>
          <button
            onClick={fetchCacheStats}
            className="px-3 py-1 bg-gray-600 dark:bg-gray-700 text-white rounded text-sm hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            Refresh Stats
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block font-medium mb-2 text-gray-900 dark:text-dark-900 transition-colors duration-300">Select Resources:</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {MOCK_RESOURCES.map(resource => (
              <button
                type="button"
                key={resource}
                className={`px-3 py-1 rounded-full border transition-colors duration-200 ${selectedResources.includes(resource) 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700' 
                  : 'bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-dark-700 border-gray-300 dark:border-dark-300 hover:bg-gray-200 dark:hover:bg-dark-300'
                }`}
                onClick={() => handleResourceToggle(resource)}
              >
                {resource}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={customResource}
              onChange={e => setCustomResource(e.target.value)}
              placeholder="Add custom resource (e.g., gcp_storage)"
              className="border border-gray-300 dark:border-dark-300 rounded px-3 py-1 flex-1 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300"
            />
            <button
              type="button"
              onClick={handleAddCustomResource}
              className="px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 transition-colors duration-200"
            >
              Add
            </button>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Cloud</label>
            <input type="text" value={envCloud} onChange={e => setEnvCloud(e.target.value)} className="border border-gray-300 dark:border-dark-300 rounded px-3 py-1 w-full bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">CI/CD</label>
            <input type="text" value={envCiCd} onChange={e => setEnvCiCd(e.target.value)} className="border border-gray-300 dark:border-dark-300 rounded px-3 py-1 w-full bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">OS</label>
            <input type="text" value={envOs} onChange={e => setEnvOs(e.target.value)} className="border border-gray-300 dark:border-dark-300 rounded px-3 py-1 w-full bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Tools (comma-separated)</label>
          <input type="text" value={toolsInput} onChange={e => setToolsInput(e.target.value)} className="border border-gray-300 dark:border-dark-300 rounded px-3 py-1 w-full bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 transition-colors duration-300" />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-700 dark:bg-blue-800 text-white rounded font-semibold disabled:opacity-50 hover:bg-blue-800 dark:hover:bg-blue-900 transition-colors duration-200"
          disabled={loading || selectedResources.length === 0}
        >
          {loading ? 'Mapping...' : 'Map Controls'}
        </button>
      </form>
      {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4 border border-red-200 dark:border-red-700 transition-colors duration-300">{error}</div>}
      {result && (
        <div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-dark-900 transition-colors duration-300">Mapping Results</h3>
          {result.length === 0 ? (
            <div className="text-gray-500 dark:text-dark-500 transition-colors duration-300">No mappings found for selected resources.</div>
          ) : (
            <ul className="space-y-4">
              {result.map(({ resource, controls }) => (
                <li key={resource} className="border border-gray-200 dark:border-dark-300 rounded p-4 bg-white dark:bg-dark-50 transition-colors duration-300">
                  <div className="font-bold text-blue-700 dark:text-blue-400 mb-1 transition-colors duration-300">{resource}</div>
                  {controls.length === 0 ? (
                    <div className="text-gray-500 dark:text-dark-500 transition-colors duration-300">No controls mapped.</div>
                  ) : (
                    <ul className="ml-4 list-disc">
                      {controls.map(control => (
                        <li key={control.id} className="mb-2">
                          <span className="font-semibold text-gray-900 dark:text-dark-900 transition-colors duration-300">{control.id} - {control.title}</span>
                          <div className="text-gray-600 dark:text-dark-600 text-sm mt-1 transition-colors duration-300">{control.explanation}</div>
                          <button
                            className="mt-2 px-3 py-1 bg-purple-600 dark:bg-purple-700 text-white rounded text-xs disabled:opacity-50 hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors duration-200"
                            disabled={adaptLoading[control.id + resource]}
                            onClick={() => handleAdapt(control.id, resource)}
                          >
                            {adaptLoading[control.id + resource] ? 'Generating...' : 'AI: Adapt to My Environment'}
                          </button>
                          {adaptResults[control.id + resource] && (
                            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded text-sm text-purple-900 dark:text-purple-300 transition-colors duration-300">
                              <div className="flex items-center justify-between mb-2">
                                <strong>AI Guidance:</strong>
                                <span className={`text-xs px-2 py-1 rounded transition-colors duration-300 ${
                                  adaptResults[control.id + resource].cached 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                }`}>
                                  {adaptResults[control.id + resource].cached ? 'Cached' : 'Fresh'}
                                </span>
                              </div>
                              {adaptResults[control.id + resource].explanation}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
} 