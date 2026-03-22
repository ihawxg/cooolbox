import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/layout';
import { CompanyRecord } from '@/types/company';
import React from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { CompanyCard } from './company-card';

interface CompanyListProps {
  companies: CompanyRecord[];
  isSearching?: boolean;
  header?: React.ReactElement;
  listRef?: React.RefObject<FlatList | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const Separator = () => <View style={styles.separator} />;

export function CompanyList({ companies, isSearching, header, listRef, onScroll }: CompanyListProps) {
  return (
    <FlatList
      ref={listRef}
      data={companies}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => <CompanyCard company={item} index={index} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={
        isSearching ? null : (
          <EmptyState
            title="No companies found"
            subtitle="Try adjusting your search or filters"
          />
        )
      }
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEventThrottle={16}
      // removeClippedSubviews={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  separator: {
    height: Spacing.md,
  },
});
