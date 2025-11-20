"""
Stub functions for sample data (replaced after cleanup)
Provides empty/default data structures to prevent import errors
"""

def get_sample_tracker_records():
    """Return empty tracker records"""
    return {}


def get_sample_poams():
    """Return empty POA&M records"""
    return []


def get_sample_inventory():
    """Return minimal inventory data"""
    return {
        "systems": [],
        "assets": [],
        "metadata": {
            "generated_at": "",
            "total_systems": 0
        }
    }


def get_sample_compliance_mapping():
    """Return empty compliance mapping"""
    return {}


def get_sample_scap_results():
    """Return minimal SCAP results"""
    return {
        "scan_date": "",
        "results": [],
        "summary": {
            "total_checks": 0,
            "passed": 0,
            "failed": 0,
            "not_applicable": 0
        }
    }


def get_sample_baselines():
    """Return empty baselines"""
    return []


def get_sample_drift_detections():
    """Return empty drift detections"""
    return []


def get_sample_playbooks():
    """Return empty playbooks"""
    return []


def get_sample_compliance_reports():
    """Return empty reports"""
    return []
