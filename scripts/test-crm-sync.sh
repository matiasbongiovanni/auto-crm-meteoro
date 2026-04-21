#!/bin/bash
# Script para probar endpoints de sincronización con WhatsApp Bot
# Uso: bash scripts/test-crm-sync.sh <api-key>

if [ -z "$1" ]; then
    echo "Uso: bash scripts/test-crm-sync.sh <api-key>"
    echo "Ejemplo: bash scripts/test-crm-sync.sh sk-crm_abc123xyz789"
    exit 1
fi

API_KEY="$1"
BASE_URL="http://localhost:3000"
CONTACT_ID=""

echo "============================================"
echo "Prueba de endpoints CRM + WhatsApp"
echo "============================================"
echo ""

# Test 1: Obtener leads fríos
echo "Test 1: GET /api/crm/sync?temperature=cold"
echo "─────────────────────────────────────────────"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/crm/sync?temperature=cold&limit=5" \
  -H "x-api-key: $API_KEY")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extraer primer contact_id para test 2
CONTACT_ID=$(echo "$RESPONSE" | jq -r '.[0].id' 2>/dev/null)

if [ -z "$CONTACT_ID" ] || [ "$CONTACT_ID" == "null" ]; then
    echo "⚠ No hay leads fríos para probar actualización."
    echo "  Crea algunos leads con temperature='cold' primero."
    exit 1
fi

echo "Usando contact_id: $CONTACT_ID"
echo ""

# Test 2: Actualizar lead
echo "Test 2: POST /api/crm/update-from-whatsapp"
echo "─────────────────────────────────────────────"
UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/crm/update-from-whatsapp" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contactId\": \"$CONTACT_ID\",
    \"temperature\": \"warm\",
    \"score\": 50,
    \"notes\": \"Prueba desde script de testing\",
    \"activityType\": \"note\",
    \"activityDescription\": \"Cliente respondió positivamente al mensaje de WhatsApp\"
  }")

echo "$UPDATE_RESPONSE" | jq . 2>/dev/null || echo "$UPDATE_RESPONSE"
echo ""

# Verificar resultado
UPDATED_TEMP=$(echo "$UPDATE_RESPONSE" | jq -r '.temperature' 2>/dev/null)
UPDATED_SCORE=$(echo "$UPDATE_RESPONSE" | jq -r '.score' 2>/dev/null)

echo "============================================"
if [ "$UPDATED_TEMP" == "warm" ] && [ "$UPDATED_SCORE" == "50" ]; then
    echo "✓ TESTS PASADOS"
    echo "  - Lead actualizado: temperature=warm, score=50"
    echo "  - Actividad registrada en CRM"
else
    echo "✗ TESTS FALLIDOS"
    echo "  Temperature: $UPDATED_TEMP (esperado: warm)"
    echo "  Score: $UPDATED_SCORE (esperado: 50)"
fi
echo "============================================"
