#!/usr/bin/env python3
"""
SAMS Alert Correlation Engine POC - REST API Server

This module provides a REST API interface for the Alert Correlation Engine.
It allows external systems to submit alerts and query correlation results.

@version 1.0.0
@author SAMS Development Team
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import logging
from datetime import datetime
from alert_engine import AlertCorrelationEngine, AlertSeverity, AlertStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Alert Correlation Engine
engine = AlertCorrelationEngine()

@app.route('/api/status', methods=['GET'])
def api_status():
    """Get API status"""
    return jsonify({
        'service': 'SAMS Alert Correlation Engine POC',
        'version': '1.0.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get all active alerts"""
    try:
        alerts = engine.get_active_alerts()
        return jsonify(alerts)
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts', methods=['POST'])
def submit_alert():
    """Submit a new alert for processing"""
    try:
        alert_data = request.get_json()
        
        if not alert_data:
            return jsonify({'error': 'No alert data provided'}), 400
        
        # Validate required fields
        required_fields = ['source', 'server_id', 'server_name', 'alert_type', 'severity', 'message']
        for field in required_fields:
            if field not in alert_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Process the alert
        processed_alert = engine.process_alert(alert_data)
        
        return jsonify({
            'success': True,
            'alert_id': processed_alert.id,
            'status': processed_alert.status.value,
            'correlation_id': processed_alert.correlation_id,
            'message': 'Alert processed successfully'
        })
        
    except Exception as e:
        logger.error(f"Error processing alert: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/correlations', methods=['GET'])
def get_correlations():
    """Get all correlation groups"""
    try:
        correlations = engine.get_correlation_groups()
        return jsonify(correlations)
    except Exception as e:
        logger.error(f"Error getting correlations: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get engine statistics"""
    try:
        stats = engine.get_statistics()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=================================================")
    print("  SAMS Alert Correlation Engine POC - API Server")
    print("=================================================")
    print("  Version: 1.0.0")
    print("  API Server: http://localhost:5000")
    print("  API Endpoints:")
    print("    GET  /api/status")
    print("    GET  /api/alerts")
    print("    POST /api/alerts")
    print("    GET  /api/correlations")
    print("    GET  /api/statistics")
    print("=================================================")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
