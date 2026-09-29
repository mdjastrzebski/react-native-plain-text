import { useRef, useState, type ComponentType, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import { useCompareText } from '../components/CompareText';
import type { SetHeaderActions } from '../components/HeaderActions';
import { Cover, SearchField, screenStyles } from '../components/Specimen';
import { AccessibilitySection } from '../sections/AccessibilitySection';
import { BaselineAlignmentSection } from '../sections/BaselineAlignmentSection';
import { BordersSection } from '../sections/BordersSection';
import { ColorSection } from '../sections/ColorSection';
import { EllipsizeModeSection } from '../sections/EllipsizeModeSection';
import { EmojiSection } from '../sections/EmojiSection';
import { FontFamilySection } from '../sections/FontFamilySection';
import { FontPaddingSection } from '../sections/FontPaddingSection';
import { FontScalingSection } from '../sections/FontScalingSection';
import { FontSizeSection } from '../sections/FontSizeSection';
import { FontStyleSection } from '../sections/FontStyleSection';
import { FontVariantSection } from '../sections/FontVariantSection';
import { FontVariationSettingsSection } from '../sections/FontVariationSettingsSection';
import { FontWeightSection } from '../sections/FontWeightSection';
import { HyphenationSection } from '../sections/HyphenationSection';
import { LetterSpacingSection } from '../sections/LetterSpacingSection';
import { LineBreakStrategySection } from '../sections/LineBreakStrategySection';
import { LineHeightClippingSection } from '../sections/LineHeightClippingSection';
import { LineHeightSection } from '../sections/LineHeightSection';
import { MultilineSection } from '../sections/MultilineSection';
import { NumberOfLinesSection } from '../sections/NumberOfLinesSection';
import { PaddingSection } from '../sections/PaddingSection';
import { TextAlignSection } from '../sections/TextAlignSection';
import { TextBreakStrategySection } from '../sections/TextBreakStrategySection';
import { TextDecorationLineSection } from '../sections/TextDecorationLineSection';
import { TextShadowSection } from '../sections/TextShadowSection';
import { TextTransformSection } from '../sections/TextTransformSection';
import { VerticalAlignSection } from '../sections/VerticalAlignSection';
import { WrapDetectionSection } from '../sections/WrapDetectionSection';
import { WritingDirectionSection } from '../sections/WritingDirectionSection';

export type FeatureSectionProps = {
  showText: boolean;
  // For sections with a drag gesture, so the list doesn't scroll under it.
  onDragStateChange: (dragging: boolean) => void;
};

// [title, Component] so search can filter on title directly. Key and title both
// derive from `title`, since every entry shares the same props.
export type FeatureSection = [title: string, Component: ComponentType<FeatureSectionProps>];

type Props = {
  setHeaderActions: SetHeaderActions;
  // Sections that need a dependency not every app has (Animating Text needs
  // Reanimated), listed after the built-in ones.
  extraSections?: readonly FeatureSection[];
};

// One prop per section, one value per row (multi-prop rows live on Examples).
// Each section is a component in ../sections/, named after its prop.
//
// FlatList of pre-built elements: renderItem just returns the item, keeping virtualization.
// Search field is a sticky ListHeaderComponent; cover lives in `sections` so it scrolls
// away instead of pinning alongside the search field.
export function FeaturesScreen({ setHeaderActions, extraSections = [] }: Props) {
  const showText = useCompareText(setHeaderActions);

  const [search, setSearch] = useState('');

  // Native-prop toggle, not state — avoids a re-render on every drag frame.
  const scrollRef = useRef<FlatList<ReactElement>>(null);
  const onDragStateChange = (dragging: boolean) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
  };

  const sections: FeatureSection[] = [
    ['Font Size', FontSizeSection],
    ['Emoji', EmojiSection],
    ['Font Family', FontFamilySection],
    ['Color', ColorSection],
    ['Font Weight', FontWeightSection],
    ['Font Style', FontStyleSection],
    ['Text Align', TextAlignSection],
    ['Writing Direction', WritingDirectionSection],
    ['Baseline alignment', BaselineAlignmentSection],
    ['Multiline', MultilineSection],
    ['Number of Lines', NumberOfLinesSection],
    ['Padding', PaddingSection],
    ['Borders', BordersSection],
    ['Line Height', LineHeightSection],
    ['Line Height Clipping', LineHeightClippingSection],
    ['Letter Spacing', LetterSpacingSection],
    ['Ellipsize Mode', EllipsizeModeSection],
    ['Line Break Strategy', LineBreakStrategySection],
    ['Text Break Strategy', TextBreakStrategySection],
    ['Hyphenation', HyphenationSection],
    ['Text Decoration Line', TextDecorationLineSection],
    ['Text Shadow', TextShadowSection],
    ['Text Transform', TextTransformSection],
    ['Font Scaling', FontScalingSection],
    ['Font Variant', FontVariantSection],
    ['Font Variation Settings', FontVariationSettingsSection],
    ['Vertical Align', VerticalAlignSection],
    ['Wrap Detection', WrapDetectionSection],
    ['Accessibility', AccessibilitySection],
    ['Font Padding', FontPaddingSection],
    ...extraSections,
  ];

  const query = search.toLowerCase();
  const items: ReactElement[] = [
    // Hidden rather than filtered: it's the title page, not a result.
    ...(search === ''
      ? [
          <Cover
            key="cover"
            lockup={{ glyph: 'Pt', title: 'PlainText' }}
            blurb="A faster, lower-memory React Native <Text> alternative for simple, single-style text."
          />,
        ]
      : []),
    ...sections
      .filter(([title]) => title.toLowerCase().includes(query))
      .map(([title, Section]) => (
        <Section key={title} showText={showText} onDragStateChange={onDragStateChange} />
      )),
  ];

  return (
    <FlatList<ReactElement>
      ref={scrollRef}
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <SearchField value={search} onChangeText={setSearch} placeholder="Search sections" />
      }
      data={items}
      renderItem={({ item }) => item}
      keyExtractor={(item, index) => item.key ?? String(index)}
    />
  );
}
