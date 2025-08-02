import pytest
from app.services.metrics_service import MetricsService
from unittest.mock import Mock, patch

class TestMetricsService:
    @pytest.fixture
    def metrics_service(self):
        mock_repo = Mock()
        mock_cache = Mock()
        mock_ws = Mock()
        return MetricsService(mock_repo, mock_cache, mock_ws)

    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    def test_collect_system_metrics(self, mock_memory, mock_cpu, metrics_service):
        mock_cpu.return_value = 45.5
        mock_memory.return_value.percent = 62.3
        metrics = metrics_service.collect_system_metrics('test-agent')
        assert metrics['agent_id'] == 'test-agent'
        assert metrics['cpu_usage'] == 45.5
        assert metrics['memory_usage'] == 62.3
