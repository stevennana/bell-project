#!/bin/bash

# Seed script for creating default categories in restaurant rest_001
# This preserves the category data that has been tested and verified

echo "🌱 Seeding default categories for restaurant rest_001..."

# Restaurant ID - keeping this information for future reference
RESTAURANT_ID="rest_001"
API_BASE_URL="http://localhost:3000"

echo "📋 Creating default categories for restaurant: $RESTAURANT_ID"

# Create Burgers category
echo "🍔 Creating Burgers category..."
curl -X POST "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"name": "burgers", "displayName": "Burgers", "order": 0}' \
  -s | jq '.'

# Create Sides category  
echo "🍟 Creating Sides category..."
curl -X POST "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"name": "sides", "displayName": "Sides", "order": 1}' \
  -s | jq '.'

# Create Drinks category
echo "🥤 Creating Drinks category..."
curl -X POST "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"name": "drinks", "displayName": "Drinks", "order": 2}' \
  -s | jq '.'

# Create Desserts category
echo "🍰 Creating Desserts category..."
curl -X POST "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"name": "desserts", "displayName": "Desserts", "order": 3}' \
  -s | jq '.'

echo ""
echo "✅ Category seeding completed!"
echo ""
echo "📋 Verifying categories..."
curl -X GET "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -s | jq '.categories | length as $count | "Created \($count) categories:"'

curl -X GET "$API_BASE_URL/restaurants/$RESTAURANT_ID/categories" \
  -H "Content-Type: application/json" \
  -s | jq '.categories[] | "- \(.displayName) (order: \(.order), active: \(.active))"'

echo ""
echo "🎉 Seed script completed successfully!"
echo ""
echo "💡 Important Information:"
echo "   Restaurant ID: $RESTAURANT_ID"
echo "   API Base URL: $API_BASE_URL"
echo "   Categories API: $API_BASE_URL/restaurants/$RESTAURANT_ID/categories"
echo ""
echo "📝 This information is preserved in this script for future reference."