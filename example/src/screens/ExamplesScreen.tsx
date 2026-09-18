import { FlatList } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCompareText } from '../components/CompareText';
import { Cover, screenStyles } from '../components/Specimen';
import { BadgesSection } from '../sections/BadgesSection';
import { BodyCopySection } from '../sections/BodyCopySection';
import { ButtonsAndLinksSection } from '../sections/ButtonsAndLinksSection';
import { CodeSection } from '../sections/CodeSection';
import { HeadingsSection } from '../sections/HeadingsSection';
import { LabelsSection } from '../sections/LabelsSection';
import { NumeralsSection } from '../sections/NumeralsSection';
import { RandomCombinationsSection } from '../sections/RandomCombinationsSection';
import { StatusAndFeedbackSection } from '../sections/StatusAndFeedbackSection';

type Props = NativeStackScreenProps<ParamListBase>;

// The Features screen varies one prop at a time. This one stacks three to six of
// them at once, which is where props that are individually fine start disagreeing:
// padding against a border against a clamped line count, letterSpacing against
// wrap detection, lineHeight against verticalAlign.
//
// One section per kind of shape rather than one long "Examples" run: grouped,
// a row can be read against the three or four rows it would really sit next
// to in an app, and a whole group going wrong at once points at what they
// share (all the clamped rows, all the shrink-wrapped ones) instead of at
// thirty unrelated specimens. Each group is its own component in ../sections/,
// ordered by how often the shape is reached for: headings and body text
// first, then the controls, then the narrower cases. So a reader who stops
// scrolling a third of the way down has still seen the shapes their own app
// is mostly made of, and a regression in the rows that matter most is the
// first thing on the screen rather than the last. RandomCombinationsSection
// is rendered last, for the same reason: it is the one group whose rows no
// app would deliberately write.
//
// A FlatList of pre-built elements rather than a ScrollView of JSX children:
// each entry in `sections` is already the element to render, so `renderItem`
// only has to hand it back, and the list still gets FlatList's virtualization
// for free.
export default function ExamplesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  const sections = [
    // No lockup: "Aa" is a specimen of the type itself, which is the Features
    // screen's subject rather than this one's, and the header already says
    // "Examples". What is left is the line that says what the page holds.
    <Cover
      key="cover"
      blurb="Whole UI shapes rather than one prop: several styles stacked per row, the way an app would actually set them."
    />,
    <HeadingsSection key="headings" showText={showText} />,
    <BodyCopySection key="body-copy" showText={showText} />,
    <LabelsSection key="labels" showText={showText} />,
    <ButtonsAndLinksSection key="buttons-and-links" showText={showText} />,
    <CodeSection key="code" showText={showText} />,
    <NumeralsSection key="numerals" showText={showText} />,
    <BadgesSection key="badges" showText={showText} />,
    <StatusAndFeedbackSection key="status-and-feedback" showText={showText} />,
    <RandomCombinationsSection key="random-combinations" showText={showText} />,
  ];

  return (
    <FlatList
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
      data={sections}
      renderItem={({ item }) => item}
      keyExtractor={(item, index) => item.key ?? String(index)}
    />
  );
}
