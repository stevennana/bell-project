#!/usr/bin/env node

// Simple script to test the admin API endpoints
// Run with: node test-api.js

const API_BASE_URL = 'http://localhost:3000';
const ADMIN_AUTH = 'Basic ' + Buffer.from('admin@bell.com:admin123').toString('base64');

async function testAPI() {
    console.log('🧪 Testing Admin API...\n');

    try {
        // Test GET /restaurants
        const response = await fetch(`${API_BASE_URL}/restaurants`, {
            headers: { 'Authorization': ADMIN_AUTH }
        });

        if (response.ok) {
            const restaurants = await response.json();
            console.log(`✅ API Connected: Found ${restaurants.length} restaurants`);
            console.log('   Access admin dashboard: http://localhost:8080');
        } else {
            console.log(`❌ API Error: ${response.status} - ${response.statusText}`);
            console.log('   Make sure backend is running: ./dev-local.sh');
        }
    } catch (error) {
        console.log('🔴 API Unavailable:', error.message);
        console.log('   The admin dashboard will work in demo mode');
        console.log('   Start backend with: ./dev-local.sh');
    }
}

testAPI();