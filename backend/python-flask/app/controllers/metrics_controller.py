from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime

bp = Blueprint('metrics', __name__)

@bp.route('/collect', methods=['POST'])
@jwt_required()
def collect_metrics():
    """Endpoint for agents to submit metrics"""
    data = request.get_json()
    agent_id = data.get('agent_id')
    metrics = data.get('metrics')
    
    # Validate and save metrics
    metric_id = current_app.metrics_service.save_metrics(metrics)
    
    return jsonify({
        'success': True,
        'metric_id': metric_id,
        'timestamp': datetime.utcnow().isoformat()
    })

@bp.route('/realtime/<agent_id>', methods=['GET'])
@jwt_required()
def get_realtime_metrics(agent_id):
    """Get real-time metrics for specific agent"""
    minutes = request.args.get('minutes', 5, type=int)
    db_name = request.args.get('db', 'mysql')
    
    metrics = current_app.metrics_service.get_realtime_metrics(
        agent_id, minutes, db_name
    )
    
    return jsonify({
        'success': True,
        'agent_id': agent_id,
        'metrics': metrics
    })

@bp.route('/system/<agent_id>', methods=['GET'])
@jwt_required()
def get_system_info(agent_id):
    """Get detailed system information"""
    info = {
        'processes': current_app.metrics_service.get_process_details(agent_id),
        'disks': current_app.metrics_service.get_disk_partitions(),
        'network': current_app.metrics_service.get_network_connections()
    }
    
    return jsonify({
        'success': True,
        'agent_id': agent_id,
        'system_info': info
    })
