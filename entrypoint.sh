#!/bin/sh
# entrypoint.sh

# Setze die Berechtigungen für den Reports-Ordner, falls gemountet
chown -R pwuser:pwuser /app/reports

# Führe den eigentlichen Befehl als pwuser aus
exec gosu pwuser "$@"
