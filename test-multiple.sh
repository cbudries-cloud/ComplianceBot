#!/bin/bash

# Test multiple tickets
TICKETS=(
  "22309940839"  # Mtnops
  "24913204816"  # Uppeal
  "24915017769"  # Sunny Health
  "24914955778"  # Ali Miller
  "24914955795"  # Bubs Naturals
)

echo "🧪 Testing multiple tickets..."

for ticket in "${TICKETS[@]}"; do
  echo "Processing ticket $ticket..."
  curl -s http://localhost:3000/process-ticket/$ticket
  echo ""
  sleep 2  # Wait 2 seconds between requests
done

echo "✅ All tickets processed!"
