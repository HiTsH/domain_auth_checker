from flask import Flask, request, jsonify
from dns_utils import check_domain_records

app = Flask(__name__)

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

if __name__ == '__main__':
    app.run(debug=True)
