import type { HybridView, HybridViewMethods, HybridViewProps } from 'react-native-nitro-modules';

// A subset of PlainText's native props (src/PlainTextViewNativeComponent.ts),
// enough to run the Performance screen's common configurations. Colors are
// pre-processed numbers (processColor), since Nitro has no ColorValue type.
export type NitroTextAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';
export type NitroTextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type NitroEllipsizeMode = 'head' | 'middle' | 'tail' | 'clip';
export type NitroHyphens = 'none' | 'auto';

export interface NitroPlainTextProps extends HybridViewProps {
  text?: string;
  color?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  // Points, unset when undefined.
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: NitroTextAlign;
  textDecorationLine?: string;
  textTransform?: NitroTextTransform;
  textShadowColor?: number;
  textShadowOffsetWidth?: number;
  textShadowOffsetHeight?: number;
  textShadowRadius?: number;
  hyphens?: NitroHyphens;
  lang?: string;
  // 0 or undefined means unlimited.
  numberOfLines?: number;
  ellipsizeMode?: NitroEllipsizeMode;
  allowFontScaling?: boolean;
  // 0 or undefined means no cap.
  maxFontSizeMultiplier?: number;
}

export interface NitroPlainTextMethods extends HybridViewMethods {}

export type NitroPlainText = HybridView<NitroPlainTextProps, NitroPlainTextMethods>;
