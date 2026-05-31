import type { ArchiveGuideState } from "@/src/lib/archive-guide-types";

export type { ArchiveGuideState };

type ArchiveGuideCharacterProps = {
  state?: ArchiveGuideState;
  compact?: boolean;
  muted?: boolean;
  message?: string;
};

const stateLabels: Record<ArchiveGuideState, string> = {
  idle: "Archive Guide beta is waiting patiently.",
  listening: "Archive Guide beta is listening.",
  thinking: "Archive Guide beta is thinking through the search.",
  curious: "Archive Guide beta is curious about the results.",
  encouraging: "Archive Guide beta is encouraging another path.",
  pointing: "Archive Guide beta is pointing toward a next step.",
  celebrating: "Archive Guide beta is celebrating a useful research move.",
  careful: "Archive Guide beta is inviting a cultural care check.",
  sleeping: "Archive Guide beta is resting.",
};

export default function ArchiveGuideCharacter({
  state = "idle",
  compact = false,
  muted = false,
  message,
}: ArchiveGuideCharacterProps) {
  const effectiveState = muted ? "sleeping" : state;
  const label = message ? `Archive Guide beta. ${message}` : stateLabels[effectiveState];

  return (
    <figure
      className={[
        "archive-guide-character",
        `archive-guide-character--${effectiveState}`,
        compact ? "archive-guide-character--compact" : "",
        muted ? "is-muted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 169.49 180.77" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        {/* Outer green organic body */}
        <g className="archive-guide-character__body">
          <path
            d="M71.4,15.93C45.62-6.48.45,30.92,37.12,51.88c-32.2-5.13-55.18,38.8-17.9,50.25-47.66,6.17,7.69,90.46,36.16,49.99,3.56,40.1,74.98,37.33,69.49-3.52,13.19,25.21,72.91-25.24,28.4-54.14,23.25-19.61,18.51-56.08-17.32-53.82,4.72-31.04-12.71-52.12-42.77-33.87C85.99-.05,75.21.24,71.4,15.93Z"
            fill="#009444"
          />
          <path
            d="M73.75,52.12c-5.67,2.2-11.2,6.25-16.23,12.57-12.7,15.96-13.91,35.68-.94,52.45,14.69,18.98,42.85,24.31,60.99,4.5,28.25-30.86-10.34-82.48-43.83-69.51Z"
            fill="#009444"
          />
          <path
            d="M81.51,72.29c-26.13,9.59.69,51.79,18,28.24,4.95-6.73,6.79-19.91.01-26.24-3.14-2.93-12.97-6.14-18.01-2Z"
            fill="#009444"
          />
        </g>

        {/* Yellow-lime eye ring */}
        <g className="archive-guide-character__eye-ring">
          <path
            d="M67.31,50.6c-12.9,7.17-23.81,18.51-29.17,30.58-6.96,15.66-6.49,31.28,4.72,44.98,19,23.2,67.96,27.22,84.82-.55,12.64-20.81,11.79-60.97-9.82-75.84-15.37-10.57-34.5-8.09-50.56.83Z"
            fill="#d7df23"
          />
        </g>

        {/* White sclera */}
        <g className="archive-guide-character__eye-white">
          <path
            d="M73.48,65.93c-8.33,4.64-15.38,11.96-18.85,19.76-4.5,10.12-4.19,20.22,3.05,29.06,12.28,14.99,43.92,17.59,54.81-.36,8.17-13.45,7.62-39.4-6.34-49.01-9.93-6.83-22.3-5.23-32.67.54Z"
            fill="#fff"
          />
        </g>

        {/* Teal iris */}
        <g className="archive-guide-character__iris">
          <path
            d="M78.25,77.78c-4.81,2.67-8.87,6.9-10.87,11.4-2.59,5.84-2.42,11.66,1.76,16.76,7.08,8.65,25.33,10.14,31.61-.21,4.71-7.76,4.39-22.73-3.66-28.27-5.73-3.94-12.86-3.02-18.84.31Z"
            fill="#5b8687"
          />
        </g>

        {/* Thinking / active dots */}
        <g className="archive-guide-character__thinking-dots">
          <circle cx="134" cy="36" r="5" fill="#d7df23" />
          <circle cx="149" cy="24" r="4" fill="#009444" opacity="0.8" />
          <circle cx="158" cy="42" r="3" fill="#5b8687" opacity="0.7" />
        </g>

        {/* Sleep Z lines */}
        <g className="archive-guide-character__sleep-lines">
          <text x="118" y="48" fill="#d7df23" fontSize="22" fontWeight="bold" fontFamily="sans-serif" opacity="0.9">Z</text>
          <text x="132" y="32" fill="#d7df23" fontSize="15" fontWeight="bold" fontFamily="sans-serif" opacity="0.7">z</text>
        </g>
      </svg>
    </figure>
  );
}
