#!/bin/bash

# SAMS User Feedback Collection System
# Automated collection and analysis of user feedback during go-live

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT="production"
FEEDBACK_COLLECTION_INTERVAL=300  # 5 minutes
FEEDBACK_API_ENDPOINT="https://api.sams.production.com/api/feedback"
ANALYTICS_API_ENDPOINT="https://api.sams.production.com/api/analytics"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}[FEEDBACK]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

# Function to collect user feedback from API
collect_user_feedback() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_info "Collecting user feedback from API..."
    
    # Collect feedback from the last 5 minutes
    local feedback_data=$(curl -s -X GET \
        "$FEEDBACK_API_ENDPOINT?since=$(date -d '5 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null || echo '{"feedback": []}')
    
    # Parse feedback data
    local total_feedback=$(echo "$feedback_data" | jq '.feedback | length' 2>/dev/null || echo "0")
    local positive_feedback=$(echo "$feedback_data" | jq '[.feedback[] | select(.rating >= 4)] | length' 2>/dev/null || echo "0")
    local negative_feedback=$(echo "$feedback_data" | jq '[.feedback[] | select(.rating <= 2)] | length' 2>/dev/null || echo "0")
    local neutral_feedback=$(echo "$feedback_data" | jq '[.feedback[] | select(.rating == 3)] | length' 2>/dev/null || echo "0")
    
    # Calculate satisfaction score
    local satisfaction_score=0
    if [[ $total_feedback -gt 0 ]]; then
        satisfaction_score=$(echo "scale=2; ($positive_feedback * 100) / $total_feedback" | bc -l 2>/dev/null || echo "0")
    fi
    
    print_metric "[$timestamp] Total Feedback: $total_feedback"
    print_metric "[$timestamp] Positive (4-5★): $positive_feedback"
    print_metric "[$timestamp] Neutral (3★): $neutral_feedback"
    print_metric "[$timestamp] Negative (1-2★): $negative_feedback"
    print_metric "[$timestamp] Satisfaction Score: ${satisfaction_score}%"
    
    # Store feedback metrics
    echo "$timestamp,$total_feedback,$positive_feedback,$neutral_feedback,$negative_feedback,$satisfaction_score" >> user-feedback-metrics.csv
    
    # Alert on low satisfaction
    if (( $(echo "$satisfaction_score < 70" | bc -l 2>/dev/null || echo "0") )) && [[ $total_feedback -gt 5 ]]; then
        print_warning "Low user satisfaction detected: ${satisfaction_score}%"
        send_feedback_alert "LOW_SATISFACTION" "User satisfaction score: ${satisfaction_score}%"
    fi
    
    # Extract and analyze feedback comments
    echo "$feedback_data" | jq -r '.feedback[].comment // empty' | while read -r comment; do
        if [[ -n "$comment" ]]; then
            echo "[$timestamp] Comment: $comment" >> user-feedback-comments.log
            analyze_feedback_sentiment "$comment"
        fi
    done
}

# Function to collect user analytics
collect_user_analytics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_info "Collecting user analytics..."
    
    # Collect analytics from the last 5 minutes
    local analytics_data=$(curl -s -X GET \
        "$ANALYTICS_API_ENDPOINT?since=$(date -d '5 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null || echo '{"analytics": {}}')
    
    # Parse analytics data
    local active_users=$(echo "$analytics_data" | jq '.analytics.active_users // 0' 2>/dev/null || echo "0")
    local page_views=$(echo "$analytics_data" | jq '.analytics.page_views // 0' 2>/dev/null || echo "0")
    local session_duration=$(echo "$analytics_data" | jq '.analytics.avg_session_duration // 0' 2>/dev/null || echo "0")
    local bounce_rate=$(echo "$analytics_data" | jq '.analytics.bounce_rate // 0' 2>/dev/null || echo "0")
    local conversion_rate=$(echo "$analytics_data" | jq '.analytics.conversion_rate // 0' 2>/dev/null || echo "0")
    
    print_metric "[$timestamp] Active Users: $active_users"
    print_metric "[$timestamp] Page Views: $page_views"
    print_metric "[$timestamp] Avg Session Duration: ${session_duration}s"
    print_metric "[$timestamp] Bounce Rate: ${bounce_rate}%"
    print_metric "[$timestamp] Conversion Rate: ${conversion_rate}%"
    
    # Store analytics metrics
    echo "$timestamp,$active_users,$page_views,$session_duration,$bounce_rate,$conversion_rate" >> user-analytics-metrics.csv
    
    # Alert on concerning metrics
    if (( $(echo "$bounce_rate > 70" | bc -l 2>/dev/null || echo "0") )); then
        print_warning "High bounce rate detected: ${bounce_rate}%"
        send_feedback_alert "HIGH_BOUNCE_RATE" "Bounce rate: ${bounce_rate}%"
    fi
    
    if (( $(echo "$session_duration < 60" | bc -l 2>/dev/null || echo "0") )) && [[ $active_users -gt 10 ]]; then
        print_warning "Low session duration detected: ${session_duration}s"
        send_feedback_alert "LOW_SESSION_DURATION" "Average session duration: ${session_duration}s"
    fi
}

# Function to analyze feedback sentiment
analyze_feedback_sentiment() {
    local comment="$1"
    
    # Simple sentiment analysis using keyword matching
    local positive_keywords=("good" "great" "excellent" "amazing" "love" "perfect" "awesome" "fantastic" "wonderful" "satisfied")
    local negative_keywords=("bad" "terrible" "awful" "hate" "horrible" "worst" "disappointed" "frustrated" "broken" "slow")
    
    local sentiment="neutral"
    local comment_lower=$(echo "$comment" | tr '[:upper:]' '[:lower:]')
    
    # Check for positive keywords
    for keyword in "${positive_keywords[@]}"; do
        if [[ "$comment_lower" == *"$keyword"* ]]; then
            sentiment="positive"
            break
        fi
    done
    
    # Check for negative keywords (overrides positive)
    for keyword in "${negative_keywords[@]}"; do
        if [[ "$comment_lower" == *"$keyword"* ]]; then
            sentiment="negative"
            break
        fi
    done
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$timestamp,$sentiment,\"$comment\"" >> feedback-sentiment-analysis.csv
    
    # Alert on negative sentiment
    if [[ "$sentiment" == "negative" ]]; then
        print_warning "Negative feedback detected: $comment"
        send_feedback_alert "NEGATIVE_FEEDBACK" "Negative user comment: $comment"
    fi
}

# Function to collect error reports from users
collect_error_reports() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_info "Collecting user error reports..."
    
    # Collect error reports from the last 5 minutes
    local error_data=$(curl -s -X GET \
        "$FEEDBACK_API_ENDPOINT/errors?since=$(date -d '5 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null || echo '{"errors": []}')
    
    # Parse error data
    local total_errors=$(echo "$error_data" | jq '.errors | length' 2>/dev/null || echo "0")
    local critical_errors=$(echo "$error_data" | jq '[.errors[] | select(.severity == "critical")] | length' 2>/dev/null || echo "0")
    local major_errors=$(echo "$error_data" | jq '[.errors[] | select(.severity == "major")] | length' 2>/dev/null || echo "0")
    local minor_errors=$(echo "$error_data" | jq '[.errors[] | select(.severity == "minor")] | length' 2>/dev/null || echo "0")
    
    print_metric "[$timestamp] Total Error Reports: $total_errors"
    print_metric "[$timestamp] Critical Errors: $critical_errors"
    print_metric "[$timestamp] Major Errors: $major_errors"
    print_metric "[$timestamp] Minor Errors: $minor_errors"
    
    # Store error metrics
    echo "$timestamp,$total_errors,$critical_errors,$major_errors,$minor_errors" >> user-error-reports.csv
    
    # Alert on critical errors
    if [[ $critical_errors -gt 0 ]]; then
        print_error "Critical user errors detected: $critical_errors"
        send_feedback_alert "CRITICAL_USER_ERRORS" "Critical user errors reported: $critical_errors"
        
        # Log critical error details
        echo "$error_data" | jq -r '.errors[] | select(.severity == "critical") | "[\(.timestamp)] \(.message) - \(.details)"' >> critical-user-errors.log
    fi
}

# Function to monitor user behavior patterns
monitor_user_behavior() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_info "Monitoring user behavior patterns..."
    
    # Collect behavior data
    local behavior_data=$(curl -s -X GET \
        "$ANALYTICS_API_ENDPOINT/behavior?since=$(date -d '5 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null || echo '{"behavior": {}}')
    
    # Parse behavior data
    local feature_usage=$(echo "$behavior_data" | jq '.behavior.feature_usage // {}' 2>/dev/null || echo "{}")
    local user_flows=$(echo "$behavior_data" | jq '.behavior.user_flows // {}' 2>/dev/null || echo "{}")
    local abandonment_rate=$(echo "$behavior_data" | jq '.behavior.abandonment_rate // 0' 2>/dev/null || echo "0")
    
    # Most used features
    local top_features=$(echo "$feature_usage" | jq -r 'to_entries | sort_by(.value) | reverse | .[0:3] | .[] | "\(.key): \(.value)"' 2>/dev/null || echo "")
    
    print_metric "[$timestamp] Top Features Used:"
    while IFS= read -r feature; do
        if [[ -n "$feature" ]]; then
            print_metric "  $feature"
        fi
    done <<< "$top_features"
    
    print_metric "[$timestamp] Task Abandonment Rate: ${abandonment_rate}%"
    
    # Store behavior metrics
    echo "$timestamp,$abandonment_rate,\"$top_features\"" >> user-behavior-metrics.csv
    
    # Alert on high abandonment rate
    if (( $(echo "$abandonment_rate > 30" | bc -l 2>/dev/null || echo "0") )); then
        print_warning "High task abandonment rate: ${abandonment_rate}%"
        send_feedback_alert "HIGH_ABANDONMENT_RATE" "Task abandonment rate: ${abandonment_rate}%"
    fi
}

# Function to send feedback alerts
send_feedback_alert() {
    local alert_type=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Log alert
    echo "[$timestamp] FEEDBACK ALERT: $alert_type - $message" >> user-feedback-alerts.log
    
    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local payload=$(cat << EOF
{
  "channel": "#user-feedback",
  "username": "SAMS Feedback Monitor",
  "icon_emoji": ":speech_balloon:",
  "attachments": [
    {
      "color": "warning",
      "title": "User Feedback Alert: $alert_type",
      "text": "$message",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$timestamp",
          "short": true
        }
      ],
      "footer": "SAMS User Feedback System"
    }
  ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Function to generate feedback dashboard
generate_feedback_dashboard() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Calculate summary metrics
    local total_feedback=$(tail -n 12 user-feedback-metrics.csv 2>/dev/null | awk -F',' '{sum+=$2} END {print sum+0}')
    local avg_satisfaction=$(tail -n 12 user-feedback-metrics.csv 2>/dev/null | awk -F',' '{sum+=$6; count++} END {print (count>0) ? sum/count : 0}')
    local total_users=$(tail -n 12 user-analytics-metrics.csv 2>/dev/null | awk -F',' '{sum+=$2} END {print sum+0}')
    local avg_session=$(tail -n 12 user-analytics-metrics.csv 2>/dev/null | awk -F',' '{sum+=$4; count++} END {print (count>0) ? sum/count : 0}')
    
    cat > user-feedback-dashboard.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SAMS User Feedback Dashboard</title>
    <meta http-equiv="refresh" content="300">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background-color: #3498db; color: white; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .metric-card { background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .positive { color: #27ae60; }
        .negative { color: #e74c3c; }
        .neutral { color: #f39c12; }
        .timestamp { text-align: center; margin-top: 20px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💬 SAMS User Feedback Dashboard</h1>
        <p>Environment: $ENVIRONMENT | Last Updated: $timestamp</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">User Satisfaction</div>
            <div class="metric-value positive">${avg_satisfaction}%</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Total Feedback</div>
            <div class="metric-value">📝 $total_feedback</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Active Users</div>
            <div class="metric-value">👥 $total_users</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Avg Session Duration</div>
            <div class="metric-value">⏱️ ${avg_session}s</div>
        </div>
    </div>
    
    <div class="timestamp">
        Dashboard auto-refreshes every 5 minutes
    </div>
</body>
</html>
EOF
    
    print_info "Feedback dashboard updated: user-feedback-dashboard.html"
}

# Function to generate feedback report
generate_feedback_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local duration=$(($(date +%s) - start_timestamp))
    
    # Calculate summary statistics
    local total_feedback=$(awk -F',' '{sum+=$2} END {print sum+0}' user-feedback-metrics.csv 2>/dev/null || echo "0")
    local avg_satisfaction=$(awk -F',' '{sum+=$6; count++} END {print (count>0) ? sum/count : 0}' user-feedback-metrics.csv 2>/dev/null || echo "0")
    local total_alerts=$(wc -l < user-feedback-alerts.log 2>/dev/null || echo "0")
    local total_errors=$(awk -F',' '{sum+=$2} END {print sum+0}' user-error-reports.csv 2>/dev/null || echo "0")
    
    cat > user-feedback-report.json << EOF
{
  "user_feedback_report": {
    "timestamp": "$timestamp",
    "environment": "$ENVIRONMENT",
    "collection_duration_seconds": $duration,
    "summary": {
      "total_feedback_collected": $total_feedback,
      "average_satisfaction_score": $avg_satisfaction,
      "total_alerts_generated": $total_alerts,
      "total_error_reports": $total_errors
    },
    "metrics": {
      "satisfaction_threshold": 70,
      "bounce_rate_threshold": 70,
      "session_duration_threshold": 60,
      "collection_interval_seconds": $FEEDBACK_COLLECTION_INTERVAL
    },
    "insights": [
      "User satisfaction is $(if (( $(echo "$avg_satisfaction >= 70" | bc -l 2>/dev/null || echo "0") )); then echo "above"; else echo "below"; fi) target threshold",
      "Total of $total_feedback feedback items collected during monitoring period",
      "Generated $total_alerts alerts based on user behavior patterns"
    ],
    "recommendations": [
      "Continue monitoring user feedback for trends",
      "Address any recurring negative feedback themes",
      "Optimize features with high abandonment rates"
    ]
  }
}
EOF
    
    print_success "User feedback report generated: user-feedback-report.json"
}

# Main function
main() {
    local duration=${1:-3600}  # Default 1 hour
    
    print_header "💬 SAMS User Feedback Collection"
    print_header "================================="
    print_info "Starting user feedback collection for $duration seconds"
    print_info "Collection interval: ${FEEDBACK_COLLECTION_INTERVAL}s"
    
    # Initialize CSV files
    echo "timestamp,total_feedback,positive,neutral,negative,satisfaction_score" > user-feedback-metrics.csv
    echo "timestamp,active_users,page_views,session_duration,bounce_rate,conversion_rate" > user-analytics-metrics.csv
    echo "timestamp,total_errors,critical,major,minor" > user-error-reports.csv
    echo "timestamp,sentiment,comment" > feedback-sentiment-analysis.csv
    echo "timestamp,abandonment_rate,top_features" > user-behavior-metrics.csv
    
    # Start collection
    start_timestamp=$(date +%s)
    local end_time=$((start_timestamp + duration))
    
    print_success "User feedback collection started"
    print_info "Collection will run until $(date -d @$end_time)"
    
    while [[ $(date +%s) -lt $end_time ]]; do
        collect_user_feedback
        collect_user_analytics
        collect_error_reports
        monitor_user_behavior
        generate_feedback_dashboard
        
        sleep $FEEDBACK_COLLECTION_INTERVAL
    done
    
    print_success "User feedback collection completed"
    generate_feedback_report
    
    print_success "📊 Feedback Collection Summary:"
    print_success "  Duration: ${duration}s"
    print_success "  Report: user-feedback-report.json"
    print_success "  Dashboard: user-feedback-dashboard.html"
    print_success "  Metrics: user-*-metrics.csv"
}

# Signal handling
trap 'print_info "Feedback collection interrupted, generating final report..."; generate_feedback_report; exit 0' INT TERM

# Execute main function
main "$@"
