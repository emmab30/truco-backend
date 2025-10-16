// Simple test script for the prepared message endpoint
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testPreparedMessage() {
    try {
        console.log('Testing prepared message endpoint...');
        
        const testData = {
            userId: 123456789, // Test user ID
            roomId: 'test-room-123',
            roomName: 'Test Game Room'
        };
        
        console.log('Sending request with data:', testData);
        
        const response = await axios.get(`${API_BASE_URL}/api/telegram/prepared-message`, {
            params: testData
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('✅ Prepared message created successfully!');
            console.log('Prepared Message ID:', response.data.data.preparedMessageId);
            console.log('Launch URL:', response.data.data.launchUrl);
        } else {
            console.log('❌ Failed to create prepared message:', response.data.error);
        }
        
    } catch (error) {
        console.error('❌ Error testing prepared message:', error.response?.data || error.message);
    }
}

// Run the test
testPreparedMessage();
