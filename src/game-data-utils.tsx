import { useIntl } from './hooks/useIntl';
import { GameData, I18NDict } from './models/SongData';

export function getMetaString(t: (key: string) => string, key: string) {
  return t('meta.' + key);
}

export function MetaString({ key }: { key: string }) {
  const { t } = useIntl();
  return <>{getMetaString(t, key)}</>;
}

export function getDiffClass(t: (key: string) => string, diffClassKey: string) {
  return t('meta.$abbr.' + diffClassKey);
}

interface AbbrProps {
  diffClass: string;
}

export function AbbrDifficulty({ diffClass }: AbbrProps) {
  const { t } = useIntl();
  return <>{getDiffClass(t, diffClass)}</>;
}

export function formatLevel(level: number) {
  if (level % 1 === 0.5) {
    return `${Math.trunc(level)}+`;
  }
  return level.toString();
}

export function getAvailableLevels(gameData: GameData | null): number[] {
  if (gameData === null) {
    return [];
  }
  const levelSet = new Set<number>();
  gameData.songs.forEach((song) => {
    song.charts.forEach((chart) => levelSet.add(chart.lvl));
  });
  return [...levelSet].sort((a, b) => a - b);
}

export function getDiffAbbr(gameData: GameData, diffClass: string) {
  return ((gameData.i18n.en as I18NDict)['$abbr'] as I18NDict)[
    diffClass
  ] as string;
}
