import React, { useState, useEffect } from 'react'
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ShieldExclamationIcon,
  DocumentCheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

const RISK_LEVEL_COLORS = {
  'Low': 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
  'Medium': 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700', 
  'High': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  'Critical': 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-600'
}

const SAMPLE_RESOURCES = [
  {
    resource_id: 'production-s3-bucket',
    resource_type: 'aws_s3',
    properties: {
      encryption_enabled: true,
      public_access_blocked: true,
      kms_key_id: 'arn:aws:kms:us-east-1:123456789012:key/sample-key'
    }
  },
  {
    resource_id: 'admin-user',
    resource_type: 'aws_iam',
    properties: {
      mfa_enabled: true,
      password_policy_enforced: true
    }
  },
  {
    resource_id: 'web-server-01',
    resource_type: 'linux_server',
    properties: {
      firewall_enabled: true,
      patches_up_to_date: true
    }
  }
]

export default function DriftDetector() {
  const [baselines, setBaselines] = useState([])
  const [driftResults, setDriftResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [selectedResource, setSelectedResource] = useState('')
  const [selectedControl, setSelectedControl] = useState('')
  
  // Form states for creating baselines
  const [baselineForm, setBaselineForm] = useState({
    resource_id: '',
    resource_type: 'aws_s3',
    control_id: 'SC-28',
    compliant_state: {},
    environment: { cloud: 'aws', region: 'us-east-1' }
  })

  useEffect(() => {
    fetchBaselines()
    fetchStats()
  }, [])

  const fetchBaselines = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/drift/baselines')
      if (response.ok) {
        const data = await response.json()
        setBaselines(data)
      }
    } catch (err) {
      console.error('Failed to fetch baselines:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/drift/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const createBaseline = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/drift/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baselineForm,
          compliant_state: JSON.parse(baselineForm.compliant_state || '{}')
        })
      })

      if (response.ok) {
        await fetchBaselines()
        await fetchStats()
        setBaselineForm({
          resource_id: '',
          resource_type: 'aws_s3',
          control_id: 'SC-28',
          compliant_state: {},
          environment: { cloud: 'aws', region: 'us-east-1' }
        })
        alert('Baseline created successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create baseline')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkDrift = async () => {
    setLoading(true)
    setError(null)
    setDriftResults(null)

    try {
      // Create current resource states (simulated with some drift)
      const currentResources = SAMPLE_RESOURCES.map(resource => ({
        ...resource,
        timestamp: new Date().toISOString(),
        environment: { cloud: 'aws', region: 'us-east-1' },
        // Simulate some drift
        properties: {
          ...resource.properties,
          ...(resource.resource_id === 'production-s3-bucket' ? { encryption_enabled: false } : {}),
          ...(resource.resource_id === 'admin-user' ? { mfa_enabled: false } : {})
        }
      }))

      const response = await fetch('http://localhost:8000/api/drift/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: currentResources,
          environment: { cloud: 'aws', region: 'us-east-1' }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setDriftResults(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to check drift')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const simulateDrift = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/drift/simulate', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setDriftResults(data.drift_result)
        await fetchBaselines()
        await fetchStats()
        alert('Drift simulation completed! Check the results below.')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to simulate drift')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteBaseline = async (resourceType, resourceId, controlId) => {
    if (!confirm('Are you sure you want to delete this baseline?')) return

    try {
      const response = await fetch(
        `http://localhost:8000/api/drift/baseline/${resourceType}/${resourceId}/${controlId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await fetchBaselines()
        await fetchStats()
        alert('Baseline deleted successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete baseline')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-gray-50 dark:bg-dark-50 min-h-screen transition-colors duration-300">
      <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
        <h1 className="text-3xl font-bold mb-2 flex items-center text-gray-900 dark:text-dark-900 transition-colors duration-300">
          <ShieldExclamationIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
          Real-Time Drift Detection
        </h1>
        <p className="text-gray-600 dark:text-dark-600 mb-6 transition-colors duration-300">
          Monitor compliance drift by comparing current resource states against established baselines.
        </p>

        {/* Statistics Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors duration-300">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_baselines}</div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Total Baselines</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700 transition-colors duration-300">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resource_types.length}</div>
              <div className="text-sm text-green-800 dark:text-green-300">Resource Types</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700 transition-colors duration-300">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.control_ids.length}</div>
              <div className="text-sm text-purple-800 dark:text-purple-300">Controls Monitored</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200 dark:border-orange-700 transition-colors duration-300">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Object.keys(stats.environments).length}
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-300">Environments</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={checkDrift}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            {loading ? 'Checking...' : 'Check Drift'}
          </button>
          <button
            onClick={simulateDrift}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors duration-200"
          >
            {loading ? 'Simulating...' : 'Run Demo Simulation'}
          </button>
          <button
            onClick={() => { fetchBaselines(); fetchStats(); }}
            className="px-6 py-2 bg-gray-600 dark:bg-dark-400 text-white rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-dark-500 transition-colors duration-200"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 flex items-center border border-red-200 dark:border-red-700 transition-colors duration-300">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* Drift Results */}
      {driftResults && (
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
          <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-900 dark:text-dark-900 transition-colors duration-300">
            {driftResults.drift_detected ? (
              <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircleIcon className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
            )}
            Drift Detection Results
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg transition-colors duration-300">
              <div className="text-lg font-semibold text-gray-900 dark:text-dark-900">{driftResults.total_resources_checked}</div>
              <div className="text-sm text-gray-600 dark:text-dark-600">Resources Checked</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg transition-colors duration-300">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">{driftResults.compliant_resources}</div>
              <div className="text-sm text-green-800 dark:text-green-300">Compliant</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg transition-colors duration-300">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">{driftResults.non_compliant_resources}</div>
              <div className="text-sm text-red-800 dark:text-red-300">Non-Compliant</div>
            </div>
          </div>

          {driftResults.drift_detected ? (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400 transition-colors duration-300">⚠️ Compliance Drift Detected</h3>
              <div className="space-y-3">
                {driftResults.changes.map((change, index) => (
                  <div key={index} className={`p-4 rounded-lg border transition-colors duration-300 ${RISK_LEVEL_COLORS[change.risk_level]}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{change.resource}</div>
                        <div className="text-sm mt-1">{change.issue}</div>
                        <div className="text-xs mt-2 text-gray-600 dark:text-dark-600 transition-colors duration-300">
                          Control: {change.control_id} | Risk: {change.risk_level}
                        </div>
                        <div className="text-xs mt-1 bg-white dark:bg-dark-200 bg-opacity-50 dark:bg-opacity-50 p-2 rounded transition-colors duration-300">
                          Baseline: {JSON.stringify(change.baseline_value)} → 
                          Current: {JSON.stringify(change.current_value)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 transition-colors duration-300">✅ No Drift Detected</h3>
              <p className="text-gray-600 dark:text-dark-600 transition-colors duration-300">All monitored resources are compliant with their baselines.</p>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-dark-500 mt-4 transition-colors duration-300">
            Scan completed at: {new Date(driftResults.scan_timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Baseline Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Baseline Form */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-dark-900 transition-colors duration-300">
            <DocumentCheckIcon className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
            Create Baseline
          </h2>
          <form onSubmit={createBaseline} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Resource ID</label>
              <input
                type="text"
                value={baselineForm.resource_id}
                onChange={(e) => setBaselineForm({...baselineForm, resource_id: e.target.value})}
                className="w-full border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-300"
                placeholder="e.g., my-s3-bucket"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Resource Type</label>
              <select
                value={baselineForm.resource_type}
                onChange={(e) => setBaselineForm({...baselineForm, resource_type: e.target.value})}
                className="w-full border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-300"
              >
                <option value="aws_s3">AWS S3</option>
                <option value="aws_iam">AWS IAM</option>
                <option value="aws_ec2">AWS EC2</option>
                <option value="linux_server">Linux Server</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Control ID</label>
              <select
                value={baselineForm.control_id}
                onChange={(e) => setBaselineForm({...baselineForm, control_id: e.target.value})}
                className="w-full border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-300"
              >
                <option value="SC-28">SC-28 (Encryption)</option>
                <option value="AC-3">AC-3 (Access Control)</option>
                <option value="AC-2">AC-2 (Account Management)</option>
                <option value="IA-2">IA-2 (Authentication)</option>
                <option value="CM-6">CM-6 (Configuration)</option>
                <option value="SI-2">SI-2 (Patch Management)</option>
                <option value="SC-7">SC-7 (Boundary Protection)</option>
                <option value="AU-2">AU-2 (Audit Events)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1 transition-colors duration-300">Compliant State (JSON)</label>
              <textarea
                value={baselineForm.compliant_state}
                onChange={(e) => setBaselineForm({...baselineForm, compliant_state: e.target.value})}
                className="w-full border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-300"
                placeholder='{"encryption_enabled": true, "kms_key_id": "arn:aws:kms:..."}'
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200"
            >
              {loading ? 'Creating...' : 'Create Baseline'}
            </button>
          </form>
        </div>

        {/* Existing Baselines */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-soft dark:shadow-dark-soft border border-gray-200 dark:border-dark-300 p-6 transition-colors duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-900 transition-colors duration-300">Existing Baselines</h2>
          {baselines.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-dark-500 transition-colors duration-300">
              No baselines created yet. Create your first baseline to start monitoring drift.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {baselines.map((baseline, index) => (
                <div key={index} className="border border-gray-200 dark:border-dark-300 bg-gray-50 dark:bg-dark-200 rounded-lg p-3 transition-colors duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-dark-900">{baseline.resource_id}</div>
                      <div className="text-xs text-gray-600 dark:text-dark-600">
                        {baseline.resource_type} | {baseline.control_id}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                        Created: {new Date(baseline.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBaseline(baseline.resource_type, baseline.resource_id, baseline.control_id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 transition-colors duration-200"
                      title="Delete baseline"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 