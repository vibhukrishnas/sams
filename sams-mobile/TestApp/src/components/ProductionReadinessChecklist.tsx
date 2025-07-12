/**
 * ✅ Production Readiness Checklist Component
 * Comprehensive deployment validation and go-live preparation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QualityAssurance from '../services/QualityAssurance';

interface ChecklistItem {
  id: string;
  category: 'performance' | 'security' | 'documentation' | 'monitoring' | 'backup' | 'incident-response';
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'not-applicable';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: Date;
  completedDate?: Date;
  evidence?: string[];
  blockers?: string[];
}

interface CategorySummary {
  category: string;
  total: number;
  completed: number;
  pending: number;
  failed: number;
  completionRate: number;
  criticalBlocked: boolean;
}

const ProductionReadinessChecklist: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [overallReadiness, setOverallReadiness] = useState<{
    ready: boolean;
    completionRate: number;
    criticalIssues: number;
    blockers: number;
  }>({ ready: false, completionRate: 0, criticalIssues: 0, blockers: 0 });

  const qa = QualityAssurance.getInstance();

  useEffect(() => {
    loadChecklistData();
  }, []);

  const loadChecklistData = () => {
    const items = qa.getProductionChecklist();
    setChecklist(items);
    
    const summaries = generateCategorySummaries(items);
    setCategorySummaries(summaries);
    
    const readiness = calculateOverallReadiness(items);
    setOverallReadiness(readiness);
  };

  const generateCategorySummaries = (items: ChecklistItem[]): CategorySummary[] => {
    const categories = ['performance', 'security', 'documentation', 'monitoring', 'backup', 'incident-response'];
    
    return categories.map(category => {
      const categoryItems = items.filter(item => item.category === category);
      const completed = categoryItems.filter(item => item.status === 'completed').length;
      const pending = categoryItems.filter(item => item.status === 'pending' || item.status === 'in-progress').length;
      const failed = categoryItems.filter(item => item.status === 'failed').length;
      const criticalBlocked = categoryItems.some(item => 
        item.priority === 'critical' && (item.status === 'failed' || item.blockers?.length)
      );
      
      return {
        category,
        total: categoryItems.length,
        completed,
        pending,
        failed,
        completionRate: categoryItems.length > 0 ? (completed / categoryItems.length) * 100 : 0,
        criticalBlocked
      };
    });
  };

  const calculateOverallReadiness = (items: ChecklistItem[]) => {
    const total = items.length;
    const completed = items.filter(item => item.status === 'completed').length;
    const criticalIssues = items.filter(item => 
      item.priority === 'critical' && item.status !== 'completed'
    ).length;
    const blockers = items.filter(item => item.blockers?.length).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const ready = criticalIssues === 0 && blockers === 0 && completionRate >= 95;
    
    return {
      ready,
      completionRate,
      criticalIssues,
      blockers
    };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return 'speed';
      case 'security': return 'security';
      case 'documentation': return 'description';
      case 'monitoring': return 'monitor';
      case 'backup': return 'backup';
      case 'incident-response': return 'emergency';
      default: return 'check-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00FF88';
      case 'in-progress': return '#00BFFF';
      case 'pending': return '#FFA500';
      case 'failed': return '#FF3366';
      case 'not-applicable': return '#666';
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const updateItemStatus = (itemId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Mark this item as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // In a real implementation, this would update the backend
            const updatedChecklist = checklist.map(item => 
              item.id === itemId 
                ? { 
                    ...item, 
                    status: newStatus as any,
                    completedDate: newStatus === 'completed' ? new Date() : undefined
                  }
                : item
            );
            setChecklist(updatedChecklist);
            
            const summaries = generateCategorySummaries(updatedChecklist);
            setCategorySummaries(summaries);
            
            const readiness = calculateOverallReadiness(updatedChecklist);
            setOverallReadiness(readiness);
            
            setShowItemModal(false);
          }
        }
      ]
    );
  };

  const filteredItems = selectedCategory === 'all' 
    ? checklist 
    : checklist.filter(item => item.category === selectedCategory);

  const renderOverallStatus = () => (
    <View style={styles.overallStatus}>
      <View style={[
        styles.readinessCard,
        { borderLeftColor: overallReadiness.ready ? '#00FF88' : '#FF3366' }
      ]}>
        <Icon 
          name={overallReadiness.ready ? "verified" : "warning"} 
          size={32} 
          color={overallReadiness.ready ? '#00FF88' : '#FF3366'} 
        />
        <View style={styles.readinessInfo}>
          <Text style={styles.readinessTitle}>
            {overallReadiness.ready ? 'Production Ready' : 'Not Ready for Production'}
          </Text>
          <Text style={styles.readinessSubtitle}>
            {overallReadiness.completionRate.toFixed(1)}% complete
          </Text>
        </View>
        <View style={styles.readinessMetrics}>
          <Text style={styles.readinessMetric}>
            {overallReadiness.criticalIssues} critical issues
          </Text>
          <Text style={styles.readinessMetric}>
            {overallReadiness.blockers} blockers
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCategorySummaries = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.categoryCard,
            selectedCategory === 'all' && styles.categoryCardActive
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Icon name="dashboard" size={20} color="#00FF88" />
          <Text style={styles.categoryName}>All</Text>
          <Text style={styles.categoryCount}>{checklist.length}</Text>
        </TouchableOpacity>
        
        {categorySummaries.map((summary) => (
          <TouchableOpacity
            key={summary.category}
            style={[
              styles.categoryCard,
              selectedCategory === summary.category && styles.categoryCardActive,
              summary.criticalBlocked && styles.categoryCardBlocked
            ]}
            onPress={() => setSelectedCategory(summary.category)}
          >
            <Icon 
              name={getCategoryIcon(summary.category)} 
              size={20} 
              color={summary.criticalBlocked ? '#FF3366' : '#00FF88'} 
            />
            <Text style={styles.categoryName}>
              {summary.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Text style={styles.categoryCount}>{summary.completed}/{summary.total}</Text>
            <View style={styles.categoryProgress}>
              <View style={[
                styles.categoryProgressFill,
                { 
                  width: `${summary.completionRate}%`,
                  backgroundColor: summary.completionRate === 100 ? '#00FF88' : '#FFA500'
                }
              ]} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderChecklistItems = () => (
    <View style={styles.itemsSection}>
      <Text style={styles.sectionTitle}>
        {selectedCategory === 'all' ? 'All Items' : 
         selectedCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Items
      </Text>
      
      {filteredItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.checklistItem}
          onPress={() => {
            setSelectedItem(item);
            setShowItemModal(true);
          }}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Icon 
                name={getCategoryIcon(item.category)} 
                size={16} 
                color={getStatusColor(item.status)} 
              />
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <View style={styles.itemBadges}>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(item.priority) + '20' }
              ]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority.toUpperCase()}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' }
              ]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.toUpperCase().replace('-', ' ')}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.itemDescription}>{item.description}</Text>

          <View style={styles.itemFooter}>
            <Text style={styles.itemAssignee}>Assigned to: {item.assignee}</Text>
            <Text style={styles.itemDueDate}>
              Due: {formatDate(item.dueDate)}
            </Text>
          </View>

          {item.blockers && item.blockers.length > 0 && (
            <View style={styles.blockersContainer}>
              <Icon name="block" size={14} color="#FF3366" />
              <Text style={styles.blockersText}>
                {item.blockers.length} blocker{item.blockers.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOverallStatus()}
        {renderCategorySummaries()}
        {renderChecklistItems()}
      </ScrollView>

      {/* Item Details Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Checklist Item</Text>
            <View style={styles.modalSpacer} />
          </View>

          {selectedItem && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalItemName}>{selectedItem.name}</Text>
              <Text style={styles.modalItemDescription}>{selectedItem.description}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Details</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Category:</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedItem.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Priority:</Text>
                  <Text style={[
                    styles.modalDetailValue,
                    { color: getPriorityColor(selectedItem.priority) }
                  ]}>
                    {selectedItem.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Assignee:</Text>
                  <Text style={styles.modalDetailValue}>{selectedItem.assignee}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Due Date:</Text>
                  <Text style={styles.modalDetailValue}>{formatDate(selectedItem.dueDate)}</Text>
                </View>
                {selectedItem.completedDate && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Completed:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedItem.completedDate)}</Text>
                  </View>
                )}
              </View>

              {selectedItem.evidence && selectedItem.evidence.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Evidence</Text>
                  {selectedItem.evidence.map((evidence, index) => (
                    <View key={index} style={styles.evidenceItem}>
                      <Icon name="attach-file" size={16} color="#00FF88" />
                      <Text style={styles.evidenceText}>{evidence}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedItem.blockers && selectedItem.blockers.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Blockers</Text>
                  {selectedItem.blockers.map((blocker, index) => (
                    <View key={index} style={styles.blockerItem}>
                      <Icon name="block" size={16} color="#FF3366" />
                      <Text style={styles.blockerText}>{blocker}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedItem.status !== 'completed' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => updateItemStatus(selectedItem.id, 'completed')}
                  >
                    <Icon name="check-circle" size={20} color="#000" />
                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overallStatus: {
    marginBottom: 20,
  },
  readinessCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  readinessInfo: {
    marginLeft: 16,
    flex: 1,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  readinessSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  readinessMetrics: {
    alignItems: 'flex-end',
  },
  readinessMetric: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  categoryCardActive: {
    backgroundColor: '#00FF88',
  },
  categoryCardBlocked: {
    borderWidth: 2,
    borderColor: '#FF3366',
  },
  categoryName: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  categoryProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  itemsSection: {
    flex: 1,
  },
  checklistItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 8,
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemAssignee: {
    fontSize: 11,
    color: '#666',
  },
  itemDueDate: {
    fontSize: 11,
    color: '#666',
  },
  blockersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  blockersText: {
    fontSize: 11,
    color: '#FF3366',
    marginLeft: 4,
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
  modalItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  modalItemDescription: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 8,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  evidenceText: {
    fontSize: 12,
    color: '#00FF88',
    marginLeft: 6,
  },
  blockerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  blockerText: {
    fontSize: 12,
    color: '#FF3366',
    marginLeft: 6,
  },
  modalActions: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProductionReadinessChecklist;
