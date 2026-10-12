interface FrustrationScoreProps {
  score: number;
}

export function FrustrationScore({ score }: FrustrationScoreProps) {
  return (
    <div className="frustration-score">
      <div className="frustration-score-header">
        <span>Frustration Score</span>
        <strong>{score}/100</strong>
      </div>
      <div className="frustration-score-bar" aria-label={`Frustration score: ${score} out of 100`}>
        <span style={{ width: `${score}%` }} />
      </div>
      <p>
        Estimated from complaint repetition, dissatisfaction language, and escalation cues. This score is an
        estimate and not a direct priority or routing indicator.
      </p>
    </div>
  );
}
