"use strict";
/**
 * Suspicious / malicious QR code detector
 * Pure regex / pattern-based — no external API calls required
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeQRCode = analyzeQRCode;
// ── Known URL shorteners ──────────────────────────────────────────────────────
const URL_SHORTENERS = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.io',
    'rb.gy', 'cutt.ly', 'is.gd', 'buff.ly', 'tiny.cc', 'lnkd.in',
    'dlvr.it', 'snip.ly', 'adf.ly', 'shorte.st', 'bc.vc', 'po.st',
    'x.co', 'v.gd', 'qr.ae', 'smarturl.it', 'mcaf.ee', 't2m.io',
]);
// ── Suspicious TLDs ───────────────────────────────────────────────────────────
const SUSPICIOUS_TLDS = new Set([
    'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'work', 'click',
    'download', 'online', 'site', 'website', 'space', 'fun', 'live',
    'stream', 'cam', 'su', 'cc', 'pw', 'bid', 'trade',
]);
// ── Known phishing / suspicious keywords (in URL path or host) ───────────────
const PHISHING_KEYWORDS = [
    'login', 'signin', 'sign-in', 'log-in', 'secure', 'verify',
    'account', 'update', 'confirm', 'bank', 'paypal', 'password',
    'credential', 'authenticate', 'wallet', 'suspended', 'unlock',
    'recover', 'reset-password', 'phish', 'ebay', 'amazon-verify',
    'apple-id', 'google-security', 'microsoft-verify', 'support-alert',
];
// ── Regex helpers ─────────────────────────────────────────────────────────────
const RE_IP_URL = /^https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i;
const RE_NON_ASCII = /[^\x00-\x7F]/;
const RE_BASE64_URL = /[?&=][A-Za-z0-9+/]{40,}={0,2}(?:&|$)/;
const RE_MANY_SLASH = /(?:https?:\/\/[^/]+)(\/[^/]+){6,}/i;
const RE_AT_IN_URL = /https?:\/\/[^@]*@/i;
function extractHostname(input) {
    try {
        const url = new URL(input);
        return url.hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
function getTLD(hostname) {
    const parts = hostname.replace(/^www\./, '').split('.');
    return parts[parts.length - 1] ?? '';
}
function analyzeQRCode(data) {
    const reasons = [];
    let score = 0;
    const isURL = /^https?:\/\//i.test(data);
    // ── 1. Non-URL suspicious content ─────────────────────────────────────────
    if (!isURL) {
        // Check for embedded URLs inside text / deep-links
        const embeddedURL = data.match(/https?:\/\/\S+/i)?.[0];
        if (!embeddedURL) {
            return { isSuspicious: false, riskLevel: 'safe', reasons: [], riskScore: 0 };
        }
        // Re-analyse the embedded URL portion
        return analyzeQRCode(embeddedURL);
    }
    const hostname = extractHostname(data);
    if (!hostname) {
        return { isSuspicious: false, riskLevel: 'safe', reasons: [], riskScore: 0 };
    }
    const tld = getTLD(hostname);
    const fullLower = data.toLowerCase();
    // ── 2. IP address as host ──────────────────────────────────────────────────
    if (RE_IP_URL.test(data)) {
        reasons.push('URL uses IP address instead of domain name');
        score += 40;
    }
    // ── 3. URL shortener ──────────────────────────────────────────────────────
    if (URL_SHORTENERS.has(hostname)) {
        reasons.push(`URL shortener detected (${hostname}) — final destination unknown`);
        score += 25;
    }
    // ── 4. Suspicious TLD ─────────────────────────────────────────────────────
    if (SUSPICIOUS_TLDS.has(tld)) {
        reasons.push(`Suspicious top-level domain: .${tld}`);
        score += 20;
    }
    // ── 5. Phishing keywords in URL ───────────────────────────────────────────
    const foundKeywords = PHISHING_KEYWORDS.filter((kw) => fullLower.includes(kw));
    if (foundKeywords.length > 0) {
        reasons.push(`Suspicious keywords in URL: ${foundKeywords.slice(0, 3).join(', ')}`);
        score += Math.min(35, foundKeywords.length * 12);
    }
    // ── 6. Non-ASCII characters in domain (homograph attack) ──────────────────
    if (RE_NON_ASCII.test(hostname)) {
        reasons.push('Non-ASCII characters in domain (possible homograph / IDN attack)');
        score += 35;
    }
    // ── 7. @ in URL (credential injection attempt) ────────────────────────────
    if (RE_AT_IN_URL.test(data)) {
        reasons.push('URL contains @ symbol (potential credential injection)');
        score += 30;
    }
    // ── 8. Excessive path depth ───────────────────────────────────────────────
    if (RE_MANY_SLASH.test(data)) {
        reasons.push('URL has unusually deep path structure');
        score += 10;
    }
    // ── 9. Very long URL ──────────────────────────────────────────────────────
    if (data.length > 500) {
        reasons.push(`Unusually long URL (${data.length} characters)`);
        score += 15;
    }
    // ── 10. Base64 data embedded in URL ───────────────────────────────────────
    if (RE_BASE64_URL.test(data)) {
        reasons.push('Base64-encoded data detected in URL parameters');
        score += 20;
    }
    // ── 11. Multiple subdomains (domain spoofing) ─────────────────────────────
    const subdomainCount = hostname.split('.').length - 2;
    if (subdomainCount >= 3) {
        reasons.push(`Many subdomains detected (${subdomainCount}) — possible domain spoofing`);
        score += 15;
    }
    // ── 12. HTTP (not HTTPS) ──────────────────────────────────────────────────
    if (/^http:\/\//i.test(data)) {
        reasons.push('Unencrypted HTTP connection');
        score += 10;
    }
    // ── Clamp score ───────────────────────────────────────────────────────────
    score = Math.min(100, score);
    const isSuspicious = score >= 20;
    let riskLevel;
    if (score < 20)
        riskLevel = 'safe';
    else if (score < 35)
        riskLevel = 'low';
    else if (score < 55)
        riskLevel = 'medium';
    else if (score < 75)
        riskLevel = 'high';
    else
        riskLevel = 'critical';
    return { isSuspicious, riskLevel, reasons, riskScore: score };
}
