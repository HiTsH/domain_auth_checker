import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import dns.resolver
import smtplib
import socket
import asyncio

app = Flask(__name__, static_folder='../frontend/build')
CORS(app)

def get_dns_records(domain, record_type):
    try:
        answers = dns.resolver.resolve(domain, record_type)
        return [str(r) for r in answers]
    except:
        return []

def check_spf(domain):
    txt_records = get_dns_records(domain, 'TXT')
    spf_records = [r for r in txt_records if 'v=spf1' in r.lower()]
    return {
        'exists': len(spf_records) > 0,
        'records': spf_records
    }

def check_dkim(domain, common_selectors=['default', 'google', 'selector1', 'dkim']):
    results = {}
    for selector in common_selectors:
        dkim_domain = f'{selector}._domainkey.{domain}'
        txt_records = get_dns_records(dkim_domain, 'TXT')
        if txt_records:
            results[selector] = {
                'domain': dkim_domain,
                'records': txt_records
            }
    return results

def check_dmarc(domain):
    dmarc_domain = f'_dmarc.{domain}'
    txt_records = get_dns_records(dmarc_domain, 'TXT')
    dmarc_records = [r for r in txt_records if 'v=dmarc1' in r.lower()]
    return {
        'exists': len(dmarc_records) > 0,
        'records': dmarc_records
    }

def check_mx(domain):
    mx_records = get_dns_records(domain, 'MX')
    return {
        'exists': len(mx_records) > 0,
        'records': mx_records
    }

async def test_smtp(domain, mx_records):
    results = []
    for record in mx_records:
        host = record.split(' ')[-1][:-1]
        try:
            with smtplib.SMTP(host, 25, timeout=10) as smtp:
                smtp.helo('example.com')
                code, message = smtp.noop()
                results.append({
                    'host': host,
                    'success': True,
                    'response': f"{code} {message.decode()}"
                })
        except Exception as e:
            results.append({
                'host': host,
                'success': False,
                'error': str(e)
            })
    return results

def check_email_relay(domain):
    try:
        email_subdomains = ['mail', 'smtp', 'email', 'mx', 'relay']
        results = {}
        
        for sub in email_subdomains:
            subdomain = f"{sub}.{domain}"
            mx_records = get_dns_records(subdomain, 'MX')
            a_records = get_dns_records(subdomain, 'A')
            
            results[subdomain] = {
                'mx_exists': len(mx_records) > 0,
                'mx_records': mx_records,
                'a_exists': len(a_records) > 0,
                'a_records': a_records,
                'configured': len(mx_records) > 0 or len(a_records) > 0
            }
        
        base_domain_check = {
            'mx_exists': len(get_dns_records(domain, 'MX')) > 0,
            'a_exists': len(get_dns_records(domain, 'A')) > 0,
            'configured': len(get_dns_records(domain, 'MX')) > 0 or len(get_dns_records(domain, 'A')) > 0
        }
        
        return {
            'subdomains': results,
            'base_domain': base_domain_check,
            'overall_configured': base_domain_check['configured'] or any(v['configured'] for v in results.values())
        }
    except Exception as e:
        return {'error': str(e)}

async def enhanced_test_smtp(domain, mx_records):
    results = []
    for record in mx_records:
        try:
            host = record.split(' ')[-1].rstrip('.')
            for port in [25, 587]:
                try:
                    with smtplib.SMTP(host, port, timeout=10) as smtp:
                        smtp.helo('example.com')
                        code, message = smtp.noop()
                        results.append({
                            'host': host,
                            'port': port,
                            'success': True,
                            'response': f"{code} {message.decode()}"
                        })
                        break
                except Exception as e:
                    if port == 587:
                        results.append({
                            'host': host,
                            'port': '25/587',
                            'success': False,
                            'error': str(e)
                        })
        except Exception as e:
            results.append({
                'host': record,
                'success': False,
                'error': str(e)
            })
    return results

@app.route('/api/check-domain', methods=['POST'])
def check_domain():
    data = request.get_json()
    domain = data.get('domain')
    
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400
    
    results = {
        'domain': domain,
        'spf': check_spf(domain),
        'dkim': check_dkim(domain),
        'dmarc': check_dmarc(domain),
        'mx': check_mx(domain),
        'email_relay': check_email_relay(domain)
    }
    
    if results['mx']['exists']:
        results['smtp'] = asyncio.run(enhanced_test_smtp(domain, results['mx']['records']))
    
    common_subdomains = ['mail', 'smtp', 'email', 'mx']
    results['subdomains'] = {}
    
    for sub in common_subdomains:
        subdomain = f'{sub}.{domain}'
        results['subdomains'][subdomain] = {
            'mx': check_mx(subdomain),
            'spf': check_spf(subdomain),
            'dkim': check_dkim(domain),
            'dmarc': check_dmarc(domain),
            'mx': check_mx(domain),
            'email_relay': check_email_relay(domain)
        }
    
    return jsonify(results)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
