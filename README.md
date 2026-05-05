# WCAG 2.2 AA Accessibility Auditor

<div align="center">

![Virtus Umbra](https://img.shields.io/badge/Virtus_Umbra-a855f7?style=for-the-badge)
![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2_AA-10b981?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3b82f6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-success?style=for-the-badge&logo=node.js)

**Professionelle Barrierefreiheits-Prüfung mit automatischem Crawling und Enterprise PDF-Reports**

[Features](#-features) • [Installation](#-installation--start) • [Konfiguration](#-konfiguration) • [Testing](#-testing) • [Docker](#-docker-details)

</div>

---

## 🎯 Features

- **Automatisches Crawling**: Findet und analysiert alle Unterseiten einer Domain
- **WCAG 2.2 AA Compliance**: Vollständige Konformitätsprüfung nach aktuellstem Standard
- **PDF-Reports**: Professionelle, übersichtliche Berichte mit Handlungsempfehlungen
- **Sicherheit & Datenschutz**: 100% lokal, DSGVO-konform, keine Cloud-Dienste
- **Open Source**: Vollständig transparent und erweiterbar

## 🔒 Sicherheit & Compliance

### DSGVO-Konformität
- ✅ **Keine Datenpersistenz**: Berichte werden temporär generiert und können gelöscht werden
- ✅ **Lokal ausführbar**: Keine Daten verlassen das System
- ✅ **Keine Third-Party Services**: Alle Komponenten Open Source
- ✅ **Input Sanitization**: Schutz gegen Injection-Angriffe

### Sicherheitsmaßnahmen
- **Helmet.js**: HTTP-Header-Sicherheit (CSP, X-Frame-Options, etc.)
- **Rate Limiting**: Schutz gegen DoS-Angriffe (10 Requests/15min)
- **Input Validation**: Strenge Validierung mit Zod-Schema
- **URL Sanitization**: Nur HTTP/HTTPS erlaubt, keine file:// oder javascript: URLs
- **CORS**: Konfigurierbare Cross-Origin-Policies
- **Error Handling**: Keine sensiblen Daten in Error Messages

### Regierungstauglichkeit
- ✅ **Open Source Stack**: Alle Dependencies sind quelloffen
- ✅ **Keine Vendor Lock-in**: Unabhängig von Cloud-Anbietern
- ✅ **On-Premise Deployment**: Vollständig lokal betreibbar
- ✅ **Audit-Trail**: Vollständige Nachvollziehbarkeit der Prüfungen
- ✅ **Standard-Konformität**: WCAG 2.2 AA nach W3C-Standard

## 📋 Voraussetzungen

- Node.js 18+ oder Docker
- 2GB RAM (empfohlen)
- Chromium/Chrome (wird automatisch von Playwright installiert)

## 🚀 Installation & Start

### Methode 1: npm (Entwicklung)

```bash
# Dependencies installieren
npm install

# Playwright Browser installieren
npx playwright install chromium

# .env erstellen
cp .env.example .env

# Development Server starten
npm run dev
```

### Methode 2: Docker (Production-Ready)

```bash
# Image bauen
docker build -t wcag-audit-tool .

# Container starten
docker run -p 3000:3000 -v $(pwd)/reports:/app/reports wcag-audit-tool
```

### Methode 3: Production Build

```bash
# Build erstellen
npm run build

# Production starten
npm start
```

## 🎨 Nutzung

1. Browser öffnen: `http://localhost:3000`
2. Website-URL eingeben
3. Optionale Einstellungen:
   - Maximale Seitenanzahl (1-100)
   - Externe Links folgen (ja/nein)
4. "Audit starten" klicken
5. PDF-Report herunterladen

## 📊 Report-Inhalte

Der generierte PDF-Report enthält:

- **Executive Summary**: Überblick über alle Findings
- **Statistiken**: Anzahl und Schweregrad der Verstöße
- **Detaillierte Findings**: Alle Probleme pro Seite
- **Prioritätsempfehlungen**: Was zuerst behoben werden sollte
- **WCAG-Referenzen**: Links zur offiziellen Dokumentation

### Schweregrade

- 🔴 **Critical**: Verhindert Nutzung für behinderte Menschen
- 🟠 **Serious**: Erhebliche Beeinträchtigung der Nutzung
- 🟡 **Moderate**: Mäßige Beeinträchtigung
- 🔵 **Minor**: Kleine Probleme mit geringer Auswirkung

## 🔧 Konfiguration

### Environment Variables (.env)

```env
# Server
PORT=3000
NODE_ENV=development               # development | production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000       # 15 Minuten
RATE_LIMIT_MAX_REQUESTS=10        # Max Requests pro IP

# Audit Configuration
MAX_PAGES_DEFAULT=50              # Standard Seitenlimit
MAX_PAGES_LIMIT=100               # Absolutes Maximum
CRAWL_TIMEOUT_MS=45000            # Navigation Timeout
AUDIT_CONCURRENCY=3               # Parallele Audits
CONTENT_WAIT_MS=2000              # Wartezeit für dynamischen Content
CRAWL_MAX_DEPTH=4                 # Maximale Crawl-Tiefe
CRAWL_MAX_TIME_MS=120000          # Gesamtes Crawl-Zeitbudget

# Logging
LOG_LEVEL=info                    # debug | info | warn | error
LOG_CONSOLE=true                  # Console Logging aktiviert
LOG_JSON=false                    # JSON Format für Logs

# Job Management
JOB_CLEANUP_INTERVAL_MS=600000    # Cleanup alle 10 Min
JOB_MAX_AGE_MS=3600000            # Max Job-Alter (1 Stunde)
```

Vollständige Konfiguration siehe `.env.example`

## 🏗️ Architektur

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────────────┐
│  Express Server     │
│  - Helmet Security  │
│  - Rate Limiting    │
│  - Input Validation │
└──────┬──────────────┘
       │
   ┌───▼────┐  ┌──────────┐  ┌──────────┐
   │Crawler │─▶│ Auditor  │─▶│PDF Gen   │
   │        │  │(axe-core)│  │(PDFKit)  │
   └────────┘  └──────────┘  └──────────┘
```

### Tech Stack

- **Backend**: Node.js + TypeScript + Express + Socket.IO
- **Testing**: Vitest + Playwright + axe-core
- **PDF**: PDFKit (Executive & Professional Reports)
- **Security**: Helmet, express-rate-limit, Zod
- **Frontend**: Vanilla HTML/CSS/JS (keine Dependencies)
- **DevOps**: Docker + Docker Compose + GitHub Actions

## 📁 Projektstruktur

```
.
├── src/
│   ├── server.ts                      # Express Server + Socket.IO
│   ├── crawler.ts                     # Web Crawler (Playwright)
│   ├── auditor.ts                     # WCAG Auditor (Basic)
│   ├── auditor-enhanced.ts            # Enhanced WCAG Auditor
│   ├── pdf-generator-executive.ts     # Executive PDF Reports
│   ├── pdf-generator-pro.ts           # Professional PDF Reports
│   ├── config.ts                      # Configuration Management
│   ├── types.ts                       # TypeScript Definitions
│   └── utils/
│       ├── validation.ts              # Input Validation (Zod)
│       ├── logger.ts                  # Logging Utilities
│       ├── url.ts                     # URL Processing
│       └── stability.ts               # Stability Utilities
├── tests/                             # Vitest Test Suite
├── public/
│   └── index.html                     # Web Interface
├── reports/                           # Generated PDFs (gitignored)
├── .github/workflows/                 # CI/CD Pipelines
├── SECURITY.md                        # Security Documentation
├── docker-compose.yml                 # Docker Compose Config
├── Dockerfile                         # Production Container
├── vitest.config.ts                   # Vitest Configuration
├── tsconfig.json                      # TypeScript Config (App)
├── tsconfig.tests.json                # TypeScript Config (Tests)
└── package.json
```

## 🧪 Testing

```bash
# Unit & Integration Tests
npm test                    # Vitest watch mode
npm run test:ci            # CI mode with coverage
npm run coverage           # Generate coverage report

# Type Checking
npm run typecheck          # Check all TypeScript types

# Manual API Test
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxPages":5}'
```

## 🔄 CI/CD

GitHub Actions Pipelines automatisieren:
- **Type Checking**: TypeScript Typenprüfung
- **Unit Tests**: Vitest mit Coverage-Reporting
- **Integration Tests**: End-to-End Validierung
- **Build Verification**: Production Build Testing
- **Security Scanning**: Dependency Audit

Workflows siehe `.github/workflows/`

## 🐳 Docker Details

Das Dockerfile verwendet:
- Multi-stage Build für kleine Image-Größe
- Playwright Chromium
- Non-root User für Security
- Volume für Reports

```bash
# Mit Volume für Reports
docker run -p 3000:3000 -v $(pwd)/reports:/app/reports wcag-audit-tool

# Mit Environment Variables
docker run -p 3000:3000 -e MAX_PAGES_PER_SCAN=100 wcag-audit-tool
```

## 🔐 Best Practices

### Für Production Deployment

1. **HTTPS verwenden**: Reverse Proxy (nginx/Caddy) mit SSL
2. **Rate Limits anpassen**: Je nach erwarteter Last
3. **Reports cleanup**: Cronjob für alte PDFs einrichten
4. **Monitoring**: Logs überwachen, Error Tracking einrichten
5. **Firewall**: Nur notwendige Ports öffnen
6. **Updates**: Dependencies regelmäßig aktualisieren

### Beispiel nginx-Konfiguration

```nginx
server {
    listen 443 ssl http2;
    server_name audit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/audit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 Lizenz

MIT License - Frei verwendbar für kommerzielle und nicht-kommerzielle Projekte.

## 🤝 Beitragen

Contributions sind willkommen! Bitte:
1. Fork erstellen
2. Feature Branch erstellen
3. Tests hinzufügen
4. Pull Request erstellen

## ⚠️ Limitierungen

- Crawling beschränkt auf HTTP/HTTPS
- Keine JavaScript-Heavy SPAs (React/Vue/Angular) ohne SSR
- Maximal 100 Seiten pro Scan (konfigurierbar)
- Kein Login-geschützter Bereich (noch nicht)

## 🔮 Roadmap

### ✅ Implementiert
- [x] Vitest Testing Framework
- [x] CI/CD mit GitHub Actions
- [x] Executive PDF Reports
- [x] Enhanced WCAG Auditor
- [x] Socket.IO Realtime Updates
- [x] Comprehensive Logging

### 🚧 Geplant
- [ ] Authentifizierung für geschützte Bereiche
- [ ] Scheduled Scans & Cron Jobs
- [ ] Vergleich von Scan-Ergebnissen (Diff)
- [ ] REST API mit API-Keys
- [ ] Webhook-Benachrichtigungen
- [ ] Multi-Tenant Support
- [ ] Grafische Trend-Analysen
- [ ] Custom WCAG Rule Sets

## 📞 Support

Bei Fragen oder Problemen:
- **GitHub Issues**: Erstelle ein Issue im Repository
- **Email**: info@dinel.at
- **Dokumentation**: Siehe README.md und SECURITY.md
- **Logs**: `docker logs <container>` oder Console Output prüfen

---

<div align="center">

**Entwickelt von [Dinel Kurtovic](https://virtus-umbra.ai) | Virtus Umbra**

100% Open Source • DSGVO-konform • Made with TypeScript

</div>
