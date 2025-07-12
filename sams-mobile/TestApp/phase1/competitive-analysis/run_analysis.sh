#!/bin/bash

# SAMS Competitive Analysis Runner
# This script sets up the environment and runs the competitive analysis

echo "🔍 Starting SAMS Competitive Analysis..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🚀 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing requirements..."
pip install -r requirements.txt

# Create output directory
mkdir -p analysis_output

# Run the analysis
echo "🔬 Running competitive analysis..."
python analyzer.py

# Check if analysis completed successfully
if [ $? -eq 0 ]; then
    echo "✅ Analysis completed successfully!"
    echo "📊 Results available in analysis_output/ directory:"
    ls -la analysis_output/
    
    echo ""
    echo "📈 Generated files:"
    echo "  - competitive_analysis_insights.json (Key insights and findings)"
    echo "  - competitor_comparison_matrix.csv (Feature comparison)"
    echo "  - competitor_comparison_matrix.xlsx (Excel format)"
    echo "  - competitive_analysis_charts.png (Visualizations)"
    
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Review the insights in competitive_analysis_insights.json"
    echo "  2. Analyze the feature matrix in the Excel file"
    echo "  3. Use findings to inform SAMS product strategy"
    
else
    echo "❌ Analysis failed. Check the error messages above."
    exit 1
fi

# Deactivate virtual environment
deactivate

echo "🏁 Competitive analysis complete!"
