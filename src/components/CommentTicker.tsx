"use client";

type CommentTickerProps = {
  comments: string[];
};

export function CommentTicker({ comments }: CommentTickerProps) {
  const tickerText = comments.length
    ? comments.join("  •  ")
    : "Waiting for WSB sentiment packets";

  return (
    <div className="comment-ticker" aria-label="Live WallStreetBets comment ticker">
      <div className="ticker-track">{tickerText}</div>
    </div>
  );
}
