/**
 * SAMS WebSocket Communication POC - Test Client
 * 
 * This is a Node.js test client that demonstrates WebSocket communication
 * with the SAMS monitoring server. It can be used to test all WebSocket
 * functionality programmatically.
 */

const WebSocket = require('ws');

class SAMSWebSocketClient {
    constructor(url = 'ws://localhost:3002') {
        this.url = url;
        this.ws = null;
        this.clientId = null;
        this.connected = false;
        this.messageCount = 0;
        this.subscriptions = new Set();
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log(`🔌 Connecting to ${this.url}...`);
            
            this.ws = new WebSocket(this.url);
            
            this.ws.on('open', () => {
                this.connected = true;
                console.log('✅ Connected to SAMS WebSocket server');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.ws.on('close', (code, reason) => {
                this.connected = false;
                console.log(`🔌 Connection closed: ${code} - ${reason}`);
            });
            
            this.ws.on('error', (error) => {
                this.connected = false;
                console.error('❌ WebSocket error:', error.message);
                reject(error);
            });
        });
    }

    handleMessage(message) {
        this.messageCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        switch (message.type) {
            case 'welcome':
                this.clientId = message.clientId;
                console.log(`🎉 [${timestamp}] Welcome message received`);
                console.log(`   Client ID: ${message.clientId}`);
                console.log(`   Server Version: ${message.version}`);
                console.log(`   Available Channels: ${message.availableChannels.join(', ')}`);
                break;
                
            case 'system-data':
                console.log(`📊 [${timestamp}] System data received`);
                console.log(`   Servers: ${message.data.servers.length}`);
                console.log(`   Online: ${message.data.stats.onlineServers}`);
                console.log(`   Alerts: ${message.data.stats.totalAlerts}`);
                break;
                
            case 'system-data-update':
                console.log(`🔄 [${timestamp}] System data update #${message.updateId}`);
                message.data.servers.forEach(server => {
                    console.log(`   ${server.name}: ${server.status} (CPU: ${server.cpu.toFixed(1)}%, Memory: ${server.memory.toFixed(1)}%)`);
                });
                break;
                
            case 'new-alert':
                console.log(`🚨 [${timestamp}] NEW ALERT: ${message.alert.type.toUpperCase()}`);
                console.log(`   Server: ${message.alert.serverName}`);
                console.log(`   Message: ${message.alert.message}`);
                break;
                
            case 'heartbeat':
                console.log(`💓 [${timestamp}] Heartbeat - ${message.connectedClients} clients, uptime: ${Math.floor(message.serverUptime)}s`);
                break;
                
            case 'subscription-confirmed':
                this.subscriptions.add(message.channel);
                console.log(`📡 [${timestamp}] Subscribed to channel: ${message.channel}`);
                break;
                
            case 'subscription-cancelled':
                this.subscriptions.delete(message.channel);
                console.log(`📡 [${timestamp}] Unsubscribed from channel: ${message.channel}`);
                break;
                
            case 'pong':
                console.log(`🏓 [${timestamp}] Pong received`);
                break;
                
            case 'client-info-response':
                console.log(`ℹ️ [${timestamp}] Client info:`);
                console.log(`   ID: ${message.clientInfo.id}`);
                console.log(`   Connected: ${new Date(message.clientInfo.connectedAt).toLocaleString()}`);
                console.log(`   Duration: ${Math.floor(message.clientInfo.connectionDuration / 1000)}s`);
                console.log(`   Subscriptions: ${message.clientInfo.subscriptions.join(', ') || 'none'}`);
                break;
                
            case 'error':
                console.error(`❌ [${timestamp}] Server error: ${message.message}`);
                break;
                
            default:
                console.log(`❓ [${timestamp}] Unknown message type: ${message.type}`);
        }
    }

    send(message) {
        if (this.connected && this.ws) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        console.error('❌ Cannot send message: not connected');
        return false;
    }

    ping() {
        return this.send({ type: 'ping', timestamp: new Date().toISOString() });
    }

    subscribe(channel) {
        return this.send({ type: 'subscribe', channel });
    }

    unsubscribe(channel) {
        return this.send({ type: 'unsubscribe', channel });
    }

    requestData() {
        return this.send({ type: 'request-data' });
    }

    simulateAlert(serverId = 'server-1', alertType = 'warning') {
        return this.send({ type: 'simulate-alert', serverId, alertType });
    }

    getClientInfo() {
        return this.send({ type: 'client-info' });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            console.log('🔌 Disconnected from server');
        }
    }
}

// Test scenarios
async function runTests() {
    console.log('=================================================');
    console.log('  SAMS WebSocket Communication POC - Test Client');
    console.log('=================================================');
    
    const client = new SAMSWebSocketClient();
    
    try {
        // Test 1: Basic connection
        console.log('\n🧪 Test 1: Basic Connection');
        await client.connect();
        await sleep(2000);
        
        // Test 2: Ping/Pong
        console.log('\n🧪 Test 2: Ping/Pong');
        client.ping();
        await sleep(1000);
        
        // Test 3: Channel subscriptions
        console.log('\n🧪 Test 3: Channel Subscriptions');
        client.subscribe('system-data');
        client.subscribe('alerts');
        client.subscribe('heartbeat');
        await sleep(2000);
        
        // Test 4: Request data
        console.log('\n🧪 Test 4: Request Data');
        client.requestData();
        await sleep(1000);
        
        // Test 5: Client info
        console.log('\n🧪 Test 5: Client Info');
        client.getClientInfo();
        await sleep(1000);
        
        // Test 6: Simulate alerts
        console.log('\n🧪 Test 6: Simulate Alerts');
        client.simulateAlert('server-1', 'warning');
        await sleep(1000);
        client.simulateAlert('server-2', 'critical');
        await sleep(2000);
        
        // Test 7: Listen to real-time updates
        console.log('\n🧪 Test 7: Real-time Updates (30 seconds)');
        console.log('Listening for real-time system updates and alerts...');
        await sleep(30000);
        
        // Test 8: Unsubscribe
        console.log('\n🧪 Test 8: Unsubscribe');
        client.unsubscribe('heartbeat');
        await sleep(2000);
        
        console.log('\n✅ All tests completed successfully!');
        console.log(`📊 Total messages received: ${client.messageCount}`);
        console.log(`📡 Active subscriptions: ${Array.from(client.subscriptions).join(', ')}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        client.disconnect();
        process.exit(0);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = SAMSWebSocketClient;
