import dns.resolver

def check_domain_records(domain):
    spf = check_spf(domain)
    dkim = check_dkim(domain)
    dmarc = check_dmarc(domain)
    
    all_valid = all([spf['valid'], dkim['valid'], dmarc['valid']])
    
    return {
        "domain": domain,
        "checks": {
            "spf": spf,
            "dkim": dkim,
            "dmarc": dmarc
        },
        "summary": {
            "all_pass": all_valid,
            "recommendations": generate_recommendations(spf, dkim, dmarc)
        }
    }

def check_spf(domain):
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        for r in answers:
            if 'v=spf1' in str(r):
                return {
                    "exists": True,
                    "record": str(r),
                    "valid": validate_spf(str(r))
                }
        return {"exists": False, "valid": False}
    except:
        return {"exists": False, "valid": False}

def check_dkim(domain, selectors=['default', 'google', 'selector1']):
    for selector in selectors:
        try:
            record = dns.resolver.resolve(f"{selector}._domainkey.{domain}", 'TXT')
            return {
                "exists": True,
                "record": str(record[0]),
                "selector": selector,
                "valid": validate_dkim(str(record[0]))
            }
        except:
            continue
    return {"exists": False, "valid": False}

def check_dmarc(domain):
    try:
        record = dns.resolver.resolve(f"_dmarc.{domain}", 'TXT')
        return {
            "exists": True,
            "record": str(record[0]),
            "valid": validate_dmarc(str(record[0]))
        }
    except:
        return {"exists": False, "valid": False}

def validate_spf(record):
    return 'v=spf1' in record and '-all' in record

def validate_dkim(record):
    return 'v=DKIM1' in record and 'k=rsa' in record

def validate_dmarc(record):
    return 'v=DMARC1' in record and ('p=quarantine' in record or 'p=reject' in record)

def generate_recommendations(spf, dkim, dmarc):
    recommendations = []
    if not spf['valid']:
        recommendations.append("Add or correct SPF record (should end with -all)")
    if not dkim['valid']:
        recommendations.append("Configure valid DKIM record with RSA key")
    if not dmarc['valid']:
        recommendations.append("Add DMARC record with p=quarantine or p=reject")
    
    return " ".join(recommendations) if recommendations else "All records are properly configured"
