/**
 * ⚡ Performance Optimizer Component
 * Provides performance insights, optimization recommendations, and automated tuning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PerformanceMonitor, { ScalabilityManager } from '../services/PerformanceMonitor';

interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'cost' | 'reliability' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedSavings?: string;
  estimatedImprovement?: string;
  actionable: boolean;
  autoApplicable: boolean;
}

interface PerformanceInsight {
  id: string;
  type: 'bottleneck' | 'inefficiency' | 'opportunity' | 'risk';
  component: string;
  metric: string;
  currentValue: number;
  optimalValue: number;
  impact: 'low' | 'medium' | 'high';
  trend: 'improving' | 'degrading' | 'stable';
}

const PerformanceOptimizer: React.FC = () => {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(false);

  const performanceMonitor = PerformanceMonitor.getInstance();
  const scalabilityManager = ScalabilityManager.getInstance();

  useEffect(() => {
    generateRecommendations();
    generateInsights();
  }, []);

  const generateRecommendations = () => {
    const capacityRecommendations = scalabilityManager.getCapacityRecommendations();
    const performanceReport = performanceMonitor.getPerformanceReport();

    const optimizationRecommendations: OptimizationRecommendation[] = [
      {
        id: '1',
        category: 'performance',
        priority: 'high',
        title: 'Optimize Database Query Performance',
        description: 'Database queries are taking 15% longer than optimal. Consider adding indexes and optimizing slow queries.',
        impact: 'Reduce API response time by 25-30%',
        effort: 'medium',
        estimatedImprovement: '25-30% faster API responses',
        actionable: true,
        autoApplicable: false
      },
      {
        id: '2',
        category: 'cost',
        priority: 'medium',
        title: 'Right-size Underutilized Instances',
        description: 'Several instances are running at <30% utilization. Consider downsizing to reduce costs.',
        impact: 'Reduce infrastructure costs without performance impact',
        effort: 'low',
        estimatedSavings: '$1,200/month',
        actionable: true,
        autoApplicable: true
      },
      {
        id: '3',
        category: 'reliability',
        priority: 'high',
        title: 'Implement Circuit Breaker Pattern',
        description: 'Add circuit breakers to prevent cascade failures during high load periods.',
        impact: 'Improve system resilience and prevent outages',
        effort: 'high',
        estimatedImprovement: '99.99% uptime target achievable',
        actionable: true,
        autoApplicable: false
      },
      {
        id: '4',
        category: 'performance',
        priority: 'medium',
        title: 'Enable Response Caching',
        description: 'Implement Redis caching for frequently accessed data to reduce database load.',
        impact: 'Reduce database load by 40-50%',
        effort: 'medium',
        estimatedImprovement: '40-50% reduction in DB queries',
        actionable: true,
        autoApplicable: false
      },
      {
        id: '5',
        category: 'cost',
        priority: 'low',
        title: 'Optimize CDN Usage',
        description: 'Review CDN configuration and implement better caching strategies for static assets.',
        impact: 'Reduce bandwidth costs and improve load times',
        effort: 'low',
        estimatedSavings: '$300/month',
        actionable: true,
        autoApplicable: true
      }
    ];

    setRecommendations(optimizationRecommendations);
  };

  const generateInsights = () => {
    const performanceInsights: PerformanceInsight[] = [
      {
        id: '1',
        type: 'bottleneck',
        component: 'Database',
        metric: 'Query Response Time',
        currentValue: 45,
        optimalValue: 30,
        impact: 'high',
        trend: 'degrading'
      },
      {
        id: '2',
        type: 'inefficiency',
        component: 'API Gateway',
        metric: 'CPU Utilization',
        currentValue: 25,
        optimalValue: 60,
        impact: 'medium',
        trend: 'stable'
      },
      {
        id: '3',
        type: 'opportunity',
        component: 'Cache Layer',
        metric: 'Hit Rate',
        currentValue: 78,
        optimalValue: 90,
        impact: 'medium',
        trend: 'improving'
      },
      {
        id: '4',
        type: 'risk',
        component: 'Alert Processing',
        metric: 'Queue Depth',
        currentValue: 150,
        optimalValue: 50,
        impact: 'high',
        trend: 'degrading'
      }
    ];

    setInsights(performanceInsights);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance': return '#00FF88';
      case 'cost': return '#00BFFF';
      case 'reliability': return '#9C27B0';
      case 'security': return '#FF6B35';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#FF3366';
      case 'high': return '#FF6B35';
      case 'medium': return '#FFA500';
      case 'low': return '#00FF88';
      default: return '#666';
    }
  };

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'bottleneck': return 'traffic';
      case 'inefficiency': return 'trending-down';
      case 'opportunity': return 'trending-up';
      case 'risk': return 'warning';
      default: return 'info';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'degrading': return 'trending-down';
      case 'stable': return 'trending-flat';
      default: return 'help';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#00FF88';
      case 'degrading': return '#FF3366';
      case 'stable': return '#FFA500';
      default: return '#666';
    }
  };

  const handleApplyRecommendation = (recommendation: OptimizationRecommendation) => {
    if (recommendation.autoApplicable) {
      Alert.alert(
        'Auto-Apply Optimization',
        `Apply "${recommendation.title}" automatically?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: () => {
              // Simulate applying the optimization
              Alert.alert('Success', 'Optimization applied successfully!');
            }
          }
        ]
      );
    } else {
      setSelectedRecommendation(recommendation);
      setShowOptimizationModal(true);
    }
  };

  const renderRecommendations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Optimization Recommendations</Text>
      
      {recommendations.map((recommendation) => (
        <View key={recommendation.id} style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View style={styles.recommendationInfo}>
              <View style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(recommendation.category) + '20' }
              ]}>
                <Text style={[
                  styles.categoryText,
                  { color: getCategoryColor(recommendation.category) }
                ]}>
                  {recommendation.category.toUpperCase()}
                </Text>
              </View>
              
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(recommendation.priority) + '20' }
              ]}>
                <Text style={[
                  styles.priorityText,
                  { color: getPriorityColor(recommendation.priority) }
                ]}>
                  {recommendation.priority.toUpperCase()}
                </Text>
              </View>
            </View>

            {recommendation.autoApplicable && (
              <View style={styles.autoApplicableBadge}>
                <Icon name="auto-fix-high" size={12} color="#00FF88" />
                <Text style={styles.autoApplicableText}>AUTO</Text>
              </View>
            )}
          </View>

          <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
          <Text style={styles.recommendationDescription}>{recommendation.description}</Text>

          <View style={styles.recommendationMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Impact:</Text>
              <Text style={styles.metricValue}>{recommendation.impact}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Effort:</Text>
              <Text style={styles.metricValue}>{recommendation.effort}</Text>
            </View>
          </View>

          {(recommendation.estimatedSavings || recommendation.estimatedImprovement) && (
            <View style={styles.estimatedBenefit}>
              <Icon name="trending-up" size={16} color="#00FF88" />
              <Text style={styles.benefitText}>
                {recommendation.estimatedSavings || recommendation.estimatedImprovement}
              </Text>
            </View>
          )}

          {recommendation.actionable && (
            <TouchableOpacity
              style={[
                styles.applyButton,
                recommendation.autoApplicable && styles.autoApplyButton
              ]}
              onPress={() => handleApplyRecommendation(recommendation)}
            >
              <Icon 
                name={recommendation.autoApplicable ? "auto-fix-high" : "build"} 
                size={16} 
                color="#000" 
              />
              <Text style={styles.applyButtonText}>
                {recommendation.autoApplicable ? 'Auto-Apply' : 'View Details'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderInsights = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Insights</Text>
      
      {insights.map((insight) => (
        <View key={insight.id} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Icon 
              name={getInsightTypeIcon(insight.type)} 
              size={20} 
              color={insight.impact === 'high' ? '#FF3366' : 
                    insight.impact === 'medium' ? '#FFA500' : '#00FF88'} 
            />
            <Text style={styles.insightComponent}>{insight.component}</Text>
            <View style={styles.trendIndicator}>
              <Icon 
                name={getTrendIcon(insight.trend)} 
                size={16} 
                color={getTrendColor(insight.trend)} 
              />
            </View>
          </View>

          <Text style={styles.insightMetric}>{insight.metric}</Text>
          
          <View style={styles.valueComparison}>
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>Current</Text>
              <Text style={[
                styles.valueNumber,
                { color: insight.currentValue > insight.optimalValue ? '#FF3366' : '#00FF88' }
              ]}>
                {insight.currentValue}
              </Text>
            </View>
            
            <Icon name="arrow-forward" size={16} color="#666" />
            
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>Optimal</Text>
              <Text style={[styles.valueNumber, { color: '#00FF88' }]}>
                {insight.optimalValue}
              </Text>
            </View>
          </View>

          <View style={styles.impactIndicator}>
            <Text style={styles.impactLabel}>Impact: </Text>
            <Text style={[
              styles.impactValue,
              { color: insight.impact === 'high' ? '#FF3366' : 
                      insight.impact === 'medium' ? '#FFA500' : '#00FF88' }
            ]}>
              {insight.impact.toUpperCase()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderRecommendations()}
      {renderInsights()}

      {/* Optimization Details Modal */}
      <Modal
        visible={showOptimizationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOptimizationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowOptimizationModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Optimization Details</Text>
            <View style={styles.modalSpacer} />
          </View>

          {selectedRecommendation && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalRecommendationTitle}>
                {selectedRecommendation.title}
              </Text>
              <Text style={styles.modalRecommendationDescription}>
                {selectedRecommendation.description}
              </Text>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Implementation Steps</Text>
                <Text style={styles.modalSectionContent}>
                  Detailed implementation steps would be provided here based on the specific optimization.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Expected Benefits</Text>
                <Text style={styles.modalSectionContent}>
                  {selectedRecommendation.impact}
                </Text>
              </View>

              <TouchableOpacity style={styles.modalApplyButton}>
                <Text style={styles.modalApplyButtonText}>
                  Implement Optimization
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  autoApplicableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoApplicableText: {
    fontSize: 10,
    color: '#00FF88',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  estimatedBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2A1A',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 12,
    color: '#00FF88',
    marginLeft: 6,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
  },
  autoApplyButton: {
    backgroundColor: '#00FF88',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  insightCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightComponent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  trendIndicator: {
    padding: 4,
  },
  insightMetric: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  valueComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  valueItem: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  impactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 12,
    color: '#666',
  },
  impactValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalRecommendationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  modalRecommendationDescription: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 8,
  },
  modalSectionContent: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  modalApplyButton: {
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalApplyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PerformanceOptimizer;
