import dns.resolver
import smtplib
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

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
            try:
                with smtplib.SMTP(mx_host, timeout=5) as server:
                    server.helo('example.com')
                    results["smtp_connectivity"] = True
                    
                    try:
                        server.starttls()
                        results["starttls_supported"] = True
                    except smtplib.SMTPException:
                        pass
                    
                    try:
                        server.mail('')
                        code, _ = server.rcpt('test@example.com')
                        results["open_relay"] = code == 250
                    except smtplib.SMTPException:
                        results["open_relay"] = False
            except (smtplib.SMTPException, socket.timeout) as e:
                logger.warning(f"SMTP test failed for {domain}: {str(e)}")

    except dns.resolver.NXDOMAIN:
        results["error"] = f"No MX records found for {domain}"
    except Exception as e:
        logger.error(f"Relay check error for {domain}: {str(e)}")
        results["error"] = str(e)
    
    return results

def check_dns_record(domain: str, record_type: str) -> List[str]:
    try:
        answers = dns.resolver.resolve(domain, record_type)
        return [str(r) for r in answers]
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return []
    except dns.resolver.Timeout:
        raise Exception(f"DNS query for {record_type} timed out")
    except Exception as e:
        raise Exception(f"DNS query failed: {str(e)}")

def check_domain_records(domain: str) -> Dict:
    results = {
        "checks": {
            "spf": {"exists": False, "valid": False},
            "dkim": {"exists": False, "valid": False},
            "dmarc": {"exists": False, "valid": False}
        },
        "email_relay": check_email_relay_config(domain)
    }

    try:
        # SPF Check
        spf_records = check_dns_record(domain, 'TXT')
        for record in spf_records:
            if 'v=spf1' in record:
                results["checks"]["spf"] = {
                    "exists": True,
                    "record": record,
                    "valid": ('-all' in record or '~all' in record)
                }
                break

        # DKIM Check
        selectors = ['default', 'google', 'selector1', 'dkim']
        for selector in selectors:
            try:
                dkim_records = check_dns_record(f"{selector}._domainkey.{domain}", 'TXT')
                for record in dkim_records:
                    if 'v=DKIM1' in record and 'k=rsa' in record:
                        results["checks"]["dkim"] = {
                            "exists": True,
                            "record": record,
                            "selector": selector,
                            "valid": True
                        }
                        break
            except Exception as e:
                logger.warning(f"DKIM check failed for {selector}: {str(e)}")

        # DMARC Check
        dmarc_records = check_dns_record(f"_dmarc.{domain}", 'TXT')
        for record in dmarc_records:
            if 'v=DMARC1' in record:
                results["checks"]["dmarc"] = {
                    "exists": True,
                    "record": record,
                    "valid": ('p=quarantine' in record or 'p=reject' in record)
                }
                break

        # Generate summary
        all_valid = all(check["valid"] for check in results["checks"].values())
        results["summary"] = {
            "all_pass": all_valid,
            "recommendations": generate_recommendations(results["checks"])
        }

    except Exception as e:
        logger.error(f"Domain check failed for {domain}: {str(e)}")
        results["error"] = str(e)

    return results

def generate_recommendations(checks: Dict) -> str:
    recommendations = []
    if not checks["spf"]["valid"]:
        recommendations.append("Add SPF record ending with -all or ~all")
    if not checks["dkim"]["valid"]:
        recommendations.append("Configure valid DKIM record with RSA key")
    if not checks["dmarc"]["valid"]:
        recommendations.append("Add DMARC record with p=quarantine or p=reject")
    return " ".join(recommendations) if recommendations else "All configurations are correct"
