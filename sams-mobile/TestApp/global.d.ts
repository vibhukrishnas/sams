// Global type definitions for SAMS Mobile App

// Jest type definitions
declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveTextContent(text: string | RegExp): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toHaveStyle(style: object): R;
    toHaveProp(prop: string, value?: any): R;
  }
}

declare global {
  // Jest globals
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void | Promise<void>) => void;
  var test: (name: string, fn: () => void | Promise<void>) => void;
  var expect: (value: any) => jest.Matchers<any>;
  var beforeEach: (fn: () => void | Promise<void>) => void;
  var afterEach: (fn: () => void | Promise<void>) => void;
  var beforeAll: (fn: () => void | Promise<void>) => void;
  var afterAll: (fn: () => void | Promise<void>) => void;
  var jest: {
    fn: (implementation?: (...args: any[]) => any) => any;
    mock: (moduleName: string, factory?: () => any, options?: any) => any;
    unmock: (moduleName: string) => any;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    spyOn: (object: any, method: string) => any;
    setTimeout: (timeout: number) => void;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    runAllTimers: () => void;
    runOnlyPendingTimers: () => void;
    advanceTimersByTime: (msToRun: number) => void;
  };

  // Detox globals
  var device: {
    launchApp: (params?: any) => Promise<void>;
    terminateApp: () => Promise<void>;
    reloadReactNative: () => Promise<void>;
    sendToHome: () => Promise<void>;
    shake: () => Promise<void>;
    setOrientation: (orientation: 'portrait' | 'landscape') => Promise<void>;
    getOrientation: () => Promise<string>;
    takeScreenshot: (name: string) => Promise<void>;
    pressBack: () => Promise<void>;
    getPlatform: () => string;
  };

  var element: (matcher: any) => {
    tap: () => Promise<void>;
    longPress: () => Promise<void>;
    multiTap: (times: number) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    replaceText: (text: string) => Promise<void>;
    clearText: () => Promise<void>;
    scroll: (pixels: number, direction: string) => Promise<void>;
    scrollTo: (edge: string) => Promise<void>;
    swipe: (direction: string, speed?: string, percentage?: number) => Promise<void>;
    pinch: (scale: number, speed?: string, angle?: number) => Promise<void>;
    setColumnToValue: (column: number, value: string) => Promise<void>;
    setDatePickerDate: (dateString: string, dateFormat: string) => Promise<void>;
    adjustSliderToPosition: (normalizedPosition: number) => Promise<void>;
    getAttributes: () => Promise<any>;
  };

  var expect: (element: any) => {
    toBeVisible: () => Promise<void>;
    toBeNotVisible: () => Promise<void>;
    toExist: () => Promise<void>;
    toNotExist: () => Promise<void>;
    toHaveText: (text: string) => Promise<void>;
    toHaveLabel: (label: string) => Promise<void>;
    toHaveId: (id: string) => Promise<void>;
    toHaveValue: (value: string) => Promise<void>;
    toBeFocused: () => Promise<void>;
    toBeNotFocused: () => Promise<void>;
  };

  var by: {
    id: (id: string) => any;
    text: (text: string) => any;
    label: (label: string) => any;
    accessibilityLabel: (label: string) => any;
    type: (type: string) => any;
    traits: (traits: string[]) => any;
    value: (value: string) => any;
    web: {
      id: (id: string) => any;
      className: (className: string) => any;
      cssSelector: (selector: string) => any;
      name: (name: string) => any;
      xpath: (xpath: string) => any;
      href: (href: string) => any;
      hrefContains: (href: string) => any;
      tag: (tag: string) => any;
    };
  };

  var waitFor: (element: any) => {
    toBeVisible: () => Promise<void>;
    toBeNotVisible: () => Promise<void>;
    toExist: () => Promise<void>;
    toNotExist: () => Promise<void>;
    toHaveText: (text: string) => Promise<void>;
    toHaveValue: (value: string) => Promise<void>;
    toBeFocused: () => Promise<void>;
    toBeNotFocused: () => Promise<void>;
    whileElement: (element: any) => {
      scroll: (pixels: number, direction: string) => Promise<void>;
    };
  };

  // React Native Testing Library globals
  var render: (component: React.ReactElement) => any;
  var fireEvent: {
    press: (element: any) => void;
    changeText: (element: any, text: string) => void;
    scroll: (element: any, eventData: any) => void;
  };
  var screen: {
    getByText: (text: string | RegExp) => any;
    getByTestId: (testId: string) => any;
    getByDisplayValue: (value: string | RegExp) => any;
    getByPlaceholderText: (text: string | RegExp) => any;
    queryByText: (text: string | RegExp) => any;
    queryByTestId: (testId: string) => any;
    findByText: (text: string | RegExp) => Promise<any>;
    findByTestId: (testId: string) => Promise<any>;
  };
  var waitForElementToBeRemoved: (element: any) => Promise<void>;
  var within: (element: any) => any;
  var cleanup: () => void;
}

// Module declarations for packages without types
declare module 'react-native-animatable' {
  import { Component } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface AnimatableProperties {
    animation?: string;
    duration?: number;
    delay?: number;
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    easing?: string;
    iterationCount?: number | 'infinite';
    transition?: string;
    onAnimationBegin?: () => void;
    onAnimationEnd?: () => void;
    useNativeDriver?: boolean;
  }

  export class View extends Component<any> {}
  export class Text extends Component<any> {}
  export class Image extends Component<any> {}
  export function createAnimatableComponent(component: any): any;
}

declare module 'react-native-background-timer' {
  export default class BackgroundTimer {
    static setTimeout(callback: () => void, delay: number): number;
    static clearTimeout(timeoutId: number): void;
    static setInterval(callback: () => void, delay: number): number;
    static clearInterval(intervalId: number): void;
    static start(delay?: number): void;
    static stop(): void;
  }
}

declare module 'react-native-base64' {
  export function encode(input: string): string;
  export function decode(input: string): string;
}

declare module 'react-native-chart-kit' {
  import { Component } from 'react';
  
  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    color?: (opacity?: number) => string;
    strokeWidth?: number;
    barPercentage?: number;
    useShadowColorFromDataset?: boolean;
    decimalPlaces?: number;
    formatYLabel?: (yValue: string) => string;
    formatXLabel?: (xValue: string) => string;
    style?: any;
    propsForDots?: any;
    propsForBackgroundLines?: any;
    propsForLabels?: any;
  }

  export interface LineChartData {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }>;
  }

  export class LineChart extends Component<{
    data: LineChartData;
    width: number;
    height: number;
    chartConfig: ChartConfig;
    bezier?: boolean;
    style?: any;
    withDots?: boolean;
    withShadow?: boolean;
    withScrollableDot?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withVerticalLines?: boolean;
    withHorizontalLines?: boolean;
    withVerticalLabels?: boolean;
    withHorizontalLabels?: boolean;
    fromZero?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    xAxisLabel?: string;
    hidePointsAtIndex?: number[];
    formatYLabel?: (yValue: string) => string;
    formatXLabel?: (xValue: string) => string;
    segments?: number;
    transparent?: boolean;
    onDataPointClick?: (data: any) => void;
  }> {}

  export class BarChart extends Component<any> {}
  export class PieChart extends Component<any> {}
  export class ProgressChart extends Component<any> {}
  export class ContributionGraph extends Component<any> {}
  export class StackedBarChart extends Component<any> {}
}

export {};
