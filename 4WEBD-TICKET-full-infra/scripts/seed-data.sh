#!/bin/sh
# Seed initial data for development/testing

API_URL="${API_URL:-http://localhost:3030}"

echo "=== Seeding data ==="

# 1. Create admin user
echo "\n[1] Creating admin user..."
ADMIN=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"firstname":"Admin","lastname":"System","email":"admin@ticket.com","password":"admin1234","role":"admin"}')
echo "$ADMIN"
ADMIN_TOKEN=$(echo "$ADMIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Create operator user
echo "\n[2] Creating operator user..."
OPERATOR=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"firstname":"Operator","lastname":"Test","email":"operator@ticket.com","password":"operator1234","role":"operator"}')
echo "$OPERATOR"
OPERATOR_TOKEN=$(echo "$OPERATOR" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 3. Create regular user
echo "\n[3] Creating regular user..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"firstname":"Jean","lastname":"Dupont","email":"jean@example.com","password":"password123"}'

# 4. Create events
echo "\n[4] Creating events..."
curl -s -X POST "$API_URL/events" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Concert de Stromae","description":"Tournée Multitude 2026","date":"2026-06-15T20:00:00Z","venue":"Stade de France, Paris","maxCapacity":80000,"priceInCents":7500}'

curl -s -X POST "$API_URL/events" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Daft Punk Reunion","description":"One More Time, for real","date":"2026-09-20T21:00:00Z","venue":"AccorHotels Arena, Paris","maxCapacity":20000,"priceInCents":12000}'

curl -s -X POST "$API_URL/events" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Soirée Jazz - Petit Venue","description":"Jazz local","date":"2026-04-01T19:00:00Z","venue":"Le Café de la Musique","maxCapacity":50,"priceInCents":1500}'

echo "\n=== Seed complete ==="
