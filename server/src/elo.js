// Standard logistic Elo curve, dubbed "Smash Rating" throughout the app.
export function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

// K shrinks as a contender racks up more matches, so early smashes move the
// rating fast (quick convergence for new entries) and settle down later.
export function kFactor(totalSmashes) {
  if (totalSmashes < 10) return 48;
  if (totalSmashes < 30) return 32;
  return 20;
}

export function computeSmashUpdate(winnerRating, winnerTotalSmashes, loserRating, loserTotalSmashes) {
  const winnerExpected = expectedScore(winnerRating, loserRating);
  const loserExpected = expectedScore(loserRating, winnerRating);

  const winnerK = kFactor(winnerTotalSmashes);
  const loserK = kFactor(loserTotalSmashes);

  const winnerDelta = winnerK * (1 - winnerExpected);
  const loserDelta = loserK * (0 - loserExpected);

  return {
    winnerDelta: Math.round(winnerDelta * 100) / 100,
    loserDelta: Math.round(loserDelta * 100) / 100,
  };
}

// Relative tiering: rank among currently-active contenders, not fixed
// rating bands, so tiers stay meaningful as the whole pool shifts.
export function assignTiers(itemsSortedDesc) {
  const n = itemsSortedDesc.length;
  return itemsSortedDesc.map((item, index) => {
    const percentile = n <= 1 ? 0 : index / (n - 1);
    let tier;
    if (percentile <= 0.1) tier = 'S';
    else if (percentile <= 0.3) tier = 'A';
    else if (percentile <= 0.7) tier = 'B';
    else if (percentile <= 0.9) tier = 'C';
    else tier = 'D';
    return { ...item, rank: index + 1, tier };
  });
}
