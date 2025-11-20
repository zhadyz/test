import React, { useState } from 'react'
import { 
  SparklesIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ServerStackIcon,
  CloudIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

// Local knowledge base for common control adaptations
const CONTROL_ADAPTATIONS = {
  'AC-2': {
    environments: {
      'aws': 'Use AWS IAM for account management, implement least privilege with IAM policies, enable CloudTrail for account activity monitoring.',
      'azure': 'Leverage Azure AD for identity management, use conditional access policies, implement PIM for privileged access.',
      'kubernetes': 'Use RBAC for service accounts, implement pod security policies, use network policies for micro-segmentation.',
      'windows': 'Use Active Directory for centralized account management, implement group policies, enable audit logging.',
      'linux': 'Use centralized authentication (LDAP/AD), implement sudo policies, configure auditd for account monitoring.'
    },
    pitfalls: [
      'Not implementing account lockout policies',
      'Shared accounts without proper tracking',
      'Missing privileged account monitoring',
      'Inadequate password policies'
    ],
    checklist: [
      'Account creation procedures documented',
      'Privileged accounts identified and monitored',
      'Account review process established',
      'Automated provisioning/deprovisioning implemented'
    ]
  },
  'AU-2': {
    environments: {
      'aws': 'Enable CloudTrail, VPC Flow Logs, and GuardDuty. Use CloudWatch for centralized logging and monitoring.',
      'azure': 'Configure Azure Monitor, enable Activity Log, use Azure Sentinel for SIEM capabilities.',
      'splunk': 'Configure universal forwarders, create custom dashboards, implement correlation rules for security events.',
      'elk': 'Use Beats for log collection, create Kibana dashboards, implement Watcher for alerting.',
      'syslog': 'Configure centralized syslog server, implement log rotation, ensure secure log transmission.'
    },
    pitfalls: [
      'Logging too much or too little data',
      'Not protecting log integrity',
      'Missing critical system events',
      'Inadequate log retention policies'
    ],
    checklist: [
      'Audit events identified and documented',
      'Log sources configured and tested',
      'Log integrity protection implemented',
      'Retention and disposal procedures established'
    ]
  },
  'SC-28': {
    environments: {
      'aws': 'Use KMS for key management, enable EBS encryption, implement S3 bucket encryption at rest.',
      'azure': 'Use Azure Key Vault, enable disk encryption, implement storage account encryption.',
      'database': 'Enable TDE (Transparent Data Encryption), implement column-level encryption for sensitive data.',
      'file-system': 'Use LUKS for Linux disk encryption, BitLocker for Windows, implement file-level encryption.',
      'backup': 'Encrypt backup media, use encrypted transport for backup data, implement secure key escrow.'
    },
    pitfalls: [
      'Poor key management practices',
      'Not encrypting all sensitive data',
      'Using weak encryption algorithms',
      'Missing encryption in transit'
    ],
    checklist: [
      'Encryption requirements identified',
      'Key management procedures documented',
      'Encryption implementation tested',
      'Performance impact assessed'
    ]
  }
}

// Environment-specific templates
const ENVIRONMENT_TEMPLATES = {
  'hybrid-cloud': 'hybrid AWS and Azure environment using Kubernetes',
  'legacy-windows': 'Windows Server 2012 with legacy Active Directory',
  'modern-devops': 'CI/CD workflow using GitHub Actions and Ansible',
  'zero-trust': 'zero trust architecture with remote work capabilities',
  'compliance-heavy': 'HIPAA/SOC 2/GDPR compliant environment',
  'container-native': 'Kubernetes-native with service mesh and GitOps'
}

// Demo responses for when AI services are not available
const DEMO_RESPONSES = {
  'general': `**NIST 800-53 Compliance Guidance Demo**

This is a demonstration of the AI assistant capabilities. In a full implementation, this would provide:

🎯 **Environment-Specific Adaptations**
- Step-by-step implementation guides for AWS, Azure, Kubernetes, etc.
- Configuration examples and command snippets
- Integration patterns with existing security tools

⚠️ **Risk Assessment & Pitfalls**
- Common implementation mistakes to avoid
- Security gaps specific to your technology stack
- Compliance blind spots and remediation strategies

🤖 **Automation Recommendations**
- Infrastructure as Code templates
- Policy as Code implementations  
- Continuous compliance monitoring setups

*To enable full AI capabilities, configure OpenAI API key in backend environment.*`,

  'control-specific': (controlId) => `**Demo: Implementation Guidance for ${controlId}**

## Implementation Steps
1. **Assessment Phase**
   - Review current implementation status
   - Identify gaps in your environment
   - Document compliance requirements

2. **Planning Phase**
   - Select appropriate tools and platforms
   - Design implementation architecture
   - Create implementation timeline

3. **Implementation Phase**
   - Deploy security controls
   - Configure monitoring and logging
   - Test and validate effectiveness

## Common Pitfalls
- Insufficient testing in production environments
- Missing integration with existing security tools
- Inadequate documentation and change management

## Automation Checklist
☐ Infrastructure as Code templates created
☐ Continuous monitoring configured
☐ Automated compliance reporting set up
☐ Regular review processes established

*This is a demo response. Real AI would provide environment-specific, detailed guidance.*`
}

const AIAssistantTile = ({ 
  usageStats = { aiQueriesUsed: 0 },
  onAIQuery,
  selectedControl = null
}) => {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedEnvironment, setSelectedEnvironment] = useState('')
  const [useLocalKnowledge, setUseLocalKnowledge] = useState(true)
  const [responseSource, setResponseSource] = useState('')
  
  const remainingQueries = Math.max(0, 10 - (usageStats.aiQueriesUsed || 0))

  // Smart response generation - tries local knowledge first, then hybrid API
  const generateResponse = async (userQuery, control, environment) => {
    // First, try local knowledge base for instant responses
    if (useLocalKnowledge && control && CONTROL_ADAPTATIONS[control.control_id]) {
      const controlData = CONTROL_ADAPTATIONS[control.control_id]
      
      // Check if we have environment-specific guidance
      const envKey = Object.keys(controlData.environments).find(env => 
        environment.toLowerCase().includes(env) || userQuery.toLowerCase().includes(env)
      )
      
      if (envKey) {
        const adaptation = controlData.environments[envKey]
        const pitfalls = controlData.pitfalls.slice(0, 3)
        const checklist = controlData.checklist
        
        setResponseSource('Local Knowledge Base')
        return `**Environment-Specific Adaptation for ${control.control_id}:**

${adaptation}

**Key Pitfalls to Avoid:**
${pitfalls.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Implementation Checklist:**
${checklist.map((c, i) => `☐ ${c}`).join('\n')}

**Next Steps:**
Consider your specific regulatory requirements and integrate with existing security tools in your environment.`
      }
    }
    
    // Try hybrid AI service for more comprehensive responses
    if (control && environment && (useLocalKnowledge || !useLocalKnowledge)) {
      try {
        const response = await fetch('/api/hybrid-ai/guidance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            control_id: control.control_id,
            environment_description: environment,
            force_api: !useLocalKnowledge,
            context: {
              title: control.title,
              family: control.family,
              description: control.description
            }
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setResponseSource(data.source)
          
          return `**Implementation Guidance for ${control.control_id}:**

${data.implementation_guidance}

**Risks and Gaps:**
${data.risks_and_gaps}

**Automation Tips:**
${data.automation_tips}

*Source: ${data.source} (Confidence: ${Math.round(data.confidence * 100)}%)*`
        }
      } catch (error) {
        console.log('Hybrid AI service unavailable, falling back to standard AI')
      }
    }
    
    // Fallback to standard AI API if available
    if (onAIQuery) {
      try {
        setResponseSource('AI API')
        
        // Enhanced prompt for better responses
        const enhancedQuery = environment 
          ? `You are a NIST 800-53 compliance assistant. Adapt control ${control?.control_id || ''} for ${environment}. ${userQuery}. Provide practical, environment-specific steps, pitfalls to avoid, and a checklist. If information is missing, state what else would be helpful.`
          : `You are a NIST 800-53 compliance assistant. ${userQuery}. Provide practical steps, pitfalls to avoid, and a checklist. If information is missing, state what else would be helpful.`
          
        const aiResponse = await onAIQuery(enhancedQuery, control)
        
        // Check if response indicates AI service is not configured
        if (aiResponse && (aiResponse.includes('not configured') || aiResponse.includes('service error'))) {
          // Fall back to demo mode
          setResponseSource('Demo Mode')
          return control 
            ? DEMO_RESPONSES['control-specific'](control.control_id)
            : DEMO_RESPONSES['general']
        }
        
        return aiResponse
      } catch (error) {
        // AI API failed, use demo mode
        setResponseSource('Demo Mode')
        return control 
          ? DEMO_RESPONSES['control-specific'](control.control_id)
          : DEMO_RESPONSES['general']
      }
    }
    
    // Final fallback to demo mode
    setResponseSource('Demo Mode')
    return control 
      ? DEMO_RESPONSES['control-specific'](control.control_id)
      : DEMO_RESPONSES['general']
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    // If using local knowledge, don't count against API limit
    if (!useLocalKnowledge && remainingQueries <= 0) return

    setLoading(true)
    
    // Don't count usage for demo queries
    const isDemoQuery = query.toLowerCase().includes('demo')
    
    try {
      const result = await generateResponse(query, selectedControl, selectedEnvironment)
      setResponse(result)
      
      // Only track usage if it's not a demo and not using local knowledge exclusively
      if (!isDemoQuery && responseSource && 
          !responseSource.includes('Local Knowledge') && 
          !responseSource.includes('Demo')) {
        // Usage is already tracked in the main App component's handleAIQuery
        console.log('Query processed:', responseSource)
      }
      
    } catch (error) {
      setResponse('Sorry, there was an error processing your request.')
      setResponseSource('Error')
    } finally {
      setLoading(false)
      setQuery('')
    }
  }

  const quickPrompts = selectedControl ? [
    `Adapt this control for ${selectedEnvironment || 'a hybrid cloud environment'}`,
    'What are the key implementation steps?',
    'Show me common pitfalls to avoid',
    'Provide an implementation checklist'
  ] : [
    'How do I implement zero trust architecture?',
    'Best practices for cloud compliance',
    'DevOps security automation tips',
    'Legacy system modernization approach'
  ]

  const handleEnvironmentSelect = (env) => {
    setSelectedEnvironment(ENVIRONMENT_TEMPLATES[env])
    if (selectedControl) {
      setQuery(`Adapt this control for ${ENVIRONMENT_TEMPLATES[env]}`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with mode toggle */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              NIST Compliance Assistant
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setUseLocalKnowledge(!useLocalKnowledge)}
              className={`text-xs px-2 py-1 rounded ${
                useLocalKnowledge 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {useLocalKnowledge ? 'Hybrid Mode' : 'API Only'}
            </button>
            <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
              {remainingQueries} API calls left
            </span>
          </div>
        </div>
        
        {selectedControl && (
          <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
            Context: {selectedControl.control_id} - {selectedControl.title}
          </p>
        )}
        
        {responseSource && (
          <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
            {responseSource === 'Local Knowledge Base' ? (
              <ServerStackIcon className="h-3 w-3" />
            ) : (
              <CloudIcon className="h-3 w-3" />
            )}
            <span>Source: {responseSource}</span>
          </div>
        )}
      </div>

      {/* Environment Selection */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Target Environment:</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(ENVIRONMENT_TEMPLATES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleEnvironmentSelect(key)}
              className={`text-left p-2 rounded border transition-colors ${
                selectedEnvironment === value
                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {key.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Prompts */}
      {!response && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Quick prompts:</p>
            <button
              onClick={() => {
                setQuery('Show me a demo of AI guidance')
                setTimeout(() => {
                  const demoResponse = selectedControl 
                    ? DEMO_RESPONSES['control-specific'](selectedControl.control_id)
                    : DEMO_RESPONSES['general']
                  setResponse(demoResponse)
                  setResponseSource('Demo Mode')
                }, 500)
              }}
              className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              ✨ Try Demo
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setQuery(prompt)}
                className="text-left text-xs p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="flex-1 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-y-auto">
          <div className="flex items-start space-x-2">
            {responseSource === 'Local Knowledge Base' && (
              <ServerStackIcon className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
            )}
            {responseSource === 'AI API' && (
              <CloudIcon className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
            )}
            {responseSource === 'Demo Mode' && (
              <SparklesIcon className="h-4 w-4 text-purple-500 mt-1 flex-shrink-0" />
            )}
            {!responseSource && (
              <LightBulbIcon className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
            )}
            <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {response}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              {responseSource === 'Local Knowledge Base' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Instant Local Response</span>
                </>
              )}
              {responseSource === 'AI API' && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>AI-Powered Response</span>
                </>
              )}
              {responseSource === 'Demo Mode' && (
                <>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Demo Response</span>
                </>
              )}
            </div>
            <button
              onClick={() => setResponse('')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear response
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              useLocalKnowledge 
                ? "Ask about control adaptation..." 
                : remainingQueries > 0 
                  ? "Ask AI about compliance..." 
                  : "No API calls remaining"
            }
            disabled={(!useLocalKnowledge && remainingQueries <= 0) || loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || (!useLocalKnowledge && remainingQueries <= 0) || loading}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Usage Warning */}
      {!useLocalKnowledge && remainingQueries <= 2 && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-200 flex items-center space-x-1">
          <ExclamationTriangleIcon className="h-3 w-3" />
          <span>
            {remainingQueries === 0 
              ? 'Switch to Hybrid Mode for unlimited local responses' 
              : `${remainingQueries} API calls remaining. Try Hybrid Mode!`}
          </span>
        </div>
      )}

      {/* Mode Information */}
      {useLocalKnowledge ? (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-200 flex items-center space-x-1">
          <CheckCircleIcon className="h-3 w-3" />
          <span>Hybrid Mode: Instant responses from local knowledge base + AI fallback</span>
        </div>
      ) : (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-xs text-blue-800 dark:text-blue-200">
          <div className="flex items-center space-x-1 mb-1">
            <CloudIcon className="h-3 w-3" />
            <span>API Mode: AI-powered responses</span>
          </div>
          <div className="text-xs opacity-75">
            Try the "✨ Try Demo" button to see sample responses without using API calls
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAssistantTile 