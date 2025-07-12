/**
 * 🗺️ Implementation Roadmap Screen
 * Comprehensive development roadmap visualization and project management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImplementationRoadmap from '../services/ImplementationRoadmap';
import ProjectTimeline from '../components/ProjectTimeline';
import TeamManagement from '../components/TeamManagement';

const { width } = Dimensions.get('window');

interface Phase {
  id: string;
  name: string;
  description: string;
  duration: string;
  weeks: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
  startDate: Date;
  endDate: Date;
  completionPercentage: number;
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  budget: {
    estimated: number;
    actual: number;
    currency: string;
  };
}

interface Task {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  dependencies: string[];
  completionPercentage: number;
  deliverables: string[];
  acceptanceCriteria: string[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'achieved' | 'missed';
  criticalPath: boolean;
}

interface Risk {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  mitigation: string;
  status: 'open' | 'mitigated' | 'closed';
}

const ImplementationRoadmapScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'timeline' | 'team'>('overview');
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projectSummary, setProjectSummary] = useState<any>(null);

  const roadmap = ImplementationRoadmap.getInstance();

  useEffect(() => {
    loadRoadmapData();
  }, []);

  const loadRoadmapData = () => {
    setPhases(roadmap.getPhases());
    setProjectSummary(roadmap.getProjectSummary());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'achieved': return '#00FF88';
      case 'in-progress': return '#00BFFF';
      case 'not-started':
      case 'pending': return '#666';
      case 'delayed':
      case 'missed': return '#FF3366';
      case 'blocked': return '#FF6B35';
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

  const getRiskColor = (impact: string, probability: string) => {
    if (impact === 'critical' || (impact === 'high' && probability === 'high')) return '#FF3366';
    if (impact === 'high' || probability === 'high') return '#FF6B35';
    if (impact === 'medium' || probability === 'medium') return '#FFA500';
    return '#00FF88';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Project Overview</Text>

      {projectSummary && (
        <>
          {/* Project Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Icon name="schedule" size={24} color="#00FF88" />
              <Text style={styles.summaryValue}>{projectSummary.duration}</Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>

            <View style={styles.summaryCard}>
              <Icon name="trending-up" size={24} color="#00BFFF" />
              <Text style={styles.summaryValue}>{Math.round(projectSummary.overallProgress)}%</Text>
              <Text style={styles.summaryLabel}>Complete</Text>
            </View>

            <View style={styles.summaryCard}>
              <Icon name="attach-money" size={24} color="#9C27B0" />
              <Text style={styles.summaryValue}>{formatCurrency(projectSummary.actualBudget)}</Text>
              <Text style={styles.summaryLabel}>Budget Used</Text>
            </View>

            <View style={styles.summaryCard}>
              <Icon name="group" size={24} color="#FF6B35" />
              <Text style={styles.summaryValue}>{projectSummary.teamSize}</Text>
              <Text style={styles.summaryLabel}>Team Members</Text>
            </View>
          </View>

          {/* Progress Overview */}
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${projectSummary.overallProgress}%` }
              ]} />
            </View>
            <Text style={styles.progressText}>
              {projectSummary.completedTasks} of {projectSummary.totalTasks} tasks completed
            </Text>
          </View>

          {/* Budget Overview */}
          <View style={styles.budgetSection}>
            <Text style={styles.budgetTitle}>Budget Performance</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Estimated:</Text>
              <Text style={styles.budgetValue}>{formatCurrency(projectSummary.totalBudget)}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Actual:</Text>
              <Text style={[
                styles.budgetValue,
                { color: projectSummary.budgetVariance < 0 ? '#00FF88' : '#FF6B35' }
              ]}>
                {formatCurrency(projectSummary.actualBudget)}
              </Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Variance:</Text>
              <Text style={[
                styles.budgetValue,
                { color: projectSummary.budgetVariance < 0 ? '#00FF88' : '#FF6B35' }
              ]}>
                {projectSummary.budgetVariance > 0 ? '+' : ''}{projectSummary.budgetVariance.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Risk Overview */}
          <View style={styles.riskSection}>
            <Text style={styles.riskTitle}>Risk Management</Text>
            <View style={styles.riskStats}>
              <View style={styles.riskStat}>
                <Text style={styles.riskNumber}>{projectSummary.totalRisks}</Text>
                <Text style={styles.riskLabel}>Total Risks</Text>
              </View>
              <View style={styles.riskStat}>
                <Text style={[styles.riskNumber, { color: '#00FF88' }]}>
                  {projectSummary.mitigatedRisks}
                </Text>
                <Text style={styles.riskLabel}>Mitigated</Text>
              </View>
              <View style={styles.riskStat}>
                <Text style={[styles.riskNumber, { color: '#00FF88' }]}>
                  {Math.round(projectSummary.riskMitigationRate)}%
                </Text>
                <Text style={styles.riskLabel}>Success Rate</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderPhases = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Development Phases</Text>

      {phases.map((phase, index) => (
        <TouchableOpacity
          key={phase.id}
          style={styles.phaseCard}
          onPress={() => {
            setSelectedPhase(phase);
            setShowPhaseModal(true);
          }}
        >
          <View style={styles.phaseHeader}>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{phase.name}</Text>
              <Text style={styles.phaseWeeks}>{phase.weeks}</Text>
            </View>
            <View style={[
              styles.phaseStatusBadge,
              { backgroundColor: getStatusColor(phase.status) + '20' }
            ]}>
              <Text style={[styles.phaseStatusText, { color: getStatusColor(phase.status) }]}>
                {phase.status.toUpperCase().replace('-', ' ')}
              </Text>
            </View>
          </View>

          <Text style={styles.phaseDescription}>{phase.description}</Text>

          <View style={styles.phaseProgress}>
            <Text style={styles.phaseProgressLabel}>
              Progress: {Math.round(phase.completionPercentage)}%
            </Text>
            <View style={styles.phaseProgressBar}>
              <View style={[
                styles.phaseProgressFill,
                {
                  width: `${phase.completionPercentage}%`,
                  backgroundColor: getStatusColor(phase.status)
                }
              ]} />
            </View>
          </View>

          <View style={styles.phaseMetrics}>
            <View style={styles.phaseMetric}>
              <Icon name="assignment" size={16} color="#666" />
              <Text style={styles.phaseMetricText}>{phase.tasks.length} tasks</Text>
            </View>
            <View style={styles.phaseMetric}>
              <Icon name="flag" size={16} color="#666" />
              <Text style={styles.phaseMetricText}>{phase.milestones.length} milestones</Text>
            </View>
            <View style={styles.phaseMetric}>
              <Icon name="attach-money" size={16} color="#666" />
              <Text style={styles.phaseMetricText}>{formatCurrency(phase.budget.actual)}</Text>
            </View>
          </View>

          <View style={styles.phaseDates}>
            <Text style={styles.phaseDateText}>
              {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Implementation Roadmap</Text>
          <TouchableOpacity style={styles.infoButton}>
            <Icon name="info" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'dashboard' },
            { key: 'phases', label: 'Phases', icon: 'timeline' },
            { key: 'timeline', label: 'Timeline', icon: 'schedule' },
            { key: 'team', label: 'Team', icon: 'group' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon name={tab.icon} size={16} color={activeTab === tab.key ? "#000" : "#FFF"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'phases' && renderPhases()}
          {activeTab === 'timeline' && <ProjectTimeline />}
          {activeTab === 'team' && <TeamManagement />}
        </View>

        {/* Phase Details Modal */}
        <Modal
          visible={showPhaseModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPhaseModal(false)}
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPhaseModal(false)}>
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedPhase?.name || 'Phase Details'}
              </Text>
              <View style={styles.modalSpacer} />
            </View>

            {selectedPhase && (
              <ScrollView style={styles.modalContent}>
                <Text style={styles.modalPhaseDescription}>
                  {selectedPhase.description}
                </Text>

                {/* Phase Overview */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Overview</Text>
                  <View style={styles.modalOverviewGrid}>
                    <View style={styles.modalOverviewItem}>
                      <Text style={styles.modalOverviewLabel}>Duration</Text>
                      <Text style={styles.modalOverviewValue}>{selectedPhase.duration}</Text>
                    </View>
                    <View style={styles.modalOverviewItem}>
                      <Text style={styles.modalOverviewLabel}>Progress</Text>
                      <Text style={styles.modalOverviewValue}>
                        {Math.round(selectedPhase.completionPercentage)}%
                      </Text>
                    </View>
                    <View style={styles.modalOverviewItem}>
                      <Text style={styles.modalOverviewLabel}>Budget</Text>
                      <Text style={styles.modalOverviewValue}>
                        {formatCurrency(selectedPhase.budget.actual)}
                      </Text>
                    </View>
                    <View style={styles.modalOverviewItem}>
                      <Text style={styles.modalOverviewLabel}>Status</Text>
                      <Text style={[
                        styles.modalOverviewValue,
                        { color: getStatusColor(selectedPhase.status) }
                      ]}>
                        {selectedPhase.status.toUpperCase().replace('-', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tasks */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Tasks ({selectedPhase.tasks.length})</Text>
                  {selectedPhase.tasks.map((task) => (
                    <View key={task.id} style={styles.taskItem}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskName}>{task.name}</Text>
                        <View style={[
                          styles.taskPriorityBadge,
                          { backgroundColor: getPriorityColor(task.priority) + '20' }
                        ]}>
                          <Text style={[
                            styles.taskPriorityText,
                            { color: getPriorityColor(task.priority) }
                          ]}>
                            {task.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.taskDescription}>{task.description}</Text>
                      <View style={styles.taskMetrics}>
                        <Text style={styles.taskMetric}>
                          {task.estimatedHours}h estimated
                        </Text>
                        <Text style={[
                          styles.taskStatus,
                          { color: getStatusColor(task.status) }
                        ]}>
                          {task.status.toUpperCase().replace('-', ' ')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Milestones */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Milestones ({selectedPhase.milestones.length})</Text>
                  {selectedPhase.milestones.map((milestone) => (
                    <View key={milestone.id} style={styles.milestoneItem}>
                      <View style={styles.milestoneHeader}>
                        <Icon
                          name={milestone.criticalPath ? "flag" : "outlined-flag"}
                          size={16}
                          color={milestone.criticalPath ? "#FF6B35" : "#666"}
                        />
                        <Text style={styles.milestoneName}>{milestone.name}</Text>
                        <Text style={[
                          styles.milestoneStatus,
                          { color: getStatusColor(milestone.status) }
                        ]}>
                          {milestone.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                      <Text style={styles.milestoneDate}>
                        Due: {formatDate(milestone.dueDate)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Risks */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Risks ({selectedPhase.risks.length})</Text>
                  {selectedPhase.risks.map((risk) => (
                    <View key={risk.id} style={styles.riskItem}>
                      <View style={styles.riskHeader}>
                        <Icon
                          name="warning"
                          size={16}
                          color={getRiskColor(risk.impact, risk.probability)}
                        />
                        <Text style={styles.riskImpact}>
                          {risk.impact.toUpperCase()} / {risk.probability.toUpperCase()}
                        </Text>
                        <Text style={[
                          styles.riskStatus,
                          { color: getStatusColor(risk.status) }
                        ]}>
                          {risk.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.riskDescription}>{risk.description}</Text>
                      <Text style={styles.riskMitigation}>
                        Mitigation: {risk.mitigation}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  budgetSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  riskSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  riskStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  riskStat: {
    alignItems: 'center',
  },
  riskNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 12,
    color: '#666',
  },
  phaseCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  phaseWeeks: {
    fontSize: 12,
    color: '#666',
  },
  phaseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  phaseDescription: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 12,
    lineHeight: 20,
  },
  phaseProgress: {
    marginBottom: 12,
  },
  phaseProgressLabel: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 6,
    fontWeight: '600',
  },
  phaseProgressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  phaseProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  phaseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  phaseMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseMetricText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  phaseDates: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  phaseDateText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
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
  modalPhaseDescription: {
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
    marginBottom: 12,
  },
  modalOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalOverviewItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
  },
  modalOverviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalOverviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  taskItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  taskPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskPriorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 8,
    lineHeight: 16,
  },
  taskMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMetric: {
    fontSize: 11,
    color: '#666',
  },
  taskStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  milestoneItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  milestoneStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 6,
    lineHeight: 16,
  },
  milestoneDate: {
    fontSize: 11,
    color: '#666',
  },
  riskItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskImpact: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  riskStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  riskDescription: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 6,
    lineHeight: 16,
  },
  riskMitigation: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ImplementationRoadmapScreen;