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

// Examples stacks several props per row (Features varies one prop at a time).
// FlatList of pre-built elements: renderItem just returns the item, keeping virtualization.
export default function ExamplesScreen({ navigation }: Props) {
  const showText = useCompareText(navigation);

  const sections = [
    // No lockup here; the typeface itself is Features' subject, not this screen's.
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
