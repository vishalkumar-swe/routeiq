import hashlib
import json

class SecurityService:
    @staticmethod
    def generate_hash(data: dict, prev_hash: str) -> str:
        """
        Generates a SHA-256 hash for a shipment log.
        Refined per user verdict: payload = json.dumps(data, sort_keys=True) + prev_hash
        """
        payload = json.dumps(data, sort_keys=True) + prev_hash
        return hashlib.sha256(payload.encode()).hexdigest()

    @staticmethod
    def verify_chain(logs: list) -> bool:
        """
        Verifies the integrity of a hash chain of shipment logs.
        """
        if not logs:
            return True
            
        for i in range(1, len(logs)):
            current_log = logs[i]
            prev_log = logs[i-1]
            
            # Construct data as it was hashed
            data = {
                "shipment_id": str(current_log.shipment_id),
                "status": current_log.status,
                "location_lat": current_log.location_lat,
                "location_lng": current_log.location_lng,
                "timestamp": current_log.timestamp.isoformat() if current_log.timestamp else None,
                "index": current_log.index,
                "metadata": current_log.metadata_json
            }
            
            expected_hash = SecurityService.generate_hash(data, prev_log.log_hash)
            if current_log.log_hash != expected_hash:
                return False
                
        return True
