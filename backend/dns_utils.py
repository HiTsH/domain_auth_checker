import dns.resolver
import dns.exception
import smtplib
import socket
from typing import Dict, List, Set
import logging
import re

logger = logging.getLogger(__name__)

# --- SPF token regex (captures ip4:, ip6:, include:, redirect=, a, mx with optional domain) ---
SPF_TOKEN_RE = re.compile(
    r'(?P<token>(?:ip4:|ip6:|include:|redirect=|a(?::[^ \t\n\r;]+)?|mx(?::[^ \t\n\r;]+)?)[^ \t\n\r;]*)',
    re.IGNORECASE
)

COMMON_DKIM_SELECTORS = ['default', 'google', 'selector1', 'dkim', 'mail', 's1', 'smtp', 'amazonses', 'sendgrid']


def check_email_relay_config(domain: str) -> Dict:
    results = {
        "mx_records": [],
        "smtp_connectivity": False,
        "starttls_supported": False,
        "open_relay": False,
        "error": None
    }

    try:
        # MX Records
        mx_records = dns.resolver.resolve(domain, 'MX')
        results["mx_records"] = [str(mx.exchange) for mx in mx_records]

        # SMTP Tests
        if mx_records:
            mx_host = str(mx_records[0].exchange)
            try:
                # Set socket timeout (in seconds)
                socket.setdefaulttimeout(5)

                with smtplib.SMTP(mx_host, timeout=5) as server:
                    server.helo('example.com')
                    results["smtp_connectivity"] = True

                    try:
                        server.starttls()
                        results["starttls_supported"] = True
                    except (smtplib.SMTPNotSupportedError, smtplib.SMTPException):
                        pass

                    try:
                        server.mail('')
                        code, _ = server.rcpt('postmaster@example.com')
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
        answers = dns.resolver.resolve(domain, record_type, raise_on_no_answer=False)
        if not answers:
            return []
        # convert each rdata to str (TXT often returns object)
        return [b"".join(getattr(a, "strings", [str(a).encode()])).decode(errors="ignore")
                if record_type.upper() == "TXT" else str(a) for a in answers]
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return []
    except dns.resolver.Timeout:
        raise Exception(f"DNS query for {record_type} timed out")
    except Exception as e:
        raise Exception(f"DNS query failed: {str(e)}")


# --- helper DNS resolvers used for SPF expansion ---
def resolve_a_aaaa(domain: str) -> Set[str]:
    ips = set()
    for t in ("A", "AAAA"):
        try:
            answers = dns.resolver.resolve(domain, t, raise_on_no_answer=False)
            if answers:
                for r in answers:
                    # A and AAAA rdata have .address attribute in dnspython
                    addr = getattr(r, "address", None)
                    if addr:
                        ips.add(addr)
                    else:
                        ips.add(str(r))
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
            continue
        except Exception as e:
            logger.warning(f"resolve {domain} {t} -> {e}")
    return ips


def resolve_mx_hosts(domain: str) -> List[str]:
    hosts = []
    try:
        answers = dns.resolver.resolve(domain, "MX", raise_on_no_answer=False)
        if answers:
            for r in answers:
                exch = getattr(r, "exchange", None)
                if exch:
                    hosts.append(str(exch).rstrip('.'))
                else:
                    hosts.append(str(r))
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
        pass
    except Exception as e:
        logger.warning(f"MX query {domain} -> {e}")
    return hosts


# --- SPF expansion and extraction ---
def get_spf_txt_records(domain: str) -> List[str]:
    """Return TXT strings that look like spf records (start with v=spf1)."""
    txts = check_dns_record(domain, "TXT")
    spfs = [t for t in txts if t and t.lower().strip().startswith("v=spf1")]
    return spfs


def parse_spf_tokens(spf: str) -> List[str]:
    tokens = []
    for m in SPF_TOKEN_RE.finditer(spf):
        tokens.append(m.group("token").strip())
    return tokens


def expand_spf_ips(domain: str) -> Set[str]:
    """
    Recursively expand SPF includes and redirects for `domain`,
    collect ip4/ip6 tokens and resolve a/mx mechanisms to A/AAAA IPs.
    """
    collected_ips: Set[str] = set()
    visited_domains: Set[str] = set()
    visited_spf_records: Set[str] = set()

    def _expand(d: str):
        # prevent infinite recursion
        if d in visited_domains:
            return
        visited_domains.add(d)

        spf_records = get_spf_txt_records(d)
        if not spf_records:
            return

        for spf in spf_records:
            # avoid reprocessing identical SPF text
            if spf in visited_spf_records:
                continue
            visited_spf_records.add(spf)

            tokens = parse_spf_tokens(spf)
            for token in tokens:
                low = token.lower()
                if low.startswith("ip4:") or low.startswith("ip6:"):
                    # direct IP entry
                    _, ip = token.split(":", 1)
                    collected_ips.add(ip.strip())
                elif low.startswith("include:"):
                    _, inc = token.split(":", 1)
                    _expand(inc.strip())
                elif low.startswith("redirect="):
                    _, red = token.split("=", 1)
                    _expand(red.strip())
                elif low.startswith("a"):
                    # 'a' or 'a:domain'
                    if ":" in token:
                        _, ref = token.split(":", 1)
                        ref = ref.strip()
                    else:
                        ref = d
                    ips = resolve_a_aaaa(ref)
                    collected_ips.update(ips)
                elif low.startswith("mx"):
                    # 'mx' or 'mx:domain'
                    if ":" in token:
                        _, ref = token.split(":", 1)
                        ref = ref.strip()
                        mx_hosts = resolve_mx_hosts(ref)
                    else:
                        mx_hosts = resolve_mx_hosts(d)
                    for mxh in mx_hosts:
                        ips = resolve_a_aaaa(mxh)
                        collected_ips.update(ips)
                else:
                    # ignore other mechanisms (ptr, exists, all, etc.) for IP extraction
                    continue

    _expand(domain)
    return collected_ips


# --- DKIM discovery ---
def discover_all_dkim_selectors(domain: str, selectors: List[str] = None) -> List[Dict]:
    """
    Probe a list of selectors and return a list of found selector records.
    Returns list of dicts: {"selector": "<name>", "record": "<txt>"}
    Note: DNS does not provide a way to enumerate selectors; this probes common names.
    """
    found = []
    probelist = selectors if selectors else COMMON_DKIM_SELECTORS

    for sel in probelist:
        q = f"{sel}._domainkey.{domain}"
        try:
            txts = check_dns_record(q, "TXT")
            for txt in txts:
                if txt and 'v=DKIM1' in txt:
                    found.append({"selector": sel, "record": txt})
                    # do not break here — we want to collect multiple selectors
        except Exception as e:
            logger.warning(f"DKIM query failed for {q}: {e}")
            continue

    return found


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
        # --- SPF Check: support multiple SPF txts and recursive includes ---
        spf_records = get_spf_txt_records(domain)
        spf_valid_flag = False
        spf_record_example = None

        if spf_records:
            results["checks"]["spf"]["exists"] = True
            # keep first record for backward compat display
            spf_record_example = spf_records[0]
            # check if any has -all or ~all
            spf_valid_flag = any(('-all' in rec or '~all' in rec) for rec in spf_records)

        # expand spf to IPs
        spf_ips = expand_spf_ips(domain)
        results["checks"]["spf"].update({
            "record": spf_record_example,
            "valid": spf_valid_flag,
            "ips": sorted(spf_ips)  # consistent ordering for output
        })

        # --- DKIM Check: probe common selectors and return all found ---
        selectors_to_probe = ['default', 'google', 'selector1', 'dkim']  # existing probe list kept
        # Optionally extend with more common selectors
        selectors_to_probe = list(dict.fromkeys(selectors_to_probe + COMMON_DKIM_SELECTORS))

        found_selectors = discover_all_dkim_selectors(domain, selectors_to_probe)
        if found_selectors:
            # mark exists
            results["checks"]["dkim"]["exists"] = True
            # valid if at least one DKIM with v=DKIM1 and k=rsa is present
            is_valid = any(('v=DKIM1' in item["record"] and 'k=rsa' in item["record"].lower()) or ('v=DKIM1' in item["record"]) for item in found_selectors)
            # store all selectors as requested, in the format "selector: <name>"
            selectors_list = [f"selector: {item['selector']}" for item in found_selectors]
            results["checks"]["dkim"].update({
                "record": found_selectors[0]["record"],
                "valid": is_valid,
                "selectors": selectors_list,
                # keep legacy 'selector' field for frontend compatibility (first one)
                "selector": found_selectors[0]["selector"]
            })

        # --- DMARC Check ---
        dmarc_txts = check_dns_record(f"_dmarc.{domain}", 'TXT')
        for rec in dmarc_txts:
            if rec and 'v=DMARC1' in rec:
                results["checks"]["dmarc"] = {
                    "exists": True,
                    "record": rec,
                    "valid": ('p=quarantine' in rec or 'p=reject' in rec)
                }
                break

        # --- Generate summary ---
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
