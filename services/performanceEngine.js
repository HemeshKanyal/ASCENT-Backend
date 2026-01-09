/**
 * Stage 6.1 — Performance Metrics Extraction
 * Converts workout session history into normalized exercise performance data
 */

export function extractExercisePerformance(sessions = []) {
  const performanceMap = {};

  for (const session of sessions) {
    const sessionDate = new Date(session.date);

    for (const exercise of session.exercises) {
      const { exerciseId, name, sets } = exercise;

      if (!performanceMap[exerciseId]) {
        performanceMap[exerciseId] = {
          exerciseId,
          name,
          totalVolume: 0,
          maxWeight: 0,
          totalSets: 0,
          totalReps: 0,
          lastPerformedDate: null,
        };
      }

      const perf = performanceMap[exerciseId];

      for (const set of sets) {
        if (!set.completed) continue;

        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        const volume = reps * weight;

        perf.totalVolume += volume;
        perf.totalSets += 1;
        perf.totalReps += reps;

        if (weight > perf.maxWeight) {
          perf.maxWeight = weight;
        }
      }

      // Update last performed date
      if (
        !perf.lastPerformedDate ||
        sessionDate > new Date(perf.lastPerformedDate)
      ) {
        perf.lastPerformedDate = sessionDate.toISOString();
      }
    }
  }

  // Normalize avgReps and return array
  return Object.values(performanceMap).map((perf) => ({
    exerciseId: perf.exerciseId,
    name: perf.name,
    totalVolume: perf.totalVolume,
    maxWeight: perf.maxWeight,
    totalSets: perf.totalSets,
    avgReps:
      perf.totalSets > 0
        ? Math.round(perf.totalReps / perf.totalSets)
        : 0,
    lastPerformedDate: perf.lastPerformedDate,
  }));
}

function buildExerciseHistory(sessions = []) {
  const history = {};

  for (const session of sessions) {
    const sessionDate = new Date(session.date);

    for (const exercise of session.exercises) {
      const { exerciseId, sets } = exercise;

      let totalVolume = 0;
      let totalReps = 0;
      let maxWeight = 0;

      for (const set of sets) {
        if (!set.completed) continue;

        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;

        totalReps += reps;
        totalVolume += reps * weight;
        if (weight > maxWeight) maxWeight = weight;
      }

      if (!history[exerciseId]) {
        history[exerciseId] = [];
      }

      history[exerciseId].push({
        date: sessionDate,
        totalVolume,
        totalReps,
        maxWeight,
      });
    }
  }

  // Sort each exercise history by date (old → new)
  Object.values(history).forEach((arr) =>
    arr.sort((a, b) => a.date - b.date)
  );

  return history;
}

export function detectProgressiveOverload(sessions = []) {
  const historyMap = buildExerciseHistory(sessions);
  const results = [];

  for (const exerciseId in historyMap) {
    const history = historyMap[exerciseId];

    if (history.length < 4) {
      results.push({
        exerciseId,
        status: "insufficient_data",
        reason: "not_enough_sessions",
      });
      continue;
    }

    const recent = history.slice(-3);
    const previous = history.slice(-6, -3);

    const sum = (arr, key) =>
      arr.reduce((acc, item) => acc + item[key], 0);

    const recentMetrics = {
      volume: sum(recent, "totalVolume"),
      reps: sum(recent, "totalReps"),
      weight: Math.max(...recent.map((s) => s.maxWeight)),
    };

    const previousMetrics = {
      volume: sum(previous, "totalVolume"),
      reps: sum(previous, "totalReps"),
      weight: Math.max(...previous.map((s) => s.maxWeight)),
    };

    let status = "stagnant";
    let reason = "none";

    if (recentMetrics.weight > previousMetrics.weight) {
      status = "progressing";
      reason = "weight";
    } else if (recentMetrics.reps > previousMetrics.reps) {
      status = "progressing";
      reason = "reps";
    } else if (recentMetrics.volume > previousMetrics.volume) {
      status = "progressing";
      reason = "volume";
    } else if (
      recentMetrics.volume < previousMetrics.volume ||
      recentMetrics.reps < previousMetrics.reps
    ) {
      status = "regressing";
      reason = "performance_drop";
    }

    results.push({
      exerciseId,
      status,
      reason,
    });
  }

  return results;
}


export function detectPRs(sessions = []) {
  const historyMap = buildExerciseHistory(sessions);
  const prs = [];

  for (const exerciseId in historyMap) {
    const history = historyMap[exerciseId];

    if (history.length < 2) continue;

    const latest = history[history.length - 1];
    const previous = history.slice(0, -1);

    const maxPrevWeight = Math.max(
      ...previous.map((s) => s.maxWeight)
    );
    const maxPrevReps = Math.max(
      ...previous.map((s) => s.totalReps)
    );
    const maxPrevVolume = Math.max(
      ...previous.map((s) => s.totalVolume)
    );

    if (latest.maxWeight > maxPrevWeight) {
      prs.push({
        exerciseId,
        type: "weight",
        value: latest.maxWeight,
        date: latest.date.toISOString(),
      });
    }

    if (latest.totalReps > maxPrevReps) {
      prs.push({
        exerciseId,
        type: "reps",
        value: latest.totalReps,
        date: latest.date.toISOString(),
      });
    }

    if (latest.totalVolume > maxPrevVolume) {
      prs.push({
        exerciseId,
        type: "volume",
        value: latest.totalVolume,
        date: latest.date.toISOString(),
      });
    }
  }

  return prs;
}


function getWeekKey(date) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNumber}`;
}


function buildWeeklyVolumeMap(sessions = []) {
  const weeklyMap = {};

  for (const session of sessions) {
    const weekKey = getWeekKey(session.date);

    for (const exercise of session.exercises) {
      const { exerciseId, sets } = exercise;

      let sessionVolume = 0;

      for (const set of sets) {
        if (!set.completed) continue;

        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        sessionVolume += reps * weight;
      }

      if (!weeklyMap[exerciseId]) {
        weeklyMap[exerciseId] = {};
      }

      if (!weeklyMap[exerciseId][weekKey]) {
        weeklyMap[exerciseId][weekKey] = 0;
      }

      weeklyMap[exerciseId][weekKey] += sessionVolume;
    }
  }

  return weeklyMap;
}


export function analyzeVolumeTrends(sessions = []) {
  const weeklyMap = buildWeeklyVolumeMap(sessions);
  const trends = [];

  for (const exerciseId in weeklyMap) {
    const weeks = Object.keys(weeklyMap[exerciseId]).sort();

    if (weeks.length < 3) {
      trends.push({
        exerciseId,
        trend: "insufficient_data",
      });
      continue;
    }

    const recentWeeks = weeks.slice(-2);
    const previousWeeks = weeks.slice(-4, -2);

    const sumWeeks = (keys) =>
      keys.reduce(
        (acc, key) => acc + (weeklyMap[exerciseId][key] || 0),
        0
      );

    const recentVolume = sumWeeks(recentWeeks);
    const previousVolume = sumWeeks(previousWeeks);

    if (previousVolume === 0) {
      trends.push({
        exerciseId,
        trend: "insufficient_data",
      });
      continue;
    }

    const delta =
      ((recentVolume - previousVolume) / previousVolume) * 100;

    let trend = "flat";

    if (delta >= 5) trend = "increasing";
    else if (delta <= -5) trend = "declining";

    trends.push({
      exerciseId,
      trend,
    });
  }

  return trends;
}

function getRecentSessionCount(history, count = 4) {
  return history.slice(-count).length;
}

export function detectStagnation(sessions = []) {
  const overloadSignals = detectProgressiveOverload(sessions);
  const prs = detectPRs(sessions);
  const volumeTrends = analyzeVolumeTrends(sessions);
  const historyMap = buildExerciseHistory(sessions);

  const stagnationResults = [];

  for (const exerciseId in historyMap) {
    const history = historyMap[exerciseId];

    if (history.length < 4) {
      stagnationResults.push({
        exerciseId,
        stagnated: false,
        reason: "insufficient_data",
      });
      continue;
    }

    const overload = overloadSignals.find(
      (o) => o.exerciseId === exerciseId
    );

    const hasRecentPR = prs.some(
      (pr) => pr.exerciseId === exerciseId
    );

    const volume = volumeTrends.find(
      (v) => v.exerciseId === exerciseId
    );

    const recentSessionCount = getRecentSessionCount(history, 4);

    const isStagnant =
      overload?.status !== "progressing" &&
      !hasRecentPR &&
      (volume?.trend === "flat" || volume?.trend === "declining") &&
      recentSessionCount >= 4;

    stagnationResults.push({
      exerciseId,
      stagnated: isStagnant,
      duration: recentSessionCount,
      signals: {
        overload: overload?.status || "unknown",
        volumeTrend: volume?.trend || "unknown",
        prDetected: hasRecentPR,
      },
    });
  }

  return stagnationResults;
}

function hasHighTrainingDensity(sessions = []) {
  if (sessions.length < 3) return false;

  const dates = sessions
    .map((s) => new Date(s.date))
    .sort((a, b) => a - b);

  let streak = 1;

  for (let i = 1; i < dates.length; i++) {
    const diffDays =
      (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak += 1;
      if (streak >= 3) return true;
    } else {
      streak = 1;
    }
  }

  return false;
}

function detectVolumeSpike(sessions = []) {
  const weeklyMap = buildWeeklyVolumeMap(sessions);
  let spikeDetected = false;

  for (const exerciseId in weeklyMap) {
    const weeks = Object.keys(weeklyMap[exerciseId]).sort();
    if (weeks.length < 2) continue;

    const lastWeek = weeklyMap[exerciseId][weeks[weeks.length - 1]];
    const prevWeek = weeklyMap[exerciseId][weeks[weeks.length - 2]];

    if (prevWeek > 0) {
      const increase = ((lastWeek - prevWeek) / prevWeek) * 100;
      if (increase >= 25) {
        spikeDetected = true;
        break;
      }
    }
  }

  return spikeDetected;
}

export function detectFatigue(sessions = []) {
  const overloadSignals = detectProgressiveOverload(sessions);

  const performanceDrop = overloadSignals.some(
    (o) => o.status === "regressing"
  );

  const volumeSpike = detectVolumeSpike(sessions);
  const highDensity = hasHighTrainingDensity(sessions);

  const signals = {
    volumeSpike,
    performanceDrop,
    highDensity,
  };

  const activeSignals = Object.values(signals).filter(Boolean)
    .length;

  let level = "low";
  if (activeSignals === 2) level = "moderate";
  if (activeSignals === 3) level = "high";

  return {
    level,
    signals,
  };
}

export function runPerformanceAnalysis(sessions = []) {
  return {
    overload: detectProgressiveOverload(sessions),
    prs: detectPRs(sessions),
    volumeTrends: analyzeVolumeTrends(sessions),
    stagnation: detectStagnation(sessions),
    fatigue: detectFatigue(sessions),
  };
}
