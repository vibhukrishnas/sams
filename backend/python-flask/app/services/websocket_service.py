from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
from typing import Dict
import time
from threading import Thread

class WebSocketService:
    def __init__(self, socketio: SocketIO, metrics_service):
        self.socketio = socketio
        self.metrics_service = metrics_service
        self.active_connections = {}
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup WebSocket event handlers"""
        @self.socketio.on('connect')
        def handle_connect():
            print(f"Client connected: {request.sid}")
            self.active_connections[request.sid] = {
                'connected_at': datetime.utcnow(),
                'subscriptions': []
            }
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            print(f"Client disconnected: {request.sid}")
            if request.sid in self.active_connections:
                del self.active_connections[request.sid]
        
        @self.socketio.on('subscribe_metrics')
        def handle_subscribe(data):
            agent_id = data.get('agent_id')
            interval = data.get('interval', 5)  # seconds
            
            join_room(f"metrics_{agent_id}")
            
            # Start sending real-time metrics
            thread = Thread(
                target=self._send_realtime_metrics,
                args=(request.sid, agent_id, interval)
            )
            thread.daemon = True
            thread.start()
        
        @self.socketio.on('execute_command')
        def handle_command(data):
            """Handle system commands from mobile/web"""
            command_type = data.get('command_type')
            agent_id = data.get('agent_id')
            params = data.get('params', {})
            
            # Execute command and return result
            result = self._execute_system_command(command_type, agent_id, params)
            emit('command_result', result)
    
    def _send_realtime_metrics(self, sid: str, agent_id: str, interval: int):
        """Send real-time metrics to subscribed client"""
        while sid in self.active_connections:
            try:
                # Collect real system metrics
                metrics = self.metrics_service.collect_system_metrics(agent_id)
                
                # Send to specific room
                self.socketio.emit('metrics_update', {
                    'agent_id': agent_id,
                    'metrics': metrics,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"metrics_{agent_id}")
                
                time.sleep(interval)
            except Exception as e:
                print(f"Error sending metrics: {e}")
                break
    
    def _execute_system_command(self, command_type: str, agent_id: str, params: Dict):
        """Execute system commands - BE CAREFUL WITH SECURITY!"""
        allowed_commands = {
            'restart_service': self._restart_service,
            'clear_cache': self._clear_cache,
            'kill_process': self._kill_process,
            'update_config': self._update_config
        }
        
        if command_type not in allowed_commands:
            return {'success': False, 'error': 'Command not allowed'}
        
        try:
            result = allowed_commands[command_type](agent_id, params)
            return {'success': True, 'result': result}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def broadcast_alert(self, alert_data: Dict):
        """Broadcast alerts to all connected clients"""
        self.socketio.emit('alert', alert_data, broadcast=True)
