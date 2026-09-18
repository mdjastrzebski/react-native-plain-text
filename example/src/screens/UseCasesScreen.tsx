import { ScrollView } from 'react-native';
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
// One section per kind of shape rather than one long "Example Use Cases" run:
// grouped, a row can be read against the three or four rows it would really
// sit next to in an app, and a whole group going wrong at once points at what
// they share (all the clamped rows, all the shrink-wrapped ones) instead of at
// thirty unrelated specimens. Each group is its own component in ../sections/,
// ordered by how often the shape is reached for: headings and body text
// first, then the controls, then the narrower cases. So a reader who stops
// scrolling a third of the way down has still seen the shapes their own app
// is mostly made of, and a regression in the rows that matter most is the
// first thing on the screen rather than the last. RandomCombinationsSection
// is rendered last, for the same reason: it is the one group whose rows no
// app would deliberately write.
export default function UseCasesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  return (
    <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.container}>
      {/* No lockup: "Aa" is a specimen of the type itself, which is the Features
          screen's subject rather than this one's, and the header already says
          "Use Cases". What is left is the line that says what the page holds. */}
      <Cover blurb="Whole UI shapes rather than one prop: several styles stacked per row, the way an app would actually set them." />
      <HeadingsSection showText={showText} />
      <BodyCopySection showText={showText} />
      <LabelsSection showText={showText} />
      <ButtonsAndLinksSection showText={showText} />
      <CodeSection showText={showText} />
      <NumeralsSection showText={showText} />
      <BadgesSection showText={showText} />
      <StatusAndFeedbackSection showText={showText} />
      <RandomCombinationsSection showText={showText} />
    </ScrollView>
  );
}
