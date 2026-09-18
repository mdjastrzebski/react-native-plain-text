import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView } from 'react-native';
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

// One prop per section, one value per row. Rows that stack several props at once
// live on the Use Cases screen. Each section is its own component in
// ../sections/, named after the prop it demonstrates.
export default function FeaturesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  const [search, setSearch] = useState('');

  // Scroll-lock during the animating-text drag is an imperative native-prop
  // toggle, not state: a re-render here would be pointless.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const onDragStateChange = (dragging: boolean) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
      stickyHeaderIndices={[0]}
    >
      <SearchField value={search} onChangeText={setSearch} placeholder="Search sections" />
      {/* Hidden rather than filtered: it's the title page, not a result. */}
      {search === '' && (
        <Cover
          lockup={{ glyph: 'Pt', title: 'PlainText' }}
          blurb="A faster, lower-memory React Native <Text> alternative for simple, single-style text."
        />
      )}
      <SectionSearchProvider query={search}>
        <FontSizeSection showText={showText} />
        <EmojiSection showText={showText} />
        <FontFamilySection showText={showText} />
        <ColorSection showText={showText} />
        <FontWeightSection showText={showText} />
        <FontStyleSection showText={showText} />
        <TextAlignSection showText={showText} />
        <WritingDirectionSection showText={showText} />
        <BaselineAlignmentSection showText={showText} />
        <MultilineSection showText={showText} />
        <NumberOfLinesSection showText={showText} />
        <PaddingSection showText={showText} />
        <BordersSection showText={showText} />
        <LineHeightSection showText={showText} />
        <LineHeightClippingSection showText={showText} />
        <LetterSpacingSection showText={showText} />
        <EllipsizeModeSection showText={showText} />
        <LineBreakStrategySection showText={showText} />
        <TextBreakStrategySection showText={showText} />
        <TextDecorationLineSection showText={showText} />
        <TextShadowSection showText={showText} />
        <TextTransformSection showText={showText} />
        <FontScalingSection showText={showText} />
        <FontVariantSection showText={showText} />
        <FontVariationSettingsSection showText={showText} />
        <VerticalAlignSection showText={showText} />
        <WrapDetectionSection showText={showText} />
        <AccessibilitySection showText={showText} />
        <FontPaddingSection showText={showText} />
        <AnimatingTextSection onDragStateChange={onDragStateChange} />
      </SectionSearchProvider>
    </ScrollView>
  );
}
