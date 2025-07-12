import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  State,
  Animated,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface RangeSliderProps {
  min: number;
  max: number;
  values: [number, number];
  onValuesChange: (values: [number, number]) => void;
  step?: number;
  renderThumb?: () => React.ReactNode;
  renderRail?: () => React.ReactNode;
  renderRailSelected?: () => React.ReactNode;
  style?: any;
  disabled?: boolean;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  values,
  onValuesChange,
  step = 1,
  renderThumb,
  renderRail,
  renderRailSelected,
  style,
  disabled = false,
}) => {
  const [sliderWidth, setSliderWidth] = useState(screenWidth - 80);
  const [isDragging, setIsDragging] = useState<'low' | 'high' | null>(null);
  
  const lowThumbX = useRef(new Animated.Value(0)).current;
  const highThumbX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    updateThumbPositions();
  }, [values, sliderWidth]);

  const updateThumbPositions = () => {
    const range = max - min;
    const lowPosition = ((values[0] - min) / range) * sliderWidth;
    const highPosition = ((values[1] - min) / range) * sliderWidth;
    
    lowThumbX.setValue(lowPosition);
    highThumbX.setValue(highPosition);
  };

  const getValueFromPosition = (position: number): number => {
    const range = max - min;
    const value = min + (position / sliderWidth) * range;
    return Math.round(value / step) * step;
  };

  const handleLowThumbGesture = (event: any) => {
    if (disabled) return;
    
    const { state, translationX } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      setIsDragging('low');
    } else if (state === State.ACTIVE) {
      const currentPosition = Math.max(0, Math.min(sliderWidth, translationX));
      const newValue = getValueFromPosition(currentPosition);
      
      if (newValue <= values[1]) {
        onValuesChange([newValue, values[1]]);
      }
    } else if (state === State.END || state === State.CANCELLED) {
      setIsDragging(null);
    }
  };

  const handleHighThumbGesture = (event: any) => {
    if (disabled) return;
    
    const { state, translationX } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      setIsDragging('high');
    } else if (state === State.ACTIVE) {
      const currentPosition = Math.max(0, Math.min(sliderWidth, translationX));
      const newValue = getValueFromPosition(currentPosition);
      
      if (newValue >= values[0]) {
        onValuesChange([values[0], newValue]);
      }
    } else if (state === State.END || state === State.CANCELLED) {
      setIsDragging(null);
    }
  };

  const renderDefaultThumb = () => (
    <View style={[
      styles.defaultThumb,
      isDragging && styles.defaultThumbActive,
      disabled && styles.defaultThumbDisabled,
    ]} />
  );

  const renderDefaultRail = () => (
    <View style={[
      styles.defaultRail,
      disabled && styles.defaultRailDisabled,
    ]} />
  );

  const renderDefaultRailSelected = () => (
    <View style={[
      styles.defaultRailSelected,
      disabled && styles.defaultRailSelectedDisabled,
    ]} />
  );

  const lowPosition = ((values[0] - min) / (max - min)) * sliderWidth;
  const highPosition = ((values[1] - min) / (max - min)) * sliderWidth;
  const selectedWidth = highPosition - lowPosition;

  return (
    <View style={[styles.container, style]}>
      <View
        style={styles.sliderContainer}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setSliderWidth(width);
        }}
      >
        {/* Rail */}
        <View style={styles.railContainer}>
          {renderRail ? renderRail() : renderDefaultRail()}
        </View>
        
        {/* Selected rail */}
        <View
          style={[
            styles.railSelectedContainer,
            {
              left: lowPosition,
              width: selectedWidth,
            },
          ]}
        >
          {renderRailSelected ? renderRailSelected() : renderDefaultRailSelected()}
        </View>
        
        {/* Low thumb */}
        <PanGestureHandler onGestureEvent={handleLowThumbGesture}>
          <Animated.View
            style={[
              styles.thumbContainer,
              {
                transform: [{ translateX: lowThumbX }],
              },
            ]}
          >
            {renderThumb ? renderThumb() : renderDefaultThumb()}
          </Animated.View>
        </PanGestureHandler>
        
        {/* High thumb */}
        <PanGestureHandler onGestureEvent={handleHighThumbGesture}>
          <Animated.View
            style={[
              styles.thumbContainer,
              {
                transform: [{ translateX: highThumbX }],
              },
            ]}
          >
            {renderThumb ? renderThumb() : renderDefaultThumb()}
          </Animated.View>
        </PanGestureHandler>
      </View>
      
      {/* Value labels */}
      <View style={styles.labelsContainer}>
        <Text style={[styles.valueLabel, disabled && styles.valueLabelDisabled]}>
          {values[0]}
        </Text>
        <Text style={[styles.valueLabel, disabled && styles.valueLabelDisabled]}>
          {values[1]}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  railContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  railSelectedContainer: {
    position: 'absolute',
    height: 4,
  },
  thumbContainer: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultRail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
  },
  defaultRailDisabled: {
    backgroundColor: '#f5f5f5',
  },
  defaultRailSelected: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1976D2',
  },
  defaultRailSelectedDisabled: {
    backgroundColor: '#ccc',
  },
  defaultThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1976D2',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  defaultThumbActive: {
    transform: [{ scale: 1.2 }],
  },
  defaultThumbDisabled: {
    backgroundColor: '#ccc',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  valueLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  valueLabelDisabled: {
    color: '#999',
  },
});

export default RangeSlider;
