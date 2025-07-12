#!/usr/bin/env python3
"""
SAMS Competitive Analysis Tool
Analyzes infrastructure monitoring solutions and generates comparison reports
"""

import json
import requests
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import os
from typing import Dict, List, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompetitiveAnalyzer:
    def __init__(self):
        self.competitors = {}
        self.analysis_results = {}
        self.output_dir = "analysis_output"
        os.makedirs(self.output_dir, exist_ok=True)
        
    def load_competitor_data(self):
        """Load competitor data from various sources"""
        self.competitors = {
            "Datadog": {
                "pricing": {"starter": 15, "pro": 23, "enterprise": "custom"},
                "features": ["APM", "Infrastructure", "Logs", "Synthetics", "RUM", "Security"],
                "scalability": "High",
                "deployment": ["Cloud", "SaaS"],
                "integrations": 400,
                "market_share": 15.2,
                "founded": 2010,
                "employees": 3000,
                "revenue": "1.03B",
                "strengths": ["Easy setup", "Great UI", "Extensive integrations"],
                "weaknesses": ["Expensive", "Complex pricing", "Vendor lock-in"]
            },
            "New Relic": {
                "pricing": {"standard": 25, "pro": 99, "enterprise": "custom"},
                "features": ["APM", "Infrastructure", "Browser", "Mobile", "Synthetics", "AI"],
                "scalability": "High",
                "deployment": ["Cloud", "SaaS"],
                "integrations": 350,
                "market_share": 12.8,
                "founded": 2008,
                "employees": 2000,
                "revenue": "720M",
                "strengths": ["Full-stack observability", "AI insights", "Developer-friendly"],
                "weaknesses": ["Pricing complexity", "Learning curve", "Resource intensive"]
            },
            "Nagios": {
                "pricing": {"core": 0, "xi": 1995, "fusion": 3495},
                "features": ["Infrastructure", "Network", "Applications", "Services"],
                "scalability": "Medium",
                "deployment": ["On-premise", "Cloud"],
                "integrations": 200,
                "market_share": 8.5,
                "founded": 1999,
                "employees": 150,
                "revenue": "50M",
                "strengths": ["Open source", "Highly customizable", "Large community"],
                "weaknesses": ["Complex setup", "Outdated UI", "Limited cloud features"]
            },
            "Zabbix": {
                "pricing": {"open_source": 0, "commercial": 2, "enterprise": 5},
                "features": ["Infrastructure", "Network", "Applications", "Cloud"],
                "scalability": "High",
                "deployment": ["On-premise", "Cloud", "Hybrid"],
                "integrations": 150,
                "market_share": 6.2,
                "founded": 2001,
                "employees": 300,
                "revenue": "30M",
                "strengths": ["Free open source", "Scalable", "Template system"],
                "weaknesses": ["Complex configuration", "Limited cloud-native", "UI needs improvement"]
            },
            "PagerDuty": {
                "pricing": {"starter": 19, "professional": 39, "business": 59},
                "features": ["Incident Response", "Alerting", "Automation", "Analytics"],
                "scalability": "High",
                "deployment": ["Cloud", "SaaS"],
                "integrations": 300,
                "market_share": 4.8,
                "founded": 2009,
                "employees": 1000,
                "revenue": "250M",
                "strengths": ["Incident management", "Mobile app", "Automation"],
                "weaknesses": ["Limited monitoring", "Expensive for small teams", "Alert fatigue"]
            },
            "SolarWinds": {
                "pricing": {"sam": 2995, "npm": 1638, "apm": 1274},
                "features": ["Infrastructure", "Network", "Applications", "Database"],
                "scalability": "High",
                "deployment": ["On-premise", "Cloud", "Hybrid"],
                "integrations": 250,
                "market_share": 7.1,
                "founded": 1999,
                "employees": 3000,
                "revenue": "720M",
                "strengths": ["Comprehensive suite", "Enterprise features", "Good support"],
                "weaknesses": ["Complex licensing", "Resource heavy", "Security concerns"]
            },
            "Prometheus": {
                "pricing": {"open_source": 0, "managed": "varies"},
                "features": ["Metrics", "Alerting", "Time-series", "Service Discovery"],
                "scalability": "High",
                "deployment": ["On-premise", "Cloud", "Kubernetes"],
                "integrations": 100,
                "market_share": 9.3,
                "founded": 2012,
                "employees": "Community",
                "revenue": "0",
                "strengths": ["Cloud-native", "Kubernetes integration", "Pull model"],
                "weaknesses": ["No long-term storage", "Limited UI", "Operational complexity"]
            },
            "Grafana": {
                "pricing": {"open_source": 0, "cloud": 50, "enterprise": 200},
                "features": ["Visualization", "Dashboards", "Alerting", "Plugins"],
                "scalability": "High",
                "deployment": ["On-premise", "Cloud", "SaaS"],
                "integrations": 150,
                "market_share": 11.2,
                "founded": 2014,
                "employees": 500,
                "revenue": "100M",
                "strengths": ["Beautiful dashboards", "Plugin ecosystem", "Multi-datasource"],
                "weaknesses": ["Requires data sources", "Complex setup", "Limited alerting"]
            },
            "Elastic Stack": {
                "pricing": {"basic": 0, "gold": 95, "platinum": 125},
                "features": ["Search", "Logging", "Metrics", "APM", "Security"],
                "scalability": "Very High",
                "deployment": ["On-premise", "Cloud", "SaaS"],
                "integrations": 200,
                "market_share": 13.7,
                "founded": 2010,
                "employees": 2500,
                "revenue": "608M",
                "strengths": ["Powerful search", "Scalable", "Open source core"],
                "weaknesses": ["Resource intensive", "Complex tuning", "Licensing changes"]
            },
            "Splunk": {
                "pricing": {"cloud": 150, "enterprise": 2000, "premium": 3000},
                "features": ["Log Management", "SIEM", "APM", "Infrastructure", "Analytics"],
                "scalability": "Very High",
                "deployment": ["On-premise", "Cloud", "Hybrid"],
                "integrations": 2000,
                "market_share": 18.5,
                "founded": 2003,
                "employees": 7000,
                "revenue": "2.36B",
                "strengths": ["Powerful analytics", "Enterprise features", "Extensive integrations"],
                "weaknesses": ["Very expensive", "Complex licensing", "Resource heavy"]
            }
        }
        
    def analyze_pricing(self) -> Dict[str, Any]:
        """Analyze pricing strategies across competitors"""
        pricing_data = []
        
        for name, data in self.competitors.items():
            pricing = data.get("pricing", {})
            for tier, price in pricing.items():
                if isinstance(price, (int, float)):
                    pricing_data.append({
                        "competitor": name,
                        "tier": tier,
                        "price": price,
                        "market_share": data.get("market_share", 0)
                    })
        
        df = pd.DataFrame(pricing_data)
        
        # Calculate pricing insights
        insights = {
            "average_starter_price": df[df["tier"].str.contains("starter|basic|standard", case=False, na=False)]["price"].mean(),
            "average_pro_price": df[df["tier"].str.contains("pro|professional|gold", case=False, na=False)]["price"].mean(),
            "average_enterprise_price": df[df["tier"].str.contains("enterprise|premium|platinum", case=False, na=False)]["price"].mean(),
            "price_range": {"min": df["price"].min(), "max": df["price"].max()},
            "pricing_models": self._analyze_pricing_models()
        }
        
        return insights
    
    def _analyze_pricing_models(self) -> Dict[str, int]:
        """Analyze different pricing models"""
        models = {"freemium": 0, "subscription": 0, "perpetual": 0, "usage_based": 0}
        
        for name, data in self.competitors.items():
            pricing = data.get("pricing", {})
            if any(price == 0 for price in pricing.values()):
                models["freemium"] += 1
            if any(isinstance(price, (int, float)) and price > 0 for price in pricing.values()):
                models["subscription"] += 1
            if "custom" in str(pricing).lower():
                models["usage_based"] += 1
                
        return models
    
    def analyze_features(self) -> Dict[str, Any]:
        """Analyze feature coverage across competitors"""
        all_features = set()
        for data in self.competitors.values():
            all_features.update(data.get("features", []))
        
        feature_matrix = {}
        for feature in all_features:
            feature_matrix[feature] = []
            for name, data in self.competitors.items():
                has_feature = feature in data.get("features", [])
                feature_matrix[feature].append({"competitor": name, "has_feature": has_feature})
        
        # Calculate feature coverage
        coverage = {}
        for feature, competitors in feature_matrix.items():
            coverage[feature] = sum(1 for c in competitors if c["has_feature"]) / len(competitors) * 100
        
        return {
            "feature_matrix": feature_matrix,
            "coverage_percentage": coverage,
            "most_common_features": sorted(coverage.items(), key=lambda x: x[1], reverse=True)[:5],
            "unique_features": [f for f, c in coverage.items() if c < 30]
        }
    
    def identify_market_gaps(self) -> Dict[str, Any]:
        """Identify market gaps and opportunities"""
        gaps = {
            "pricing_gaps": [],
            "feature_gaps": [],
            "deployment_gaps": [],
            "market_opportunities": []
        }
        
        # Pricing gaps
        pricing_analysis = self.analyze_pricing()
        if pricing_analysis["average_starter_price"] > 20:
            gaps["pricing_gaps"].append("Affordable starter tier opportunity")
        
        # Feature gaps
        feature_analysis = self.analyze_features()
        for feature, coverage in feature_analysis["coverage_percentage"].items():
            if coverage < 50:
                gaps["feature_gaps"].append(f"Low coverage for {feature} ({coverage:.1f}%)")
        
        # Deployment gaps
        deployment_types = {}
        for data in self.competitors.values():
            for deployment in data.get("deployment", []):
                deployment_types[deployment] = deployment_types.get(deployment, 0) + 1
        
        total_competitors = len(self.competitors)
        for deployment, count in deployment_types.items():
            coverage = count / total_competitors * 100
            if coverage < 60:
                gaps["deployment_gaps"].append(f"Limited {deployment} options ({coverage:.1f}%)")
        
        # Market opportunities
        gaps["market_opportunities"] = [
            "AI-powered predictive monitoring",
            "Edge computing monitoring",
            "Serverless monitoring optimization",
            "Cost optimization insights",
            "Developer-first monitoring experience",
            "No-code alert configuration",
            "Mobile-first monitoring",
            "Sustainability metrics tracking"
        ]
        
        return gaps
    
    def generate_comparison_matrix(self) -> pd.DataFrame:
        """Generate feature comparison matrix"""
        matrix_data = []
        
        for name, data in self.competitors.items():
            row = {
                "Solution": name,
                "Market Share (%)": data.get("market_share", 0),
                "Founded": data.get("founded", "Unknown"),
                "Employees": data.get("employees", "Unknown"),
                "Revenue": data.get("revenue", "Unknown"),
                "Scalability": data.get("scalability", "Unknown"),
                "Integrations": data.get("integrations", 0),
                "Deployment Options": ", ".join(data.get("deployment", [])),
                "Key Strengths": ", ".join(data.get("strengths", [])[:2]),
                "Main Weaknesses": ", ".join(data.get("weaknesses", [])[:2])
            }
            
            # Add feature columns
            all_features = ["APM", "Infrastructure", "Logs", "Synthetics", "Security", "AI", "Mobile"]
            for feature in all_features:
                row[f"Has {feature}"] = "✓" if feature in data.get("features", []) else "✗"
            
            matrix_data.append(row)
        
        return pd.DataFrame(matrix_data)
    
    def create_visualizations(self):
        """Create visualization charts"""
        # Market share pie chart
        plt.figure(figsize=(12, 8))
        
        plt.subplot(2, 2, 1)
        names = list(self.competitors.keys())
        market_shares = [data.get("market_share", 0) for data in self.competitors.values()]
        plt.pie(market_shares, labels=names, autopct='%1.1f%%', startangle=90)
        plt.title("Market Share Distribution")
        
        # Pricing comparison
        plt.subplot(2, 2, 2)
        pricing_data = []
        labels = []
        for name, data in self.competitors.items():
            pricing = data.get("pricing", {})
            if "pro" in pricing or "professional" in pricing:
                price = pricing.get("pro", pricing.get("professional", 0))
                if isinstance(price, (int, float)):
                    pricing_data.append(price)
                    labels.append(name)
        
        plt.bar(labels, pricing_data)
        plt.title("Professional Tier Pricing Comparison")
        plt.xticks(rotation=45)
        plt.ylabel("Price ($)")
        
        # Integration count
        plt.subplot(2, 2, 3)
        integrations = [data.get("integrations", 0) for data in self.competitors.values()]
        plt.bar(names, integrations)
        plt.title("Number of Integrations")
        plt.xticks(rotation=45)
        plt.ylabel("Integrations")
        
        # Feature coverage heatmap
        plt.subplot(2, 2, 4)
        feature_analysis = self.analyze_features()
        features = list(feature_analysis["coverage_percentage"].keys())[:8]
        coverage_data = []
        
        for name in names:
            row = []
            for feature in features:
                has_feature = feature in self.competitors[name].get("features", [])
                row.append(1 if has_feature else 0)
            coverage_data.append(row)
        
        sns.heatmap(coverage_data, xticklabels=features, yticklabels=names, 
                   annot=True, cmap="YlOrRd", cbar=False)
        plt.title("Feature Coverage Matrix")
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig(f"{self.output_dir}/competitive_analysis_charts.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def generate_report(self) -> str:
        """Generate comprehensive analysis report"""
        self.load_competitor_data()
        
        pricing_insights = self.analyze_pricing()
        feature_insights = self.analyze_features()
        market_gaps = self.identify_market_gaps()
        comparison_matrix = self.generate_comparison_matrix()
        
        # Save comparison matrix
        comparison_matrix.to_csv(f"{self.output_dir}/competitor_comparison_matrix.csv", index=False)
        comparison_matrix.to_excel(f"{self.output_dir}/competitor_comparison_matrix.xlsx", index=False)
        
        # Create visualizations
        self.create_visualizations()
        
        # Generate insights
        insights = {
            "analysis_date": datetime.now().isoformat(),
            "total_competitors_analyzed": len(self.competitors),
            "pricing_insights": pricing_insights,
            "feature_insights": feature_insights,
            "market_gaps": market_gaps,
            "key_findings": self._generate_key_findings(pricing_insights, feature_insights, market_gaps),
            "recommendations": self._generate_recommendations(market_gaps)
        }
        
        # Save insights as JSON
        with open(f"{self.output_dir}/competitive_analysis_insights.json", "w") as f:
            json.dump(insights, f, indent=2, default=str)
        
        logger.info(f"Analysis complete! Results saved to {self.output_dir}/")
        return json.dumps(insights, indent=2, default=str)
    
    def _generate_key_findings(self, pricing, features, gaps) -> List[str]:
        """Generate key findings from analysis"""
        findings = []
        
        # Pricing findings
        avg_starter = pricing.get("average_starter_price", 0)
        if avg_starter > 20:
            findings.append(f"Average starter pricing is high at ${avg_starter:.0f}/month - opportunity for affordable entry")
        
        # Feature findings
        most_common = features.get("most_common_features", [])
        if most_common:
            findings.append(f"Most essential features: {', '.join([f[0] for f in most_common[:3]])}")
        
        # Market findings
        findings.append(f"Identified {len(gaps['market_opportunities'])} market opportunities")
        findings.append("Open source solutions gaining traction (Prometheus, Grafana)")
        findings.append("Cloud-native monitoring becoming standard requirement")
        
        return findings
    
    def _generate_recommendations(self, gaps) -> List[str]:
        """Generate strategic recommendations"""
        recommendations = [
            "Focus on mobile-first monitoring experience - underserved market",
            "Implement AI-powered predictive analytics for differentiation",
            "Offer competitive pricing with transparent, simple tiers",
            "Prioritize ease of setup and configuration",
            "Build strong Kubernetes and cloud-native integrations",
            "Develop no-code/low-code alert configuration",
            "Focus on developer experience and API-first approach",
            "Consider freemium model with valuable free tier"
        ]
        
        return recommendations

if __name__ == "__main__":
    analyzer = CompetitiveAnalyzer()
    report = analyzer.generate_report()
    print("Competitive Analysis Complete!")
    print(f"Results saved to: {analyzer.output_dir}/")
