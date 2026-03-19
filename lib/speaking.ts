function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreSpeakingAccuracy(targetText: string, spokenText: string) {
  const targetTokens = tokenize(targetText);
  const spokenTokens = tokenize(spokenText);

  if (!targetTokens.length || !spokenTokens.length) {
    return {
      score: 0,
      matchedWords: 0,
      totalWords: targetTokens.length,
      missingWords: targetTokens,
      extraWords: spokenTokens,
      feedback: "Start speaking to receive feedback.",
    };
  }

  const targetSet = new Set(targetTokens);
  const spokenSet = new Set(spokenTokens);
  const matchedWords = spokenTokens.filter((word) => targetSet.has(word)).length;
  const missingWords = targetTokens.filter((word) => !spokenSet.has(word));
  const extraWords = spokenTokens.filter((word) => !targetSet.has(word));
  const score = Math.max(
    0,
    Math.min(100, Math.round((matchedWords / targetTokens.length) * 100)),
  );

  let feedback = "Nice effort. Keep repeating the sentence to improve fluency.";

  if (score >= 90) {
    feedback = "Excellent accuracy. Your spoken response closely matches the prompt.";
  } else if (score >= 70) {
    feedback = "Good progress. Focus on the missing words to make it sound complete.";
  } else if (score < 50) {
    feedback = "Try speaking more slowly and follow the full sentence on screen.";
  }

  return {
    score,
    matchedWords,
    totalWords: targetTokens.length,
    missingWords,
    extraWords,
    feedback,
  };
}
