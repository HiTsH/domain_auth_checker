import os
from flask import Flask, request, jsonify, send_from_directory
from backend.dns_utils import check_domain_records, check_email_relay_config

app = Flask(__name__, static_folder='../frontend/build')

# API Routes
@app.route('/api/check', methods=['POST'])
def check_domain():
    domain = request.json.get('domain')
    if not domain:
        return jsonify({"error": "Domain is required"}), 400
    
    try:
        results = check_domain_records(domain)
        return jsonify(results)
    except Exception as e:
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
        return jsonify({"error": str(e)}), 500

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
