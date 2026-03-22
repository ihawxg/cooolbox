import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'magnifyingglass': 'search',
  'xmark.circle.fill': 'cancel',
  'xmark': 'close',
  'arrow.up.arrow.down': 'swap-vert',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'checkmark': 'check',
  'line.3.horizontal.decrease': 'filter-list',
  'square.grid.2x2.fill': 'grid-view',
  'building.2': 'business',
  'person': 'person',
  'calendar': 'calendar-today',
  'tag': 'label',
  'chart.bar': 'bar-chart',
  'lock': 'lock',
  'mappin.and.ellipse': 'place',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
