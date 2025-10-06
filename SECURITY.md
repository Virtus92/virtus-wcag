# Sicherheitsdokumentation

## Übersicht

Dieses Dokument beschreibt die Sicherheitsmaßnahmen und Best Practices für das WCAG Audit Tool.

## 🔒 Implementierte Sicherheitsmaßnahmen

### 1. Input Validation & Sanitization

**Maßnahmen:**
- Zod-Schema für strikte Type Validation
- URL-Sanitization (nur HTTP/HTTPS erlaubt)
- Regex-Validation für Dateinamen
- Normalisierung von URLs gegen Injection

**Code-Referenzen:**
- `src/utils/validation.ts` - Zentrale Validierungslogik
- `src/server.ts:68-70` - Request-Validierung

### 2. HTTP Security Headers (Helmet)

**Aktivierte Features:**
```javascript
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- X-XSS-Protection
```

**Schutz gegen:**
- XSS (Cross-Site Scripting)
- Clickjacking
- MIME-Type Sniffing
- Man-in-the-Middle Angriffe

### 3. Rate Limiting

**Konfiguration:**
- 10 Requests pro 15 Minuten pro IP
- Konfigurierbar über Environment Variables
- Standard-Headers für Client-Information

**Schutz gegen:**
- DoS (Denial of Service)
- Brute-Force Angriffe
- Resource Exhaustion

### 4. CORS (Cross-Origin Resource Sharing)

**Konfiguration:**
- Konfigurierbare Origin-Policies
- Pre-flight Request Handling
- Credential Control

### 5. Error Handling

**Best Practices:**
- Keine Stack Traces in Production
- Keine sensiblen Daten in Error Messages
- Strukturiertes Error Logging
- Graceful Degradation

### 6. Process Security

**Maßnahmen:**
- Graceful Shutdown (SIGTERM/SIGINT)
- Resource Cleanup bei Fehler
- Browser-Instanzen werden geschlossen
- Keine Zombie-Prozesse

### 7. Docker Security

**Implementiert:**
- Non-root User (nodejs:1001)
- Minimal Alpine Image
- Multi-stage Build (kleinere Attack Surface)
- Read-only Filesystem (wo möglich)
- Dropped Capabilities (ALL)
- Security Options (no-new-privileges)
- Health Checks

## 🛡️ DSGVO & Datenschutz

### Datenminimierung
- Keine persistente Speicherung von Nutzerdaten
- Reports werden temporär generiert
- Keine Logging von personenbezogenen Daten
- Keine Third-Party Analytics

### Datensparsamkeit
- Nur notwendige Daten werden verarbeitet
- URL und technische Metadaten
- Keine Cookies oder Session Storage
- Keine User Tracking

### Transparenz
- Open Source Code
- Dokumentierte Datenflüsse
- Klare Zweckbindung
- Keine versteckten Features

### Betroffenenrechte
- Recht auf Löschung: Reports können gelöscht werden
- Recht auf Auskunft: Alle Daten sind im Report sichtbar
- Recht auf Datenportabilität: PDF-Format ist portabel

## 🚨 Bekannte Limitierungen

### 1. Client-Side Attacks
- **CSRF**: Nicht relevant (keine Sessions/Cookies)
- **XSS**: CSP aktiv, aber client-seitige Validation wichtig

### 2. Resource Limits
- Max 100 Seiten pro Scan
- Timeout nach 30 Sekunden pro Seite
- Memory-Limits sollten auf Server-Ebene gesetzt werden

### 3. Network Security
- HTTPS sollte durch Reverse Proxy bereitgestellt werden
- Firewall-Regeln sind außerhalb des Scopes

## 🔐 Best Practices für Production

### 1. Reverse Proxy Setup

**nginx Beispiel:**
```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=audit:10m rate=1r/s;

server {
    listen 443 ssl http2;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        limit_req zone=audit burst=5;
        proxy_pass http://localhost:3000;
    }
}
```

### 2. Environment Variables

**Nie committen:**
```bash
# .env sollte immer in .gitignore sein
.env
*.env
```

**Production Values:**
```env
NODE_ENV=production
RATE_LIMIT_MAX_REQUESTS=5  # Strenger in Production
RATE_LIMIT_WINDOW_MS=600000  # 10 Minuten
MAX_PAGES_PER_SCAN=20  # Konservativer Limit
```

### 3. Monitoring & Logging

**Empfohlen:**
- Winston oder Pino für strukturiertes Logging
- Error Tracking (Sentry)
- Uptime Monitoring
- Resource Monitoring (CPU/Memory)

### 4. Updates & Patches

**Workflow:**
```bash
# Security Audit
npm audit

# Dependency Updates
npm update

# Check for outdated packages
npm outdated
```

### 5. Firewall Regeln

**iptables Beispiel:**
```bash
# Nur Port 3000 von localhost
iptables -A INPUT -p tcp -s 127.0.0.1 --dport 3000 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

## 🔍 Security Checklist

### Deployment
- [ ] HTTPS aktiviert (Reverse Proxy)
- [ ] Environment Variables gesetzt
- [ ] Rate Limits konfiguriert
- [ ] Firewall-Regeln aktiv
- [ ] Non-root User im Container
- [ ] Health Checks aktiviert
- [ ] Monitoring eingerichtet
- [ ] Backup-Strategie definiert

### Code
- [ ] Input Validation aktiv
- [ ] Error Handling implementiert
- [ ] Keine Secrets im Code
- [ ] Dependencies aktuell
- [ ] Security Headers gesetzt
- [ ] CORS konfiguriert

### Betrieb
- [ ] Log-Rotation eingerichtet
- [ ] Alte Reports werden gelöscht
- [ ] Security Updates regelmäßig
- [ ] Incident Response Plan vorhanden

## 📞 Security Issues Melden

**Verantwortungsvolle Offenlegung:**

1. **Keine öffentlichen Issues** für Sicherheitslücken
2. **Email an**: security@example.com
3. **Beschreibung**: Detaillierte Reproduktionsschritte
4. **Response Time**: 48 Stunden

**Folgende Informationen bereitstellen:**
- Beschreibung der Schwachstelle
- Betroffene Komponenten/Versionen
- Proof of Concept (wenn möglich)
- Vorgeschlagene Lösung (optional)

## 🔄 Update Historie

### Version 1.0.0 (Initial Release)
- ✅ Helmet Security Headers
- ✅ Rate Limiting
- ✅ Input Validation mit Zod
- ✅ Docker Security Hardening
- ✅ CORS Protection
- ✅ Error Handling

### Geplante Verbesserungen
- [ ] API Keys für erweiterte Rate Limits
- [ ] Audit Logging
- [ ] Webhook Security (HMAC Signatures)
- [ ] OAuth2 Integration für geschützte Seiten

## 📚 Ressourcen

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [DSGVO Compliance](https://gdpr.eu/)

---

**Last Updated**: 2024
**Maintained by**: Virtus Umbra
