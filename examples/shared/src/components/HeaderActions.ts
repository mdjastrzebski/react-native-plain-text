import type { ReactElement } from 'react';

// Screens put their controls (Compare Text, the Performance Props sheet) in the
// app's header through this, rather than through a navigation object: which
// navigator draws the header, and how, is the app's call, not the screen's.
//
// Pass a new array whenever an action's state changes; it replaces the previous
// one. The app decides layout, so each element should be a single self-contained
// control.
export type SetHeaderActions = (actions: ReactElement[]) => void;
