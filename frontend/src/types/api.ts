/**
 * API Type Definitions
 *
 * Type definitions for NIST Compliance App API responses
 * Supports Phase 2 hybrid backend implementation
 */

/**
 * Script quality metadata returned from backend
 */
export interface ScriptMetadata {
  /** Validation status (e.g., "validated", "generated", "pending") */
  status: string;

  /** Whether the script is idempotent (can be run multiple times safely) */
  idempotent: boolean;

  /** Whether the script supports rollback functionality */
  has_rollback: boolean;

  /** Whether the script has been validated against OpenSCAP */
  oscap_validated: boolean;

  /** ISO 8601 timestamp of when the script was generated */
  generated_at: string;
}

/**
 * Implementation script response from backend
 */
export interface ScriptResponse {
  /** NIST 800-53 control identifier (e.g., "AC-2") */
  control_id: string;

  /** Target operating system ("linux" or "windows") */
  os: string;

  /** Script format ("ansible", "bash", or "powershell") */
  format: string;

  /** The actual implementation script content */
  implementation_script: string;

  /** Source of the script generation */
  source: 'OpenSCAP' | 'ComplianceAsCode' | 'Custom Template';

  /** Strategy used for generation (e.g., "openscap", "cac", "custom") */
  strategy: string;

  /** Optional metadata about script quality and validation */
  metadata?: ScriptMetadata;
}

/**
 * Available formats response
 */
export interface AvailableFormatsResponse {
  /** Control identifier */
  control_id: string;

  /** Map of OS to available formats */
  available_formats: {
    [os: string]: string[];
  };
}

/**
 * Control data structure
 */
export interface Control {
  /** Control identifier (e.g., "ac-2") */
  control_id: string;

  /** Full control name */
  control_name: string;

  /** Control family (e.g., "Access Control") */
  family?: string;

  /** Plain language explanation of the control */
  plain_english_explanation?: string;

  /** Detailed description from NIST 800-53 */
  description?: string;
}
