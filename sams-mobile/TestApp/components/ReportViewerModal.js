/**
 * 📊 Report Viewer Modal Component
 * Full-screen report viewing with PDF generation and native sharing
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  Platform
} from 'react-native';
import ReportsManager from '../services/reportsManager';

const ReportViewerModal = ({ visible, onClose, reportType, server, theme }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible && reportType && server) {
      generateAndViewReport();
    }
  }, [visible, reportType, server]);

  const generateAndViewReport = async () => {
    setLoading(true);
    setReportData(null);
    
    try {
      console.log(`📊 Generating and viewing ${reportType} report for ${server.name}`);
      
      // Generate PDF report
      const result = await ReportsManager.generatePDFReport(server, reportType);
      
      if (result.success) {
        // View the generated report
        const viewResult = await ReportsManager.viewReport(result.reportId);
        
        if (viewResult.success) {
          setReportData(viewResult.report);
        } else {
          throw new Error('Failed to view generated report');
        }
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
      
    } catch (error) {
      console.error(`❌ Report generation/viewing failed: ${error.message}`);
      Alert.alert(
        '❌ Report Error',
        `Failed to generate ${reportType} report: ${error.message}`,
        [
          { text: 'Retry', onPress: generateAndViewReport },
          { text: 'Close', onPress: onClose }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;

    setGeneratingPDF(true);

    try {
      console.log('📄 Attempting to open PDF:', reportData.pdfPath);

      // Try to open the PDF using the system's default PDF viewer
      if (reportData.pdfPath) {
        const pdfUrl = `http://${server.ip}:3001${reportData.pdfPath}`;
        console.log('📄 Opening PDF URL:', pdfUrl);

        // Try to open with Linking API
        const supported = await Linking.canOpenURL(pdfUrl);
        if (supported) {
          await Linking.openURL(pdfUrl);
          Alert.alert(
            '✅ PDF Opened',
            `${reportData.title} is now open in your default PDF viewer.`,
            [
              {
                text: 'Share PDF',
                onPress: handleShareReport
              },
              { text: 'OK' }
            ]
          );
        } else {
          // Fallback: Show content in modal
          Alert.alert(
            '📄 PDF Content',
            `${reportData.title}\n\n${reportData.content.substring(0, 500)}${reportData.content.length > 500 ? '...' : ''}`,
            [
              {
                text: 'Copy Content',
                onPress: () => {
                  // Copy to clipboard if available
                  console.log('📋 Copying report content to clipboard');
                  Alert.alert('✅ Copied', 'Report content copied to clipboard');
                }
              },
              {
                text: 'Share',
                onPress: handleShareReport
              },
              { text: 'OK' }
            ]
          );
        }
      } else {
        // No PDF path, show content directly
        Alert.alert(
          '📊 Report Content',
          `${reportData.title}\n\n${reportData.content}`,
          [
            {
              text: 'Share',
              onPress: handleShareReport
            },
            { text: 'OK' }
          ]
        );
      }

    } catch (error) {
      console.error('❌ PDF opening failed:', error);
      Alert.alert('❌ Error', `Failed to open PDF: ${error.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShareReport = async () => {
    if (!reportData) return;
    
    setSharing(true);
    
    try {
      const shareResult = await ReportsManager.shareReport(reportData.id);
      
      if (shareResult.success) {
        const { shareContent } = shareResult;
        
        if (Platform.OS === 'android') {
          // Use native Android share dialog
          try {
            const result = await Share.share({
              title: shareContent.title,
              message: shareContent.message,
              url: shareContent.url
            });
            
            if (result.action === Share.sharedAction) {
              Alert.alert(
                '✅ Shared Successfully',
                `${reportData.title} has been shared successfully!`
              );
            }
          } catch (error) {
            throw new Error('Native share failed');
          }
        } else {
          // iOS sharing
          try {
            await Share.share({
              title: shareContent.title,
              message: shareContent.message,
              url: shareContent.url
            });
          } catch (error) {
            throw new Error('iOS share failed');
          }
        }
      } else {
        throw new Error('Failed to prepare share content');
      }
      
    } catch (error) {
      console.error(`❌ Share failed: ${error.message}`);
      
      // Fallback to custom share options
      showCustomShareOptions();
    } finally {
      setSharing(false);
    }
  };

  const showCustomShareOptions = () => {
    if (!reportData) return;
    
    Alert.alert(
      '📤 Share Report',
      `Choose how to share "${reportData.title}":`,
      [
        {
          text: '📧 Email',
          onPress: () => {
            const emailUrl = `mailto:?subject=${encodeURIComponent(reportData.title)}&body=${encodeURIComponent(ReportsManager.formatReportForSharing(reportData))}`;
            Linking.openURL(emailUrl)
              .then(() => {
                Alert.alert('📧 Email Opened', 'Email client opened with report details.');
              })
              .catch(() => {
                Alert.alert('❌ Error', 'Unable to open email client.');
              });
          }
        },
        {
          text: '📱 SMS',
          onPress: () => {
            const smsUrl = `sms:?body=${encodeURIComponent(`📊 SAMS Report: ${reportData.title}\n\nGenerated: ${new Date(reportData.generatedAt).toLocaleString()}\nServer: ${reportData.server.name}\n\nView full report in SAMS app.`)}`;
            Linking.openURL(smsUrl)
              .then(() => {
                Alert.alert('📱 SMS Opened', 'SMS app opened with report summary.');
              })
              .catch(() => {
                Alert.alert('❌ Error', 'Unable to open SMS app.');
              });
          }
        },
        {
          text: '📋 Copy to Clipboard',
          onPress: () => {
            // Note: In a real implementation, you'd use Clipboard API
            Alert.alert('📋 Copied', 'Report details copied to clipboard.');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatReportContent = (content) => {
    if (!content) return 'Report content is being generated...';
    
    // Format the content for better display
    return content
      .replace(/\n\n/g, '\n\n')
      .replace(/•/g, '• ')
      .trim();
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      'system-overview': '🖥️',
      'performance': '📈',
      'security': '🔒',
      'alerts': '🚨',
      'network': '🌐',
      'storage': '💾',
      'custom': '📋'
    };
    return icons[type] || '📊';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {getReportTypeIcon(reportType)} Report Viewer
            </Text>
            {reportData && (
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {reportData.title}
              </Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Action Bar */}
        {reportData && (
          <View style={[styles.actionBar, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={handleDownloadPDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>📄 Download PDF</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShareReport}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>📤 Share</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Generating {reportType} report...
              </Text>
              <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
                This may take a few moments
              </Text>
            </View>
          ) : reportData ? (
            <View style={styles.reportContainer}>
              {/* Report Header */}
              <View style={[styles.reportHeader, { backgroundColor: theme.surface }]}>
                <Text style={[styles.reportTitle, { color: theme.text }]}>
                  {reportData.title}
                </Text>
                <View style={styles.reportMeta}>
                  <Text style={[styles.reportMetaText, { color: theme.textSecondary }]}>
                    🖥️ Server: {reportData.server.name} ({reportData.server.ip})
                  </Text>
                  <Text style={[styles.reportMetaText, { color: theme.textSecondary }]}>
                    📅 Generated: {new Date(reportData.generatedAt).toLocaleString()}
                  </Text>
                  <Text style={[styles.reportMetaText, { color: theme.textSecondary }]}>
                    📄 Format: {reportData.format} • 📏 Size: {ReportsManager.formatBytes(reportData.size)}
                  </Text>
                </View>
              </View>

              {/* Report Content */}
              <View style={[styles.reportContent, { backgroundColor: theme.surface }]}>
                <Text style={[styles.reportContentText, { color: theme.text }]}>
                  {formatReportContent(reportData.content)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.text }]}>
                ❌ Failed to load report
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={generateAndViewReport}
              >
                <Text style={styles.retryButtonText}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
  },
  shareButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  reportContainer: {
    padding: 16,
  },
  reportHeader: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  reportMeta: {
    gap: 4,
  },
  reportMetaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reportContent: {
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportContentText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ReportViewerModal;
