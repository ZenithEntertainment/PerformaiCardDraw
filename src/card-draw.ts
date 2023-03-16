import { GameData, Song, Chart } from "./models/SongData";
import { times } from "./utils";
import { DrawnChart, Drawing } from "./models/Drawing";
import { ConfigState } from "./config-state";
import { getAvailableLevels } from "./game-data-utils";

export function getDrawnChart(currentSong: Song, chart: Chart): DrawnChart {
  return {
    name: currentSong.name,
    jacket: chart.jacket || currentSong.jacket,
    nameTranslation: currentSong.name_translation,
    artist: currentSong.artist,
    artistTranslation: currentSong.artist_translation,
    bpm: currentSong.bpm ?? '0',
    difficultyClass: chart.diffClass,
    level: chart.lvl,
    flags: (chart.flags || []).concat(currentSong.flags || []),
    song: currentSong,
  };
}

/**
 * Used to give each drawing an auto-incrementing id
 */
let drawingID = 0;

/** returns true if song matches configured flags */
export function songIsValid(
  config: ConfigState,
  song: Song,
  forPocketPick = false
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return true;
  }
  return (!song.flags || song.flags.every((f) => config.flags.has(f))) && config.categories.has(song.category);
}

/** returns true if chart matches configured difficulty/style/lvl/flags */
export function chartIsValid(
  config: ConfigState,
  chart: Chart,
  forPocketPick = false
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return true;
  }
  return (
    config.difficulties.has(chart.diffClass) &&
    chart.lvl >= config.lowerBound &&
    chart.lvl <= config.upperBound &&
    (!chart.flags || chart.flags.every((f) => config.flags.has(f)))
  );
}

export function* eligibleCharts(config: ConfigState, songs: Song[]) {
  for (const currentSong of songs) {
    if (!songIsValid(config, currentSong)) {
      continue;
    }
    const charts = currentSong.charts;

    for (const chart of charts) {
      if (!chartIsValid(config, chart)) {
        continue;
      }

      // add chart to deck
      yield getDrawnChart(currentSong, chart);
    }
  }
}

/**
 * Produces a drawn set of charts given the song data and the user
 * input of the html form elements.
 * @param songs The song data (see `src/songs/`)
 * @param configData the data gathered by all form elements on the page, indexed by `name` attribute
 */
export function draw(gameData: GameData, configData: ConfigState): Drawing {
  const {
    chartCount: numChartsToRandom,
    upperBound,
    lowerBound,
    useWeights,
    forceDistribution,
    weights,
  } = configData;

  const validCharts: Record<string, Array<DrawnChart>> = {};
  const availableLevels = getAvailableLevels(gameData);
  availableLevels.forEach(level => {
    validCharts[level.toString()] = [];
  })

  for (const chart of eligibleCharts(configData, gameData.songs)) {
    validCharts[chart.level].push(chart);
  }

  /**
   * the "deck" of difficulty levels to pick from
   */
  let distribution: Array<number> = [];
  /**
   * Total amount of weight used, so we can determine expected outcome below
   */
  let totalWeights = 0;
  /**
   * The number of charts we can expect to draw of each level
   */
  const expectedDrawPerLevel: Record<string, number> = {};

  // build an array of possible levels to pick from
  for (const level of availableLevels) {
    let weightAmount = 0;
    if (useWeights) {
      weightAmount = weights[level];
      expectedDrawPerLevel[level.toString()] = weightAmount;
      totalWeights += weightAmount;
    } else {
      weightAmount = validCharts[level.toString()].length;
    }
    times(weightAmount, () => distribution.push(level));
  }

  // If custom weights are used, expectedDrawsPerLevel[level] will be the maximum number
  // of cards of that level allowed in the card draw.
  // e.g. For a 5-card draw, we increase the cap by 1 at every 100%/5 = 20% threshold,
  // so a level with a weight of 15% can only show up on at most 1 card, a level with
  // a weight of 30% can only show up on at most 2 cards, etc.
  if (useWeights && forceDistribution) {
    for (const level of availableLevels) {
      let normalizedWeight =
        expectedDrawPerLevel[level.toString()] / totalWeights;
      expectedDrawPerLevel[level] = Math.ceil(
        normalizedWeight * numChartsToRandom
      );
    }
  }

  const drawnCharts: DrawnChart[] = [];
  /**
   * Record of how many songs of each difficulty have been drawn so far
   */
  const difficultyCounts: Record<string, number> = {};

  while (drawnCharts.length < numChartsToRandom) {
    if (distribution.length === 0) {
      // no more songs available to pick in the requested range
      // will be returning fewer than requested number of charts
      break;
    }

    // first pick a difficulty
    const chosenDifficulty =
      distribution[Math.floor(Math.random() * distribution.length)];
    const selectableCharts = validCharts[chosenDifficulty.toString()];
    const randomIndex = Math.floor(Math.random() * selectableCharts.length);
    const randomChart = selectableCharts[randomIndex];

    if (randomChart) {
      // Give this random chart a unique id within this drawing
      randomChart.id = drawnCharts.length;
      // Save it in our list of drawn charts
      drawnCharts.push(randomChart);
      // remove drawn chart from deck so it cannot be re-drawn
      selectableCharts.splice(randomIndex, 1);
      if (!difficultyCounts[chosenDifficulty]) {
        difficultyCounts[chosenDifficulty] = 1;
      } else {
        difficultyCounts[chosenDifficulty]++;
      }
    }

    // check if maximum number of expected occurrences of this level of chart has been reached
    const reachedExpected =
      forceDistribution &&
      difficultyCounts[chosenDifficulty.toString()] ===
        expectedDrawPerLevel[chosenDifficulty.toString()];

    if (selectableCharts.length === 0 || reachedExpected) {
      // can't pick any more songs of this difficulty
      distribution = distribution.filter((n) => n !== chosenDifficulty);
    }
  }

  drawingID += 1;
  return {
    id: drawingID,
    charts: drawnCharts,
    bans: [],
    protects: [],
    pocketPicks: [],
  };
}
