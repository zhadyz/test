import { useEffect } from 'react'

function ProgressDemo() {
  useEffect(() => {
    // Add some sample tracking data for demonstration
    const sampleTrackerData = [
      {
        control_id: 'AC-2',
        status: 'Implemented',
        owner: 'John Smith',
        notes: 'Account management system fully deployed and operational',
        deadline: '2024-01-15',
        last_updated: new Date().toISOString()
      },
      {
        control_id: 'AC-3',
        status: 'In Progress',
        owner: 'Sarah Johnson',
        notes: 'Access control policies drafted, pending review',
        deadline: '2024-02-01',
        last_updated: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        control_id: 'AU-2',
        status: 'Needs Review',
        owner: 'Mike Davis',
        notes: 'Audit logging configuration completed, awaiting security team review',
        deadline: '2024-01-30',
        last_updated: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        control_id: 'CM-2',
        status: 'Deferred',
        owner: 'Lisa Chen',
        notes: 'Configuration management implementation postponed due to resource constraints',
        deadline: '2024-03-15',
        last_updated: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      }
    ]

    // Only add sample data if none exists
    const existingData = localStorage.getItem('nist_tracker')
    if (!existingData || existingData === '[]') {
      localStorage.setItem('nist_tracker', JSON.stringify(sampleTrackerData))
      console.log('📊 Sample progress tracking data added for demonstration')
    }
  }, [])

  return null // This component doesn't render anything
}

export default ProgressDemo 