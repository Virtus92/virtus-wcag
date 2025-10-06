#!/bin/bash

# WCAG Audit Tool - Quickstart Script
# Automatische Installation und Start

set -e

echo "🚀 WCAG 2.2 AA Audit Tool - Quickstart"
echo "======================================"
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker gefunden"
    USE_DOCKER=true
elif command -v node &> /dev/null; then
    echo "✅ Node.js gefunden"
    USE_DOCKER=false
else
    echo "❌ Fehler: Weder Docker noch Node.js gefunden"
    echo "Bitte installiere Docker oder Node.js 18+"
    exit 1
fi

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Erstelle .env Datei..."
    cp .env.example .env
    echo "✅ .env erstellt"
fi

# Docker Installation
if [ "$USE_DOCKER" = true ]; then
    echo ""
    echo "🐳 Starte mit Docker..."
    echo ""

    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null; then
        echo "Verwende docker-compose..."
        docker-compose up --build -d
    else
        echo "Verwende docker..."
        docker build -t wcag-audit-tool .
        docker run -d -p 3001:3001 -v $(pwd)/reports:/app/reports --name wcag-audit wcag-audit-tool
    fi

    echo ""
    echo "⏳ Warte auf Container-Start..."
    sleep 5

    # Health check
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo "✅ Container läuft"
    else
        echo "⚠️  Container startet noch..."
    fi

# Node.js Installation
else
    echo ""
    echo "📦 Installiere Dependencies..."
    npm install

    echo ""
    echo "🎭 Installiere Playwright Chromium..."
    npx playwright install chromium

    echo ""
    echo "🔨 Erstelle Production Build..."
    npm run build

    echo ""
    echo "🚀 Starte Server..."
    npm start &

    echo ""
    echo "⏳ Warte auf Server-Start..."
    sleep 3

    # Health check
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo "✅ Server läuft"
    else
        echo "⚠️  Server startet noch..."
    fi
fi

echo ""
echo "======================================"
echo "✨ Installation abgeschlossen!"
echo ""
echo "📍 URL: http://localhost:3001"
echo "📊 API Health: http://localhost:3001/api/health"
echo "📁 Reports: ./reports/"
echo ""

if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Docker Commands:"
    echo "   Logs anzeigen:    docker logs -f wcag-audit"
    echo "   Container stoppen: docker stop wcag-audit"
    echo "   Container starten: docker start wcag-audit"
else
    echo "💻 Node.js Commands:"
    echo "   Development:      npm run dev"
    echo "   Production Build: npm run build"
    echo "   Server stoppen:   pkill -f 'node dist/server.js'"
fi

echo ""
echo "📖 Dokumentation: README.md"
echo "🔒 Sicherheit: SECURITY.md"
echo ""
echo "======================================"

# Try to open browser
if command -v xdg-open &> /dev/null; then
    echo "🌐 Öffne Browser..."
    xdg-open http://localhost:3001 2>/dev/null || true
elif command -v open &> /dev/null; then
    echo "🌐 Öffne Browser..."
    open http://localhost:3001 2>/dev/null || true
fi

echo ""
echo "Viel Erfolg! 🎉"