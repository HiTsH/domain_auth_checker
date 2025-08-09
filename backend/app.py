import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
import logging
from .dns_utils import check_domain_records, check_email_relay_config

# Configure Python path
sys.path.append(str(Path(__file__).parent))

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__, static_folder='../frontend/build')
    
    @app.route('/api/check', methods=['POST'])
    def check_domain():
        domain = request.json.get('domain')
        if not domain:
            return jsonify({"error": "Domain is required"}), 400
        
        try:
            results = check_domain_records(domain)
            return jsonify(results)
        except Exception as e:
            logger.error(f"Domain check failed: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @app.route('/api/check-relay', methods=['POST'])
    def check_relay():
        domain = request.json.get('domain')
        if not domain:
            return jsonify({"error": "Domain is required"}), 400
        
        try:
            results = check_email_relay_config(domain)
            return jsonify(results)
        except Exception as e:
            logger.error(f"Relay check failed: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"}), 200

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
