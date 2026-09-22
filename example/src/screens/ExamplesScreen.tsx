import { useState, type ComponentType, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCompareText } from '../components/CompareText';
import { Cover, SearchField, screenStyles } from '../components/Specimen';
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

  const [search, setSearch] = useState('');

  // [title, Component] so search can filter on title directly.
  const sections: [string, ComponentType<{ showText: boolean }>][] = [
    ['Headings', HeadingsSection],
    ['Body Copy', BodyCopySection],
    ['Labels', LabelsSection],
    ['Buttons and Links', ButtonsAndLinksSection],
    ['Code', CodeSection],
    ['Numerals', NumeralsSection],
    ['Badges', BadgesSection],
    ['Status and Feedback', StatusAndFeedbackSection],
    ['Random Combinations', RandomCombinationsSection],
  ];

  const query = search.toLowerCase();
  const items: ReactElement[] = [
    // Hidden rather than filtered: it's the title page, not a result.
    ...(search === ''
      ? [
          <Cover
            key="cover"
            blurb="Whole UI shapes rather than one prop: several styles stacked per row, the way an app would actually set them."
          />,
        ]
      : []),
    ...sections
      .filter(([title]) => title.toLowerCase().includes(query))
      .map(([title, Section]) => <Section key={title} showText={showText} />),
  ];

  return (
    <FlatList<ReactElement>
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
