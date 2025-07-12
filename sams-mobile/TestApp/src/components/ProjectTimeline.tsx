/**
 * 📅 Project Timeline Component
 * Visual Gantt chart representation of the implementation roadmap
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImplementationRoadmap from '../services/ImplementationRoadmap';

const { width } = Dimensions.get('window');

interface TimelineItem {
  id: string;
  name: string;
  type: 'phase' | 'milestone' | 'task';
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  dependencies: string[];
  critical: boolean;
}

interface TimelineWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  label: string;
}

const ProjectTimeline: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'phases' | 'tasks' | 'milestones'>('phases');
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [timelineWeeks, setTimelineWeeks] = useState<TimelineWeek[]>([]);

  const roadmap = ImplementationRoadmap.getInstance();

  React.useEffect(() => {
    generateTimelineData();
  }, [selectedView]);

  const generateTimelineData = () => {
    const phases = roadmap.getPhases();
    const projectStart = new Date('2024-01-01');
    
    // Generate timeline weeks (16 weeks)
    const weeks: TimelineWeek[] = [];
    for (let i = 0; i < 16; i++) {
      const weekStart = new Date(projectStart.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
      weeks.push({
        weekNumber: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        label: `W${i + 1}`
      });
    }
    setTimelineWeeks(weeks);

    // Generate timeline items based on selected view
    let items: TimelineItem[] = [];

    if (selectedView === 'phases') {
      items = phases.map(phase => ({
        id: phase.id,
        name: phase.name,
        type: 'phase' as const,
        startDate: phase.startDate,
        endDate: phase.endDate,
        progress: phase.completionPercentage,
        status: phase.status,
        dependencies: [],
        critical: true
      }));
    } else if (selectedView === 'milestones') {
      phases.forEach(phase => {
        phase.milestones.forEach(milestone => {
          items.push({
            id: milestone.id,
            name: milestone.name,
            type: 'milestone' as const,
            startDate: milestone.dueDate,
            endDate: milestone.dueDate,
            progress: milestone.status === 'achieved' ? 100 : 0,
            status: milestone.status,
            dependencies: [],
            critical: milestone.criticalPath
          });
        });
      });
    } else if (selectedView === 'tasks') {
      phases.forEach(phase => {
        phase.tasks.forEach(task => {
          items.push({
            id: task.id,
            name: task.name,
            type: 'task' as const,
            startDate: phase.startDate,
            endDate: new Date(phase.startDate.getTime() + (task.estimatedHours * 60 * 60 * 1000)),
            progress: task.completionPercentage,
            status: task.status,
            dependencies: task.dependencies,
            critical: task.priority === 'critical'
          });
        });
      });
    }

    setTimelineItems(items);
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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'phase': return 'timeline';
      case 'milestone': return 'flag';
      case 'task': return 'assignment';
      default: return 'circle';
    }
  };

  const calculateItemPosition = (item: TimelineItem) => {
    const projectStart = timelineWeeks[0]?.startDate || new Date();
    const projectDuration = 16 * 7 * 24 * 60 * 60 * 1000; // 16 weeks in milliseconds
    const timelineWidth = width - 200; // Account for item names

    const startOffset = (item.startDate.getTime() - projectStart.getTime()) / projectDuration;
    const duration = (item.endDate.getTime() - item.startDate.getTime()) / projectDuration;

    return {
      left: Math.max(0, startOffset * timelineWidth),
      width: Math.max(4, duration * timelineWidth), // Minimum 4px width for milestones
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderTimelineHeader = () => (
    <View style={styles.timelineHeader}>
      <View style={styles.itemNameHeader}>
        <Text style={styles.headerText}>
          {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeksHeader}>
        {timelineWeeks.map((week) => (
          <View key={week.weekNumber} style={styles.weekHeader}>
            <Text style={styles.weekLabel}>{week.label}</Text>
            <Text style={styles.weekDate}>{formatDate(week.startDate)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderTimelineItem = (item: TimelineItem, index: number) => {
    const position = calculateItemPosition(item);
    
    return (
      <View key={item.id} style={[styles.timelineRow, index % 2 === 0 && styles.timelineRowEven]}>
        <View style={styles.itemName}>
          <Icon 
            name={getItemIcon(item.type)} 
            size={16} 
            color={item.critical ? '#FF6B35' : '#666'} 
          />
          <Text style={[
            styles.itemNameText,
            item.critical && styles.criticalItemText
          ]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        
        <View style={styles.timelineTrack}>
          <View
            style={[
              styles.timelineBar,
              {
                left: position.left,
                width: position.width,
                backgroundColor: getStatusColor(item.status),
              },
              item.type === 'milestone' && styles.milestoneBar
            ]}
          >
            {item.type !== 'milestone' && (
              <View
                style={[
                  styles.progressBar,
                  { width: `${item.progress}%` }
                ]}
              />
            )}
          </View>
          
          {/* Dependencies lines */}
          {item.dependencies.length > 0 && (
            <View style={styles.dependencyLines}>
              {/* Dependency visualization would go here */}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTimelineGrid = () => (
    <View style={styles.timelineGrid}>
      {timelineWeeks.map((week, index) => (
        <View
          key={week.weekNumber}
          style={[
            styles.gridLine,
            { left: (index / timelineWeeks.length) * (width - 200) }
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* View Selector */}
      <View style={styles.viewSelector}>
        {[
          { key: 'phases', label: 'Phases', icon: 'timeline' },
          { key: 'tasks', label: 'Tasks', icon: 'assignment' },
          { key: 'milestones', label: 'Milestones', icon: 'flag' }
        ].map((view) => (
          <TouchableOpacity
            key={view.key}
            style={[
              styles.viewButton,
              selectedView === view.key && styles.viewButtonActive
            ]}
            onPress={() => setSelectedView(view.key as any)}
          >
            <Icon 
              name={view.icon} 
              size={16} 
              color={selectedView === view.key ? "#000" : "#FFF"} 
            />
            <Text style={[
              styles.viewButtonText,
              selectedView === view.key && styles.viewButtonTextActive
            ]}>
              {view.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {renderTimelineHeader()}
        
        <ScrollView style={styles.timelineContent} showsVerticalScrollIndicator={false}>
          {renderTimelineGrid()}
          {timelineItems.map((item, index) => renderTimelineItem(item, index))}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#00FF88' }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#00BFFF' }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#666' }]} />
            <Text style={styles.legendText}>Not Started</Text>
          </View>
          <View style={styles.legendItem}>
            <Icon name="flag" size={12} color="#FF6B35" />
            <Text style={styles.legendText}>Critical Path</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonActive: {
    backgroundColor: '#00FF88',
  },
  viewButtonText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  viewButtonTextActive: {
    color: '#000',
  },
  timeline: {
    flex: 1,
    marginTop: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  itemNameHeader: {
    width: 180,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  weeksHeader: {
    flex: 1,
  },
  weekHeader: {
    width: (width - 200) / 16,
    padding: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  weekDate: {
    fontSize: 10,
    color: '#666',
  },
  timelineContent: {
    flex: 1,
  },
  timelineGrid: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 180,
    right: 0,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#333',
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timelineRowEven: {
    backgroundColor: '#0F0F0F',
  },
  itemName: {
    width: 180,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  itemNameText: {
    fontSize: 12,
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  criticalItemText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  timelineTrack: {
    flex: 1,
    position: 'relative',
    paddingVertical: 15,
  },
  timelineBar: {
    position: 'absolute',
    height: 20,
    borderRadius: 10,
    minWidth: 4,
  },
  milestoneBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
  },
  dependencyLines: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  legend: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ProjectTimeline;
