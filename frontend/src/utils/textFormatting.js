/**
 * Text Formatting Utilities
 *
 * Utilities for cleaning and formatting NIST control text,
 * including ODP (Organization-Defined Parameter) placeholder replacement.
 */

/**
 * Replace NIST ODP placeholders with human-readable text
 *
 * Converts ugly {{ insert: param, ac-02.01_odp }} syntax into
 * clean [organization-defined value] format
 *
 * @param {string} text - Text containing ODP placeholders
 * @returns {string} - Cleaned text with friendly placeholders
 */
export function replaceODPPlaceholders(text) {
  if (!text) return text;

  // Pattern: {{ insert: param, PARAM_NAME }}
  const odpPattern = /\{\{\s*insert:\s*param,\s*([^}]+)\}\}/gi;

  return text.replace(odpPattern, (match, paramName) => {
    // Extract meaningful text from parameter name
    // Example: ac-02.01_odp -> "automated mechanisms"
    const cleanParamName = paramName.trim().toLowerCase();

    // Specific overrides for AC family controls
    const specificMappings = {
      // AC-2
      'ac-02.01_odp': 'automated mechanisms (e.g., Active Directory, Okta)',
      'ac-02.02_odp.01': 'automatically remove or disable',
      'ac-02.02_odp.02': 'a defined time period (e.g., 72 hours)',
      'ac-02.03_odp.01': 'a defined time period (e.g., 90 days)',
      'ac-02.05_odp': 'a defined inactivity period (e.g., 15 minutes)',
      'ac-02.06_odp': 'dynamic privilege management (e.g., JIT access)',
      'ac-02.08_odp': 'specific system accounts',
      'ac-02.09_odp': 'specific operational conditions',
      'ac-02.11_odp.01': 'usage conditions (e.g., time-of-day, location)',
      'ac-02.11_odp.02': 'specific system accounts',
      'ac-02.12_odp': 'atypical usage patterns (e.g., after-hours login)',
      'ac-02.13_odp.01': 'a defined time period (e.g., 1 hour)',
      'ac-02.13_odp.02': 'significant risk (e.g., termination)',

      // AC-3
      'ac-03.02_odp': 'dual authorization procedures',
      'ac-03.05_odp': 'security attributes (e.g., classification)',
      'ac-03.08_odp': 'revocation time period (e.g., immediate)',
      'ac-03.10_odp.01': 'audit logs',
      'ac-03.10_odp.02': 'prohibited activities',
      'ac-03.11_odp': 'restricted interface (e.g., read-only)',
      'ac-03.13_odp': 'sensitive data types',
      'ac-03.14_odp.01': 'specific individuals',
      'ac-03.14_odp.02': 'specific data types',
      'ac-3.3_prm_1': 'mandatory access control policy',
      'ac-3.4_prm_1': 'discretionary access control policy',
      'ac-3.7_prm_1': 'role-based access control policy',

      // AC-4
      'ac-04_odp': 'information flow control policies',
      'ac-04.01_odp.09': 'object type (e.g., data, metadata)',
      'ac-04.02_odp': 'processing flow (e.g., input, output)',
      'ac-04.03_odp': 'dynamic policy rules',
      'ac-04.04_odp.01': 'content filter',
      'ac-04.04_odp.02': 'flow direction',
      'ac-04.05_odp': 'embedded data types',
      'ac-04.06_odp': 'metadata constraints',
      'ac-04.09_odp.01': 'human review',
      'ac-04.09_odp.02': 'release authority',
      'ac-04.12_odp': 'data type',
      'ac-04.13_odp': 'code execution rules',
      'ac-04.15_odp.01': 'format verification',
      'ac-04.17_odp': 'domain isolation',
      'ac-04.20_odp.01': 'approved solutions',
      'ac-04.20_odp.02': 'policy enforcement',
      'ac-04.21_odp.03': 'physical separation',
      'ac-04.23_odp': 'origin authentication',
      'ac-04.25_odp.01': 'data set',
      'ac-04.25_odp.02': 'marking rules',
      'ac-4.1_prm_1': 'information flow policy',
      'ac-4.1_prm_2': 'information flow policy',
      'ac-4.10_prm_1': 'filtered data types',
      'ac-4.10_prm_2': 'action (e.g., block, quarantine)',
      'ac-4.11_prm_1': 'configuration management',
      'ac-4.14_prm_1': 'signed content',
      'ac-4.15_prm_2': 'action (e.g., block)',
      'ac-4.19_prm_1': 'validation mechanism',
      'ac-4.21_prm_1': 'physical connection type',

      // AC-6
      'ac-06.01_odp.01': 'authorized individuals',
      'ac-06.02_odp': 'non-privileged access',
      'ac-06.03_odp.01': 'network access',
      'ac-06.03_odp.02': 'privileged commands',
      'ac-06.05_odp': 'privileged accounts',
      'ac-06.08_odp': 'privilege level',

      // AC-7
      'ac-07.02_odp.01': 'purge/wipe',
      'ac-07.02_odp.02': 'organization-defined attempts',
      'ac-07.02_odp.03': 'mobile device',
      'ac-07.03_odp': 'logon feedback',

      // AC-9
      'ac-09.02_odp.01': 'notification message',
      'ac-09.02_odp.02': 'time period',
      'ac-09.03_odp.01': 're-authentication',
      'ac-09.03_odp.02': 'time period',
      'ac-09.04_odp': 'additional authentication',

      // AC-10
      'ac-10_odp.01': 'concurrent session limit (e.g., 3)',
      'ac-10_odp.02': 'system accounts',

      // AC-12
      'ac-12_odp': 'session termination timeout (e.g., 15m)',
      'ac-12.01_odp': 'user-initiated logout',
      'ac-12.03_odp': 'logout message',

      // AC-16
      'ac-16.05_odp.01': 'security attributes',
      'ac-16.05_odp.02': 'subjects/objects',
      'ac-16.1_prm_1': 'attribute level',
      'ac-16.1_prm_2': 'attribute type',
      'ac-16.3_prm_1': 'attribute association',
      'ac-16.3_prm_2': 'information system',
      'ac-16.4_prm_1': 'authorized attributes',
      'ac-16.4_prm_2': 'attribute authority',
      'ac-16.6_prm_1': 'attribute type',
      'ac-16.6_prm_2': 'attribute value',
      'ac-16.6_prm_3': 'action',
      'ac-16.8_prm_1': 'association type',
      'ac-16.9_prm_1': 'attribute type',

      // AC-17
      'ac-17.09_odp': 'disconnect capability',
      'ac-17.10_odp.01': 'configuration settings',
      'ac-17.10_odp.02': 'remote access type',

      // AC-18
      'ac-18.01_odp': 'authentication mechanism',

      // AC-19
      'ac-19.05_odp.01': 'full-device encryption',
      'ac-19.05_odp.02': 'container-based encryption',

      // AC-20
      'ac-20.02_odp': 'portable storage devices',
      'ac-20.03_odp': 'non-organizational devices',
      'ac-20.04_odp': 'network components',

      // AC-21
      'ac-21.01_odp': 'automated information sharing',
      'ac-21.02_odp': 'information sharing agreement',

      // AC-23
      'ac-23_odp.01': 'data mining',
      'ac-23_odp.02': 'data storage',

      // AC-24
      'ac-24_odp.01': 'access control policy',
      'ac-24_odp.02': 'access control decision',
      'ac-24.01_odp.01': 'documented decision',
      'ac-24.01_odp.02': 'decision rationale',
      'ac-24.01_odp.03': 'retention period',
      'ac-24.2_prm_1': 'automated mechanism',

      // AC-25
      'ac-25_odp': 'reference monitor'
    };

    if (specificMappings[cleanParamName]) {
      return `[${specificMappings[cleanParamName]}]`;
    }

    // Common ODP patterns and their friendly replacements
    const replacements = {
      // Time-based parameters
      'time': '[organization-defined time period]',
      'frequency': '[organization-defined frequency]',
      'period': '[organization-defined time period]',
      'timeframe': '[organization-defined timeframe]',

      // Automation parameters
      'automated': '[automated mechanisms]',
      'mechanism': '[automated mechanisms]',

      // Personnel parameters
      'personnel': '[organization-defined personnel or roles]',
      'roles': '[organization-defined roles]',
      'individuals': '[organization-defined individuals]',

      // Conditions/circumstances
      'circumstances': '[organization-defined circumstances]',
      'conditions': '[organization-defined conditions]',
      'events': '[organization-defined events]',

      // Actions
      'actions': '[organization-defined actions]',
      'procedures': '[organization-defined procedures]',

      // Generic fallback
      'odp': '[organization-defined parameter]',
    };

    // Try to match against common patterns
    for (const [key, value] of Object.entries(replacements)) {
      if (cleanParamName.includes(key)) {
        return value;
      }
    }

    // Default fallback for unknown parameters
    return '[organization-defined parameter]';
  });
}

/**
 * Clean all NIST formatting issues from text
 *
 * @param {string} text - Raw NIST text
 * @returns {string} - Cleaned, user-friendly text
 */
export function cleanNISTText(text) {
  if (!text) return text;

  let cleaned = text;

  // Replace ODP placeholders
  cleaned = replaceODPPlaceholders(cleaned);

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Format control description for display
 *
 * @param {object} control - Control object
 * @returns {string} - Formatted description
 */
export function formatControlDescription(control) {
  if (!control) return '';

  // Prefer plain_english_explanation, fallback to official_text
  const text = control.plain_english_explanation || control.official_text || control.description || '';

  return cleanNISTText(text);
}

/**
 * Format official text for display
 *
 * @param {string} officialText - Raw official text from NIST
 * @returns {string} - Cleaned official text
 */
export function formatOfficialText(officialText) {
  return cleanNISTText(officialText);
}

/**
 * Extract enhancement number from control ID
 *
 * @param {string} controlId - Control ID (e.g., "ac-2.1")
 * @returns {string} - Enhancement number (e.g., "1")
 */
export function getEnhancementNumber(controlId) {
  if (!controlId) return '?';
  const parts = controlId.split('.');
  return parts[1] || '?';
}

/**
 * Get base control ID from enhancement
 *
 * @param {string} controlId - Enhancement ID (e.g., "ac-2.1")
 * @returns {string} - Base control ID (e.g., "ac-2")
 */
export function getBaseControlId(controlId) {
  if (!controlId) return '';
  return controlId.split('.')[0];
}

/**
 * Check if control is an enhancement
 *
 * @param {string} controlId - Control ID
 * @returns {boolean} - True if enhancement (has dot notation)
 */
export function isEnhancement(controlId) {
  if (!controlId) return false;
  const parts = controlId.split('-');
  if (parts.length < 2) return false;
  const numberPart = parts[1];
  return numberPart.includes('.');
}

/**
 * Parse text into structured paragraphs and lists for rich rendering
 * 
 * @param {string} text - Raw text with newlines
 * @returns {Array} - Array of objects {type: 'p'|'list', content: string|Array}
 */
export function parseRichText(text) {
  if (!text) return [];
  
  // First, split by double newlines to get logical blocks
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
  
  return blocks.map(block => {
    // Check if this block is a list (lines starting with - or *)
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    const isList = lines.length > 1 && lines.every(l => l.match(/^[-*•]|\d+\./));
    
    if (isList) {
      return {
        type: 'list',
        content: lines.map(l => l.replace(/^[-*•]|\d+\.\s*/, ''))
      };
    }
    
    return {
      type: 'p',
      content: block
    };
  });
}
