const Split = require("../models/Split");

const scoreSplit = (split, user) => {
  let score = 0;

  // 1️⃣ Experience match
  if (split.recommendedFor.experience.includes(user.experience)) {
    score += 40;
  }

  // 2️⃣ Days per week match
  if (split.recommendedFor.daysPerWeek.includes(user.days)) {
    score += 30;
  } else {
    // allow near match (+/-1 day)
    const nearMatch = split.recommendedFor.daysPerWeek.some(
      d => Math.abs(d - user.days) === 1
    );
    if (nearMatch) score += 15;
  }

  // 3️⃣ Training preference match
  if (
    split.type === user.trainingPreference ||
    split.type === "Mixed"
  ) {
    score += 20;
  }

  // 4️⃣ Goal match
  if (split.recommendedFor.goals.includes(user.goal)) {
    score += 10;
  }

  return score;
};

exports.getBestSplits = async (userProfile) => {
  const splits = await Split.find();

  const scoredSplits = splits.map(split => ({
    split,
    score: scoreSplit(split, userProfile)
  }));

  // Sort by highest score
  scoredSplits.sort((a, b) => b.score - a.score);

  // Return top 3 recommendations
  return scoredSplits
    .filter(item => item.score > 0)
    .slice(0, 3)
    .map(item => ({
      ...item.split.toObject(),
      matchScore: item.score
    }));
};
