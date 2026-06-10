"""
Real threat-intelligence enrichment for indicators (IP / domain / hash).

Uses real public reputation services:
  - ip-api.com  — geolocation, ASN/ISP, hosting/proxy flags (free, no key)
  - AbuseIPDB   — abuse confidence score (if ABUSEIPDB_API_KEY set)
  - VirusTotal  — IP/domain/file reputation (if VT_API_KEY set)

If an optional service has no key, that source is reported as unavailable rather
than fabricated.
"""
from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


class ThreatIntel:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._http = httpx.AsyncClient(timeout=15.0)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def enrich(self, indicator: str, indicator_type: str) -> dict[str, Any]:
        t = (indicator_type or "").lower()
        if t in ("ip", "ipv4", "ipv6"):
            return await self._enrich_ip(indicator)
        if t in ("domain", "fqdn", "host", "url"):
            return await self._enrich_domain(indicator)
        if t in ("hash", "md5", "sha1", "sha256", "file"):
            return await self._enrich_hash(indicator)
        return {"indicator": indicator, "type": indicator_type, "note": "unsupported indicator type"}

    async def _get_json(self, url: str, **kw: Any) -> dict[str, Any] | None:
        try:
            resp = await self._http.get(url, **kw)
            if resp.status_code == 200:
                return resp.json()
            return {"_http_status": resp.status_code}
        except Exception as exc:  # network/parse errors shouldn't crash the agent
            return {"_error": str(exc)}

    async def _enrich_ip(self, ip: str) -> dict[str, Any]:
        out: dict[str, Any] = {"indicator": ip, "type": "ip", "sources": {}}

        geo = await self._get_json(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,message,country,regionName,city,isp,org,as,asname,hosting,proxy,mobile,query"},
        )
        if geo and geo.get("status") == "success":
            out["sources"]["ip-api"] = {
                "country": geo.get("country"),
                "city": geo.get("city"),
                "isp": geo.get("isp"),
                "org": geo.get("org"),
                "asn": geo.get("as"),
                "asname": geo.get("asname"),
                "hosting": geo.get("hosting"),
                "proxy": geo.get("proxy"),
                "mobile": geo.get("mobile"),
            }
        elif geo:
            out["sources"]["ip-api"] = {"unavailable": geo.get("message") or geo}

        if self.settings.abuseipdb_api_key:
            ab = await self._get_json(
                "https://api.abuseipdb.com/api/v2/check",
                headers={"Key": self.settings.abuseipdb_api_key, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90},
            )
            data = (ab or {}).get("data") if isinstance(ab, dict) else None
            if data:
                out["sources"]["abuseipdb"] = {
                    "abuse_confidence_score": data.get("abuseConfidenceScore"),
                    "total_reports": data.get("totalReports"),
                    "country_code": data.get("countryCode"),
                    "is_tor": data.get("isTor"),
                    "usage_type": data.get("usageType"),
                }
        else:
            out["sources"]["abuseipdb"] = {"unavailable": "ABUSEIPDB_API_KEY not set"}

        if self.settings.vt_api_key:
            out["sources"]["virustotal"] = await self._vt(f"ip_addresses/{ip}")
        else:
            out["sources"]["virustotal"] = {"unavailable": "VT_API_KEY not set"}

        out["summary"] = self._summarize_ip(out["sources"])
        return out

    async def _enrich_domain(self, domain: str) -> dict[str, Any]:
        domain = domain.replace("http://", "").replace("https://", "").split("/")[0]
        out: dict[str, Any] = {"indicator": domain, "type": "domain", "sources": {}}
        if self.settings.vt_api_key:
            out["sources"]["virustotal"] = await self._vt(f"domains/{domain}")
        else:
            out["sources"]["virustotal"] = {"unavailable": "VT_API_KEY not set"}
        return out

    async def _enrich_hash(self, file_hash: str) -> dict[str, Any]:
        out: dict[str, Any] = {"indicator": file_hash, "type": "hash", "sources": {}}
        if self.settings.vt_api_key:
            out["sources"]["virustotal"] = await self._vt(f"files/{file_hash}")
        else:
            out["sources"]["virustotal"] = {"unavailable": "VT_API_KEY not set"}
        return out

    async def _vt(self, path: str) -> dict[str, Any]:
        data = await self._get_json(
            f"https://www.virustotal.com/api/v3/{path}",
            headers={"x-apikey": self.settings.vt_api_key},
        )
        attrs = ((data or {}).get("data") or {}).get("attributes") if isinstance(data, dict) else None
        if not attrs:
            return {"unavailable": (data or {}).get("_error") or (data or {}).get("_http_status") or "no data"}
        stats = attrs.get("last_analysis_stats", {})
        return {
            "malicious": stats.get("malicious"),
            "suspicious": stats.get("suspicious"),
            "harmless": stats.get("harmless"),
            "reputation": attrs.get("reputation"),
        }

    @staticmethod
    def _summarize_ip(sources: dict[str, Any]) -> str:
        bits = []
        ipapi = sources.get("ip-api") or {}
        if isinstance(ipapi, dict) and ipapi.get("country"):
            loc = f"{ipapi.get('city') or '?'}, {ipapi.get('country')}"
            org = ipapi.get("asname") or ipapi.get("org") or ipapi.get("isp")
            bits.append(f"{loc} ({org})")
            flags = [k for k in ("hosting", "proxy", "mobile") if ipapi.get(k)]
            if flags:
                bits.append("flags: " + ",".join(flags))
        ab = sources.get("abuseipdb") or {}
        if isinstance(ab, dict) and ab.get("abuse_confidence_score") is not None:
            bits.append(f"AbuseIPDB score {ab['abuse_confidence_score']}/100 ({ab.get('total_reports')} reports)")
        vt = sources.get("virustotal") or {}
        if isinstance(vt, dict) and vt.get("malicious") is not None:
            bits.append(f"VT {vt['malicious']} malicious")
        return "; ".join(bits) if bits else "no reputation data available"
