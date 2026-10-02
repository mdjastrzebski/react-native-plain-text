import type { ViewProps } from 'react-native';

// Lets the codegen spec redeclare `accessible`. See PlainTextViewNativeComponent.ts.
export type PlainTextBaseViewProps = Omit<ViewProps, 'accessible'>;
