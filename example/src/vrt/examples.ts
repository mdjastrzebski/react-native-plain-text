import { Children, isValidElement, type ReactNode } from 'react';
import { groups } from './groups';

export function getVrtExamples(platform: string) {
  return groups
    .filter((group) => group.platform == null || group.platform === platform)
    .flatMap(({ children }) => {
      const sectionChildren = isValidElement<{ children?: ReactNode }>(children)
        ? children.props.children
        : children;

      return Children.toArray(sectionChildren).map((specimen) => {
        if (
          !isValidElement<{ testID?: string }>(specimen) ||
          typeof specimen.props.testID !== 'string'
        ) {
          throw new Error('Every VRT specimen must have a testID');
        }

        return {
          testID: specimen.props.testID,
          specimen,
        };
      });
    });
}
