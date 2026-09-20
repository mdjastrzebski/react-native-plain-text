import { useRef, useState, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCompareText } from '../components/CompareText';
import { Cover, SearchField, SectionSearchProvider, screenStyles } from '../components/Specimen';
import { AccessibilitySection } from '../sections/AccessibilitySection';
import { AnimatingTextSection } from '../sections/AnimatingTextSection';
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

type Props = NativeStackScreenProps<ParamListBase>;

// One prop per section, one value per row (multi-prop rows live on Examples).
// Each section is a component in ../sections/, named after its prop.
//
// FlatList of pre-built elements: renderItem just returns the item, keeping virtualization.
// Search field is a sticky ListHeaderComponent; cover lives in `sections` so it scrolls
// away instead of pinning alongside the search field.
export default function FeaturesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  const [search, setSearch] = useState('');

  // Native-prop toggle, not state — avoids a re-render on every drag frame.
  const scrollRef = useRef<FlatList<ReactElement>>(null);
  const onDragStateChange = (dragging: boolean) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
  };

  const sections: ReactElement[] = [
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
    <FontSizeSection key="font-size" showText={showText} />,
    <EmojiSection key="emoji" showText={showText} />,
    <FontFamilySection key="font-family" showText={showText} />,
    <ColorSection key="color" showText={showText} />,
    <FontWeightSection key="font-weight" showText={showText} />,
    <FontStyleSection key="font-style" showText={showText} />,
    <TextAlignSection key="text-align" showText={showText} />,
    <WritingDirectionSection key="writing-direction" showText={showText} />,
    <BaselineAlignmentSection key="baseline-alignment" showText={showText} />,
    <MultilineSection key="multiline" showText={showText} />,
    <NumberOfLinesSection key="number-of-lines" showText={showText} />,
    <PaddingSection key="padding" showText={showText} />,
    <BordersSection key="borders" showText={showText} />,
    <LineHeightSection key="line-height" showText={showText} />,
    <LineHeightClippingSection key="line-height-clipping" showText={showText} />,
    <LetterSpacingSection key="letter-spacing" showText={showText} />,
    <EllipsizeModeSection key="ellipsize-mode" showText={showText} />,
    <LineBreakStrategySection key="line-break-strategy" showText={showText} />,
    <TextBreakStrategySection key="text-break-strategy" showText={showText} />,
    <TextDecorationLineSection key="text-decoration-line" showText={showText} />,
    <TextShadowSection key="text-shadow" showText={showText} />,
    <TextTransformSection key="text-transform" showText={showText} />,
    <FontScalingSection key="font-scaling" showText={showText} />,
    <FontVariantSection key="font-variant" showText={showText} />,
    <FontVariationSettingsSection key="font-variation-settings" showText={showText} />,
    <VerticalAlignSection key="vertical-align" showText={showText} />,
    <WrapDetectionSection key="wrap-detection" showText={showText} />,
    <AccessibilitySection key="accessibility" showText={showText} />,
    <FontPaddingSection key="font-padding" showText={showText} />,
    <AnimatingTextSection key="animating-text" onDragStateChange={onDragStateChange} />,
  ];

  return (
    <SectionSearchProvider query={search}>
      <FlatList<ReactElement>
        ref={scrollRef}
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.container}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <SearchField value={search} onChangeText={setSearch} placeholder="Search sections" />
        }
        data={sections}
        renderItem={({ item }) => item}
        keyExtractor={(item, index) => item.key ?? String(index)}
      />
    </SectionSearchProvider>
  );
}
