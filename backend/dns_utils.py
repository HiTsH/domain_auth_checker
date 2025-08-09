import dns.resolver
import smtplib
import socket
from typing import Dict

def check_email_relay_config(domain: str) -> Dict:
    results = {
        "mx_records": [],
        "smtp_connectivity": False,
        "starttls_supported": False,
        "open_relay": False
    }

    try:
        # MX Records
        mx_records = dns.resolver.resolve(domain, 'MX')
        results["mx_records"] = [str(mx.exchange) for mx in mx_records]

        # SMTP Tests
        if mx_records:
            mx_host = str(mx_records[0].exchange)
            with smtplib.SMTP(mx_host, timeout=5) as server:
                results["smtp_connectivity"] = True
                try:
                    server.starttls()
                    results["starttls_supported"] = True
                except:
                    pass
                try:
                    server.mail("test@example.com")
                    server.rcpt("test@example.org")
                    results["open_relay"] = True
                except:
                    pass
    except Exception as e:
        results["error"] = str(e)
    return results

def check_domain_records(domain: str) -> Dict:
    # [Keep your existing SPF/DKIM/DMARC logic]
    return {
        **dns_results,
        "email_relay": check_email_relay_config(domain)
    }
