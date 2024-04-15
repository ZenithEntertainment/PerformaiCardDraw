import { shallow } from 'zustand/shallow';
import styles from './controls-weights.css';
import { useDrawState } from '../draw-state';
import { zeroPad } from '../utils';
import { useMemo } from 'react';
import { useConfigState } from '../config-state';
import { useIntl } from '../hooks/useIntl';
import { NumericInput, Checkbox, Classes } from '@blueprintjs/core';
import { formatLevel, getAvailableLevels } from '../game-data-utils';

interface Props {
  usesTiers: boolean;
  high: number;
  low: number;
}
const pctFmt = new Intl.NumberFormat(undefined, { style: 'percent' });

export function WeightsControls({ usesTiers, high, low }: Props) {
  const { t } = useIntl();
  const gameData = useDrawState((s) => s.gameData);
  const {
    weights,
    forceDistribution,
    groupSongsAt,
    updateConfig,
    totalToDraw,
  } = useConfigState(
    (cfg) => ({
      weights: cfg.weights,
      forceDistribution: cfg.forceDistribution,
      groupSongsAt: cfg.groupSongsAt,
      updateConfig: cfg.update,
      totalToDraw: cfg.chartCount,
    }),
    shallow,
  );
  const groups = useMemo(
    () =>
      getAvailableLevels(gameData).filter((lvl) => lvl >= low && lvl <= high),
    [high, low, gameData],
  );

  function toggleForceDistribution() {
    updateConfig((state) => ({
      forceDistribution: !state.forceDistribution,
    }));
  }

  function toggleGroupCheck() {
    updateConfig((state) => {
      if (state.groupSongsAt) {
        return { groupSongsAt: null };
      }

      return { groupSongsAt: state.upperBound - 1 };
    });
  }

  function handleGroupCutoffChange(next: number) {
    if (isNaN(next)) {
      return;
    }
    if (next < low) {
      return;
    }
    if (!groupSongsAt) {
      return;
    }
    updateConfig({ groupSongsAt: next });
  }

  function setWeight(groupIndex: number, value: number) {
    updateConfig((state) => {
      const newWeights = { ...state.weights };
      if (Number.isInteger(value)) {
        newWeights[groupIndex] = value;
      } else {
        delete newWeights[groupIndex];
      }
      return { weights: newWeights };
    });
  }

  const totalWeight = groups.reduce(
    (total, group) => total + (weights[group] || 0),
    0,
  );
  const percentages = groups.map((group) => {
    const value = weights[group] || 0;
    const pct = value / totalWeight;
    if (forceDistribution) {
      if (pct === 1) {
        return totalToDraw;
      }
      const max = Math.ceil(totalToDraw * pct);
      if (!max) {
        return 0;
      }
      return `${max - 1}-${max}`;
    } else {
      return pctFmt.format(isNaN(pct) ? 0 : pct);
    }
  });

  return (
    <section className={styles.weights}>
      <p className={Classes.TEXT_MUTED}>
        {forceDistribution
          ? t('weights.forcedExplanation')
          : t('weights.explanation')}
      </p>
      {groups.map((group, i) => (
        <div className={styles.level} key={group}>
          <NumericInput
            type="number"
            inputMode="numeric"
            width={2}
            name={`weight-${group}`}
            value={weights[group] || ''}
            min={0}
            onValueChange={(v) => setWeight(group, v)}
            placeholder="0"
            fill
          />
          {groupSongsAt === group && '>='}
          {usesTiers ? `T${zeroPad(group, 2)}` : formatLevel(group)}{' '}
          <sub>{percentages[i]}</sub>
        </div>
      ))}
      <Checkbox
        label={t('weights.check.label')}
        title={t('weights.check.title')}
        checked={forceDistribution}
        onChange={toggleForceDistribution}
      />
      <Checkbox
        label={t('weights.group.label')}
        title={t('weights.group.title')}
        checked={!!groupSongsAt}
        onChange={toggleGroupCheck}
      />
      <NumericInput
        type="number"
        inputMode="numeric"
        width={2}
        disabled={!groupSongsAt}
        value={groupSongsAt || high - 1}
        min={low}
        onValueChange={handleGroupCutoffChange}
        placeholder="0"
      />
    </section>
  );
}
