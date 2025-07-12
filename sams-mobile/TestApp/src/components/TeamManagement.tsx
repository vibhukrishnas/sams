/**
 * 👥 Team Management Component
 * Team allocation, workload management, and resource planning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImplementationRoadmap from '../services/ImplementationRoadmap';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availability: number;
  currentTasks: string[];
  workload: {
    thisWeek: number;
    nextWeek: number;
    total: number;
  };
  performance: {
    tasksCompleted: number;
    onTimeDelivery: number;
    qualityScore: number;
  };
}

interface WorkloadData {
  week: string;
  members: {
    [memberId: string]: {
      allocated: number;
      capacity: number;
      utilization: number;
    };
  };
}

const TeamManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'workload' | 'skills'>('overview');

  const roadmap = ImplementationRoadmap.getInstance();

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = () => {
    const team = roadmap.getTeam();
    
    // Enhance team data with workload and performance metrics
    const enhancedTeam: TeamMember[] = team.map(member => ({
      ...member,
      workload: {
        thisWeek: Math.floor(Math.random() * 40) + 20, // 20-60 hours
        nextWeek: Math.floor(Math.random() * 40) + 20,
        total: Math.floor(Math.random() * 30) + 35, // 35-65 hours/week
      },
      performance: {
        tasksCompleted: Math.floor(Math.random() * 20) + 15,
        onTimeDelivery: Math.floor(Math.random() * 20) + 80, // 80-100%
        qualityScore: Math.floor(Math.random() * 15) + 85, // 85-100%
      }
    }));

    setTeamMembers(enhancedTeam);
    generateWorkloadData(enhancedTeam);
  };

  const generateWorkloadData = (team: TeamMember[]) => {
    const weeks = ['Week 13', 'Week 14', 'Week 15', 'Week 16'];
    const workload: WorkloadData[] = weeks.map(week => ({
      week,
      members: team.reduce((acc, member) => {
        const allocated = Math.floor(Math.random() * 35) + 25; // 25-60 hours
        const capacity = 40; // Standard 40-hour work week
        acc[member.id] = {
          allocated,
          capacity,
          utilization: (allocated / capacity) * 100
        };
        return acc;
      }, {} as any)
    }));

    setWorkloadData(workload);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'project manager': return '#9C27B0';
      case 'solution architect': return '#FF6B35';
      case 'senior react native developer': return '#00FF88';
      case 'backend developer': return '#00BFFF';
      case 'devops engineer': return '#FFA500';
      case 'qa engineer': return '#E91E63';
      default: return '#666';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return '#FF3366';
    if (utilization >= 75) return '#FF6B35';
    if (utilization >= 60) return '#FFA500';
    return '#00FF88';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return '#00FF88';
    if (score >= 80) return '#00BFFF';
    if (score >= 70) return '#FFA500';
    return '#FF3366';
  };

  const renderTeamOverview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Team Overview</Text>
      
      {teamMembers.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={styles.memberCard}
          onPress={() => {
            setSelectedMember(member);
            setShowMemberModal(true);
          }}
        >
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={[
                styles.roleBadge,
                { backgroundColor: getRoleColor(member.role) + '20' }
              ]}>
                <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                  {member.role}
                </Text>
              </View>
            </View>
            <View style={styles.availabilityIndicator}>
              <Text style={styles.availabilityText}>{member.availability}%</Text>
              <Text style={styles.availabilityLabel}>Available</Text>
            </View>
          </View>

          <View style={styles.memberMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{member.workload.thisWeek}h</Text>
              <Text style={styles.metricLabel}>This Week</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{member.currentTasks.length}</Text>
              <Text style={styles.metricLabel}>Active Tasks</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[
                styles.metricValue,
                { color: getPerformanceColor(member.performance.onTimeDelivery) }
              ]}>
                {member.performance.onTimeDelivery}%
              </Text>
              <Text style={styles.metricLabel}>On Time</Text>
            </View>
          </View>

          <View style={styles.skillsContainer}>
            <Text style={styles.skillsLabel}>Skills:</Text>
            <View style={styles.skillsList}>
              {member.skills.slice(0, 3).map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {member.skills.length > 3 && (
                <Text style={styles.moreSkills}>+{member.skills.length - 3} more</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderWorkloadView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Team Workload</Text>
      
      {workloadData.map((weekData) => (
        <View key={weekData.week} style={styles.workloadWeek}>
          <Text style={styles.weekTitle}>{weekData.week}</Text>
          
          {teamMembers.map((member) => {
            const memberWorkload = weekData.members[member.id];
            if (!memberWorkload) return null;

            return (
              <View key={member.id} style={styles.workloadRow}>
                <View style={styles.workloadMember}>
                  <Text style={styles.workloadMemberName}>{member.name}</Text>
                  <Text style={styles.workloadMemberRole}>{member.role}</Text>
                </View>
                
                <View style={styles.workloadBar}>
                  <View style={styles.workloadTrack}>
                    <View
                      style={[
                        styles.workloadFill,
                        {
                          width: `${Math.min(memberWorkload.utilization, 100)}%`,
                          backgroundColor: getUtilizationColor(memberWorkload.utilization)
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.workloadText}>
                    {memberWorkload.allocated}h / {memberWorkload.capacity}h
                  </Text>
                </View>
                
                <Text style={[
                  styles.utilizationText,
                  { color: getUtilizationColor(memberWorkload.utilization) }
                ]}>
                  {Math.round(memberWorkload.utilization)}%
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );

  const renderSkillsMatrix = () => {
    const allSkills = Array.from(new Set(teamMembers.flatMap(m => m.skills)));
    
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Skills Matrix</Text>
        
        <View style={styles.skillsMatrix}>
          <View style={styles.skillsHeader}>
            <Text style={styles.skillsHeaderText}>Team Member</Text>
            {allSkills.slice(0, 6).map((skill) => (
              <Text key={skill} style={styles.skillHeaderText}>{skill}</Text>
            ))}
          </View>
          
          {teamMembers.map((member) => (
            <View key={member.id} style={styles.skillsRow}>
              <Text style={styles.skillsMemberName}>{member.name}</Text>
              {allSkills.slice(0, 6).map((skill) => (
                <View key={skill} style={styles.skillCell}>
                  {member.skills.includes(skill) ? (
                    <Icon name="check-circle" size={16} color="#00FF88" />
                  ) : (
                    <Icon name="radio-button-unchecked" size={16} color="#333" />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Selector */}
      <View style={styles.viewSelector}>
        {[
          { key: 'overview', label: 'Overview', icon: 'people' },
          { key: 'workload', label: 'Workload', icon: 'assessment' },
          { key: 'skills', label: 'Skills', icon: 'star' }
        ].map((view) => (
          <TouchableOpacity
            key={view.key}
            style={[
              styles.viewButton,
              activeView === view.key && styles.viewButtonActive
            ]}
            onPress={() => setActiveView(view.key as any)}
          >
            <Icon 
              name={view.icon} 
              size={16} 
              color={activeView === view.key ? "#000" : "#FFF"} 
            />
            <Text style={[
              styles.viewButtonText,
              activeView === view.key && styles.viewButtonTextActive
            ]}>
              {view.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeView === 'overview' && renderTeamOverview()}
      {activeView === 'workload' && renderWorkloadView()}
      {activeView === 'skills' && renderSkillsMatrix()}

      {/* Member Details Modal */}
      <Modal
        visible={showMemberModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedMember?.name || 'Team Member'}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          {selectedMember && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.memberDetails}>
                <Text style={styles.memberDetailRole}>{selectedMember.role}</Text>
                
                <View style={styles.performanceSection}>
                  <Text style={styles.performanceSectionTitle}>Performance Metrics</Text>
                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceValue}>
                        {selectedMember.performance.tasksCompleted}
                      </Text>
                      <Text style={styles.performanceLabel}>Tasks Completed</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text style={[
                        styles.performanceValue,
                        { color: getPerformanceColor(selectedMember.performance.onTimeDelivery) }
                      ]}>
                        {selectedMember.performance.onTimeDelivery}%
                      </Text>
                      <Text style={styles.performanceLabel}>On-Time Delivery</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text style={[
                        styles.performanceValue,
                        { color: getPerformanceColor(selectedMember.performance.qualityScore) }
                      ]}>
                        {selectedMember.performance.qualityScore}%
                      </Text>
                      <Text style={styles.performanceLabel}>Quality Score</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.skillsSection}>
                  <Text style={styles.skillsSectionTitle}>Skills & Expertise</Text>
                  <View style={styles.allSkillsList}>
                    {selectedMember.skills.map((skill, index) => (
                      <View key={index} style={styles.skillTagLarge}>
                        <Text style={styles.skillTextLarge}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.workloadSection}>
                  <Text style={styles.workloadSectionTitle}>Current Workload</Text>
                  <View style={styles.workloadDetails}>
                    <View style={styles.workloadDetailItem}>
                      <Text style={styles.workloadDetailLabel}>This Week:</Text>
                      <Text style={styles.workloadDetailValue}>
                        {selectedMember.workload.thisWeek} hours
                      </Text>
                    </View>
                    <View style={styles.workloadDetailItem}>
                      <Text style={styles.workloadDetailLabel}>Next Week:</Text>
                      <Text style={styles.workloadDetailValue}>
                        {selectedMember.workload.nextWeek} hours
                      </Text>
                    </View>
                    <View style={styles.workloadDetailItem}>
                      <Text style={styles.workloadDetailLabel}>Availability:</Text>
                      <Text style={[
                        styles.workloadDetailValue,
                        { color: selectedMember.availability >= 80 ? '#00FF88' : '#FFA500' }
                      ]}>
                        {selectedMember.availability}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  availabilityIndicator: {
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  availabilityLabel: {
    fontSize: 10,
    color: '#666',
  },
  memberMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
  },
  skillsContainer: {
    marginTop: 8,
  },
  skillsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  skillTag: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 10,
    color: '#FFF',
  },
  moreSkills: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  workloadWeek: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 12,
  },
  workloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workloadMember: {
    width: 120,
  },
  workloadMemberName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  workloadMemberRole: {
    fontSize: 10,
    color: '#666',
  },
  workloadBar: {
    flex: 1,
    marginHorizontal: 12,
  },
  workloadTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 4,
  },
  workloadFill: {
    height: '100%',
    borderRadius: 4,
  },
  workloadText: {
    fontSize: 10,
    color: '#666',
  },
  utilizationText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  skillsMatrix: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  skillsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 8,
  },
  skillsHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    width: 120,
  },
  skillHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    width: 60,
    textAlign: 'center',
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  skillsMemberName: {
    fontSize: 12,
    color: '#FFF',
    width: 120,
  },
  skillCell: {
    width: 60,
    alignItems: 'center',
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
  memberDetails: {
    flex: 1,
  },
  memberDetailRole: {
    fontSize: 16,
    color: '#00FF88',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  performanceSection: {
    marginBottom: 24,
  },
  performanceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  skillsSection: {
    marginBottom: 24,
  },
  skillsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  allSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTagLarge: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillTextLarge: {
    fontSize: 12,
    color: '#FFF',
  },
  workloadSection: {
    marginBottom: 24,
  },
  workloadSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  workloadDetails: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
  },
  workloadDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workloadDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  workloadDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default TeamManagement;
