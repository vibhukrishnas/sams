from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_caching import Cache
import redis
from .utils.db_connections import DatabaseManager
from .services.metrics_service import MetricsService
from .services.websocket_service import WebSocketService
from .repositories.metrics_repository import MetricsRepository

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Load configuration
    if config_name == 'production':
        app.config.from_object('config.ProductionConfig')
    else:
        app.config.from_object('config.DevelopmentConfig')
    
    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')  # Changed from eventlet to threading
    jwt = JWTManager(app)
    cache = Cache(app, config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': app.config['REDIS_URL']})
    
    # Initialize database manager
    db_manager = DatabaseManager(app.config)
    
    # Initialize repositories
    metrics_repo = MetricsRepository(db_manager)
    
    # Initialize services
    metrics_service = MetricsService(metrics_repo, cache, None)
    websocket_service = WebSocketService(socketio, metrics_service)
    metrics_service.websocket_service = websocket_service
    
    # Register blueprints
    from .controllers import metrics_controller
    app.register_blueprint(metrics_controller.bp, url_prefix='/api/metrics')
    
    # Store services in app context
    app.db_manager = db_manager
    app.metrics_service = metrics_service
    app.websocket_service = websocket_service
    
    return app, socketio
