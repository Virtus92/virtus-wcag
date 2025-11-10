# WCAG Audit Tool - API Dokumentation

## Übersicht

Diese API ermöglicht die automatisierte Barrierefreiheitsprüfung von Websites nach WCAG 2.2 AA Standard. Die API verwendet einen asynchronen Job-basierten Ansatz mit WebSocket-Unterstützung für Echtzeit-Updates.

**Base URL**: `http://localhost:3000/api`

**Version**: 1.0.0

**Architektur**: REST API + WebSocket (Socket.IO)

---

## Inhaltsverzeichnis

1. [Authentifizierung](#authentifizierung)
2. [Rate Limiting](#rate-limiting)
3. [HTTP Endpunkte](#http-endpunkte)
4. [WebSocket Events](#websocket-events)
5. [Datenmodelle](#datenmodelle)
6. [Fehlerbehandlung](#fehlerbehandlung)
7. [Code-Beispiele](#code-beispiele)

---

## Authentifizierung

**Aktueller Status**: Keine Authentifizierung erforderlich

Die API ist derzeit ohne Authentifizierung zugänglich. Für Production-Umgebungen wird empfohlen:
- API-Key Authentifizierung mittels Header `X-API-Key`
- OAuth 2.0 / JWT für Multi-Tenant Support
- IP-Whitelisting für geschützte Netzwerke

---

## Rate Limiting

**Konfiguration** (anpassbar via `.env`):

```
Zeitfenster: 15 Minuten (RATE_LIMIT_WINDOW_MS=900000)
Max Requests: 10 pro IP (RATE_LIMIT_MAX_REQUESTS=10)
```

**Anwendungsbereich**: Alle `/api/*` Endpunkte

**Response bei Überschreitung**:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```
**HTTP Status**: `429 Too Many Requests`

**Headers**:
- `RateLimit-Limit`: Maximale Anzahl Requests
- `RateLimit-Remaining`: Verbleibende Requests
- `RateLimit-Reset`: Zeitpunkt des Reset (Unix Timestamp)

---

## HTTP Endpunkte

### 1. Health Check

**Endpoint**: `GET /api/health`

**Beschreibung**: Prüft ob der Service verfügbar ist.

**Request**: Keine Parameter erforderlich

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Status Codes**:
- `200 OK`: Service ist verfügbar

**Beispiel**:
```bash
curl http://localhost:3000/api/health
```

---

### 2. Audit starten

**Endpoint**: `POST /api/audit`

**Beschreibung**: Startet einen asynchronen Accessibility-Audit-Job.

**Request Body**:
```json
{
  "url": "https://example.com",
  "maxPages": 50,
  "includeSubdomains": false,
  "socketId": "abc123xyz"
}
```

**Request Parameter**:

| Parameter | Typ | Erforderlich | Default | Beschreibung |
|-----------|-----|--------------|---------|--------------|
| `url` | string | Ja | - | Zu prüfende Website-URL (HTTP/HTTPS) |
| `maxPages` | number | Nein | 50 | Maximale Anzahl zu crawlender Seiten (1-100) |
| `includeSubdomains` | boolean | Nein | false | Subdomains mit crawlen (www, blog, etc.) |
| `socketId` | string | Ja | - | Socket.IO Client-ID für Realtime-Updates |

**Validierung** (via Zod Schema):
- `url`: Muss gültige HTTP/HTTPS URL sein
- `maxPages`: Integer zwischen 1 und 100
- `includeSubdomains`: Boolean
- Keine `file://`, `javascript:`, `data:` URLs erlaubt

**Response**:
```json
{
  "success": true,
  "message": "Audit job started",
  "jobId": "a1b2c3d4e5f6...",
  "socketId": "abc123xyz"
}
```

**Status Codes**:
- `200 OK`: Job erfolgreich gestartet
- `400 Bad Request`: Ungültige Request-Parameter
- `429 Too Many Requests`: Rate Limit überschritten
- `500 Internal Server Error`: Server-Fehler

**Beispiel**:
```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10,
    "includeSubdomains": false,
    "socketId": "abc123"
  }'
```

**Hinweise**:
- Job läuft asynchron im Hintergrund
- Progress-Updates über WebSocket (siehe [WebSocket Events](#websocket-events))
- Job-ID dient zur Wiederaufnahme bei Verbindungsabbruch

---

### 3. Report Download

**Endpoint**: `GET /api/download/:filename`

**Beschreibung**: Lädt generierte PDF- oder JSON-Reports herunter.

**URL Parameter**:

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `filename` | string | Dateiname (Format: `audit-report-{timestamp}.{pdf\|json}`) |

**Sicherheit**:
- Nur Dateien mit Pattern `audit-report-\d+\.(pdf|json)` erlaubt
- Path Traversal Protection
- Keine beliebigen Dateien downloadbar

**Response**:
- **Content-Type**: `application/pdf` oder `application/json`
- **Content-Disposition**: `attachment; filename="..."`

**Status Codes**:
- `200 OK`: Download erfolgreich
- `400 Bad Request`: Ungültiger Dateiname
- `404 Not Found`: Datei existiert nicht
- `500 Internal Server Error`: Server-Fehler

**Beispiel**:
```bash
# PDF Download
curl -O http://localhost:3000/api/download/audit-report-1705315800000.pdf

# JSON Download
curl -O http://localhost:3000/api/download/audit-report-1705315800000.json
```

---

### 4. Metrics

**Endpoint**: `GET /api/metrics`

**Beschreibung**: Liefert Statistiken und Performance-Metriken des Services.

**Request**: Keine Parameter erforderlich

**Response**:
```json
{
  "totalJobs": 150,
  "completedJobs": 142,
  "failedJobs": 8,
  "pagesCrawled": 7500,
  "violationsFound": 3200,
  "runningJobs": 2,
  "uptimeSeconds": 86400,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Response Felder**:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `totalJobs` | number | Gesamtanzahl gestarteter Jobs |
| `completedJobs` | number | Erfolgreich abgeschlossene Jobs |
| `failedJobs` | number | Fehlgeschlagene Jobs |
| `pagesCrawled` | number | Gesamtanzahl gescannter Seiten |
| `violationsFound` | number | Gesamtanzahl gefundener Violations |
| `runningJobs` | number | Aktuell laufende Jobs |
| `uptimeSeconds` | number | Server-Uptime in Sekunden |
| `timestamp` | string | Zeitpunkt der Metrik-Abfrage (ISO 8601) |

**Status Codes**:
- `200 OK`: Metriken erfolgreich abgerufen

**Beispiel**:
```bash
curl http://localhost:3000/api/metrics
```

---

## WebSocket Events

Die API verwendet Socket.IO für Echtzeit-Kommunikation während des Audit-Prozesses.

**Connection URL**: `ws://localhost:3000`

**Namespace**: Default (`/`)

### Client → Server Events

#### 1. `connection`

**Trigger**: Automatisch beim Verbindungsaufbau

**Payload**: Keine

**Beschreibung**: Initiiert WebSocket-Verbindung und erhält Socket-ID

---

#### 2. `resume`

**Trigger**: Manuell vom Client (bei Reconnect)

**Payload**:
```javascript
{
  jobId: "a1b2c3d4e5f6..."
}
```

**Beschreibung**: Fordert Status eines existierenden Jobs an (z.B. nach Verbindungsabbruch)

**Server Response**:
- Sendet letzten bekannten Status via `progress`, `complete` oder `error` Event

---

### Server → Client Events

#### 1. `progress`

**Trigger**: Während Job-Ausführung (mehrmals)

**Payload**:
```javascript
{
  stage: "crawling" | "discovered" | "auditing" | "generating",
  message: "Crawling https://example.com...",
  progress: 45,  // 0-100

  // Optional je nach Stage
  currentPage?: "https://example.com/page",
  pages?: ["url1", "url2", ...],
  unvisitedPages?: ["url3", "url4", ...],
  failedPages?: [{url: "...", reason: "..."}],
  violations?: 150
}
```

**Stages**:
- `crawling`: Website wird durchsucht
- `discovered`: Crawl abgeschlossen, Seiten gefunden
- `auditing`: Accessibility-Tests laufen
- `generating`: PDF-Report wird erstellt

---

#### 2. `complete`

**Trigger**: Bei erfolgreichem Job-Abschluss

**Payload**:
```javascript
{
  success: true,
  report: {
    baseUrl: "https://example.com",
    totalPages: 25,
    totalViolations: 150,
    criticalIssues: 5,
    seriousIssues: 30,
    moderateIssues: 80,
    minorIssues: 35,
    scanDate: "2025-01-15T10:30:00.000Z",
    wcagVersion: "WCAG 2.2",
    conformanceLevel: "AA"
  },
  downloadUrl: "/api/download/audit-report-1705315800000.pdf",
  jsonUrl: "/api/download/audit-report-1705315800000.json"
}
```

---

#### 3. `error`

**Trigger**: Bei Job-Fehler

**Payload**:
```javascript
{
  message: "No pages found to audit"
}
```

**Mögliche Fehler**:
- "No pages found to audit"
- "Job not found or expired"
- "Crawl timeout exceeded"
- "Invalid URL"
- "Network error"

---

## Datenmodelle

### AuditRequest

```typescript
interface AuditRequest {
  url: string;                    // Website URL (HTTP/HTTPS)
  maxPages?: number;              // Max Seiten (1-100, default: 50)
  includeSubdomains?: boolean;    // Subdomains inkludieren (default: false)
  socketId: string;               // Socket.IO Client ID
}
```

### AuditReport

```typescript
interface AuditReport {
  baseUrl: string;
  totalPages: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  pages: PageAuditResult[];
  scanDate: Date;
  wcagVersion: string;
  conformanceLevel: string;
  scanDuration?: number;          // Millisekunden
  deadLinks?: DeadLink[];
}
```

### PageAuditResult

```typescript
interface PageAuditResult {
  url: string;
  title: string;
  violations: Violation[];
  passes: number;
  incomplete: number;
  timestamp: Date;
  loadTime?: number;
  statusCode?: number;
  performanceMetrics?: PerformanceMetrics;
  frameworkDetected?: string;
  isJavaScriptHeavy?: boolean;
  keyboardAccessibility?: KeyboardAccessibility;
  screenReaderCompatibility?: ScreenReaderCompatibility;
}
```

### Violation

```typescript
interface Violation {
  id: string;                           // z.B. "color-contrast"
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  help: string;
  helpUrl: string;                      // Link zur WCAG-Dokumentation
  nodes: ViolationNode[];
  tags: string[];                       // z.B. ["wcag2aa", "wcag143"]
}
```

### ViolationNode

```typescript
interface ViolationNode {
  html: string;                         // HTML-Element
  target: string[];                     // CSS-Selector
  failureSummary: string;               // Beschreibung des Problems
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalSize?: number;                   // Bytes
  requestCount?: number;
}
```

### KeyboardAccessibility

```typescript
interface KeyboardAccessibility {
  tabOrderCorrect: boolean;
  focusVisible: boolean;
  noKeyboardTraps: boolean;
  issues: string[];
}
```

### ScreenReaderCompatibility

```typescript
interface ScreenReaderCompatibility {
  hasProperHeadings: boolean;
  hasAriaLabels: boolean;
  hasLandmarks: boolean;
  score: number;                        // 0-100
}
```

### DeadLink

```typescript
interface DeadLink {
  url: string;
  foundOn: string[];                    // Seiten wo Link gefunden wurde
  statusCode: number;
  statusText: string;
}
```

---

## Fehlerbehandlung

### HTTP Error Responses

Alle Fehler folgen diesem Format:

```json
{
  "error": "Error message",
  "details": {...}  // Optional, nur bei Validierungsfehlern
}
```

### Status Codes

| Code | Bedeutung | Beispiel |
|------|-----------|----------|
| 200 | OK | Request erfolgreich |
| 400 | Bad Request | Ungültige URL oder Parameter |
| 404 | Not Found | Job oder Datei existiert nicht |
| 429 | Too Many Requests | Rate Limit überschritten |
| 500 | Internal Server Error | Server-Fehler |

### Validierungsfehler

Bei ungültigen Request-Parametern:

```json
{
  "error": "Invalid request",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["url"],
      "message": "Expected string, received number"
    }
  ]
}
```

### WebSocket Fehler

Fehler werden über `error` Event gesendet:

```javascript
socket.on('error', (data) => {
  console.error('Job failed:', data.message);
});
```

---

## Code-Beispiele

### JavaScript/TypeScript (Browser)

```javascript
// Socket.IO Connection
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', async () => {
  console.log('Connected:', socket.id);

  // Start Audit
  const response = await fetch('http://localhost:3000/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com',
      maxPages: 10,
      includeSubdomains: false,
      socketId: socket.id
    })
  });

  const data = await response.json();
  console.log('Job started:', data.jobId);
});

// Progress Updates
socket.on('progress', (data) => {
  console.log(`[${data.stage}] ${data.message} (${data.progress}%)`);
});

// Completion
socket.on('complete', (data) => {
  console.log('Audit complete!');
  console.log('Total Violations:', data.report.totalViolations);
  console.log('Download PDF:', data.downloadUrl);

  // Download Report
  window.location.href = `http://localhost:3000${data.downloadUrl}`;
});

// Error Handling
socket.on('error', (data) => {
  console.error('Error:', data.message);
});

// Reconnect & Resume
socket.on('reconnect', () => {
  const jobId = localStorage.getItem('currentJobId');
  if (jobId) {
    socket.emit('resume', jobId);
  }
});
```

---

### Node.js (Backend Integration)

```javascript
import { io } from 'socket.io-client';
import fetch from 'node-fetch';
import fs from 'fs';

const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);

async function runAudit(url, maxPages = 10) {
  return new Promise((resolve, reject) => {
    socket.on('connect', async () => {
      try {
        const response = await fetch(`${API_BASE}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            maxPages,
            socketId: socket.id
          })
        });

        const data = await response.json();
        console.log('Job ID:', data.jobId);
      } catch (error) {
        reject(error);
      }
    });

    socket.on('progress', (data) => {
      console.log(`Progress: ${data.progress}% - ${data.message}`);
    });

    socket.on('complete', async (data) => {
      console.log('Audit complete!');

      // Download PDF
      const pdfUrl = `${API_BASE}${data.downloadUrl}`;
      const pdfResponse = await fetch(pdfUrl);
      const pdfBuffer = await pdfResponse.buffer();
      fs.writeFileSync('report.pdf', pdfBuffer);

      socket.disconnect();
      resolve(data);
    });

    socket.on('error', (data) => {
      socket.disconnect();
      reject(new Error(data.message));
    });
  });
}

// Verwendung
runAudit('https://example.com', 10)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

---

### Python

```python
import requests
import socketio
import time

API_BASE = 'http://localhost:3000'

# Socket.IO Client
sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('Connected:', sio.sid)

    # Start Audit
    response = requests.post(f'{API_BASE}/api/audit', json={
        'url': 'https://example.com',
        'maxPages': 10,
        'includeSubdomains': False,
        'socketId': sio.sid
    })

    data = response.json()
    print('Job started:', data['jobId'])

@sio.on('progress')
def on_progress(data):
    print(f"[{data['stage']}] {data['message']} ({data['progress']}%)")

@sio.on('complete')
def on_complete(data):
    print('Audit complete!')
    print('Total Violations:', data['report']['totalViolations'])

    # Download PDF
    pdf_url = f"{API_BASE}{data['downloadUrl']}"
    pdf_response = requests.get(pdf_url)

    with open('report.pdf', 'wb') as f:
        f.write(pdf_response.content)

    print('Report saved: report.pdf')
    sio.disconnect()

@sio.on('error')
def on_error(data):
    print('Error:', data['message'])
    sio.disconnect()

# Connect and run
sio.connect(API_BASE)
sio.wait()
```

---

### cURL (Testing)

```bash
# Health Check
curl http://localhost:3000/api/health

# Start Audit (requires Socket.IO for full workflow)
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 5,
    "includeSubdomains": false,
    "socketId": "test-socket-id"
  }'

# Get Metrics
curl http://localhost:3000/api/metrics

# Download Report
curl -O http://localhost:3000/api/download/audit-report-1705315800000.pdf
```

---

## Konfiguration

Alle API-Parameter können via `.env` konfiguriert werden:

```env
# Server
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 Minuten
RATE_LIMIT_MAX_REQUESTS=10         # Max Requests pro IP

# Audit Limits
MAX_PAGES_DEFAULT=50               # Standard Seitenlimit
MAX_PAGES_LIMIT=100                # Absolutes Maximum
CRAWL_TIMEOUT_MS=45000             # Navigation Timeout
AUDIT_CONCURRENCY=3                # Parallele Audits
CONTENT_WAIT_MS=2000               # Wartezeit für SPA Content

# Job Management
JOB_CLEANUP_INTERVAL_MS=600000     # Cleanup alle 10 Min
JOB_MAX_AGE_MS=3600000             # Max Job-Alter (1h)
```

Siehe `.env.example` für vollständige Konfiguration.

---

## Best Practices

### Client-seitig

1. **Socket.IO Reconnection**: Implementiere automatische Wiederverbindung
   ```javascript
   const socket = io(url, {
     reconnection: true,
     reconnectionDelay: 1000,
     reconnectionAttempts: 5
   });
   ```

2. **Job-ID Persistence**: Speichere Job-ID für Resume-Funktion
   ```javascript
   localStorage.setItem('currentJobId', data.jobId);
   ```

3. **Error Handling**: Behandle alle Error-Events
   ```javascript
   socket.on('error', handleError);
   socket.on('connect_error', handleConnectionError);
   ```

4. **Progress Feedback**: Zeige Progress-Bar für UX
   ```javascript
   socket.on('progress', (data) => {
     updateProgressBar(data.progress);
   });
   ```

### Server-seitig

1. **Rate Limiting**: Konfiguriere basierend auf erwarteter Last
2. **Job Cleanup**: Überwache alte Jobs und bereinige regelmäßig
3. **Monitoring**: Nutze `/api/metrics` für Health-Checks
4. **HTTPS**: Verwende HTTPS in Production (nginx/Caddy)
5. **CORS**: Konfiguriere CORS für spezifische Origins

---

## Limitierungen

- **Max Pages**: 100 Seiten pro Scan (konfigurierbar)
- **Rate Limit**: 10 Requests pro 15 Minuten pro IP
- **Job Retention**: Jobs werden nach 1 Stunde automatisch gelöscht
- **URL Support**: Nur HTTP/HTTPS (keine FTP, file://, etc.)
- **JavaScript**: Begrenzte Unterstützung für Heavy SPAs ohne SSR
- **Authentication**: Nicht geschützte Bereiche (Login wird nicht unterstützt)

---

## Roadmap

### Geplante API-Erweiterungen

- ✅ WebSocket Realtime Updates
- ✅ Async Job Pattern
- 🚧 API-Key Authentifizierung
- 🚧 Webhook-Benachrichtigungen
- 🚧 Scheduled Audits (Cron)
- 🚧 Historical Comparisons (Diff)
- 🚧 Multi-Tenant Support
- 🚧 GraphQL Endpoint

---

## Support

Bei Fragen zur API:

- **GitHub Issues**: https://github.com/your-repo/issues
- **Email**: info@dinel.at
- **Dokumentation**: README.md, SECURITY.md, API.md

---

<div align="center">

**WCAG Audit Tool API v1.0.0**

Entwickelt von [Dinel Kurtovic](https://virtus-umbra.ai) | Virtus Umbra

100% Open Source • DSGVO-konform • Made with TypeScript

</div>
