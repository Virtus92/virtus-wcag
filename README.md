# WCAG 2.2 AA Accessibility Auditor

<div align="center">

![Virtus Umbra](https://img.shields.io/badge/Virtus_Umbra-a855f7?style=for-the-badge)
![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2_AA-10b981?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3b82f6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-success?style=for-the-badge&logo=node.js)

**Professionelle Barrierefreiheits-Prüfung mit automatischem Crawling und Enterprise PDF-Reports**

[Features](#-features) • [Installation](#-installation) • [API](#-api) • [Konfiguration](#-konfiguration) • [Deployment](#-production-deployment)

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
PORT=3000                          # Server Port
NODE_ENV=development               # development | production
MAX_PAGES_PER_SCAN=50             # Maximale Seiten pro Scan
RATE_LIMIT_WINDOW_MS=900000       # Rate Limit Zeitfenster (15min)
RATE_LIMIT_MAX_REQUESTS=10        # Max Requests pro Zeitfenster
```

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

- **Backend**: Node.js + TypeScript + Express
- **Testing**: Playwright + axe-core
- **PDF**: PDFKit
- **Security**: Helmet, express-rate-limit, Zod
- **Frontend**: Vanilla HTML/CSS/JS (keine Dependencies)

## 📁 Projektstruktur

```
.
├── src/
│   ├── server.ts              # Express Server
│   ├── crawler.ts             # Web Crawler
│   ├── auditor.ts             # WCAG Auditor
│   ├── pdf-generator.ts       # PDF Generator
│   ├── types.ts               # TypeScript Typen
│   └── utils/
│       └── validation.ts      # Input Validation
├── public/
│   └── index.html             # Web Interface
├── reports/                   # Generierte PDFs (nicht versioniert)
├── package.json
├── tsconfig.json
└── Dockerfile
```

## 🧪 Testing

```bash
# Tests ausführen (wenn vorhanden)
npm test

# Manueller Test
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxPages":5}'
```

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
    server_name audit.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

- [ ] Authentifizierung für geschützte Bereiche
- [ ] Scheduled Scans
- [ ] Vergleich von Scan-Ergebnissen
- [ ] REST API mit API-Keys
- [ ] Webhook-Benachrichtigungen
- [ ] Multi-Tenant Support

## 📞 Support

Bei Fragen oder Problemen:
- Issue erstellen auf GitHub
- Dokumentation prüfen
- Logs checken (`docker logs` oder Console)

---

<div align="center">

**Entwickelt mit 💜 von [Virtus Umbra](https://virtus-umbra.ai)**

100% Open Source • DSGVO-konform • Made with TypeScript

</div>
