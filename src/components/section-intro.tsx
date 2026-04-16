"use client";

import { useState, useEffect } from "react";

interface Props {
  storageKey: string;
  illustration: string;
  title: string;
  description: string;
  buttonLabel?: string;
  /** Preview mode — bypasses localStorage, always shows the intro card */
  forceShow?: boolean;
  children: React.ReactNode;
}

export function SectionIntro({
  storageKey,
  illustration,
  title,
  description,
  buttonLabel = "Show me",
  forceShow = false,
  children,
}: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (forceShow) { setDismissed(false); return; }
    setDismissed(!!localStorage.getItem(storageKey));
  }, [storageKey, forceShow]);

  function dismiss() {
    if (forceShow) return;
    setOpacity(0);
    setTimeout(() => {
      localStorage.setItem(storageKey, "1");
      setDismissed(true);
      setOpacity(1);
    }, 180);
  }

  if (dismissed === null) return null;

  return (
    <div style={{ opacity, transition: "opacity 0.18s ease" }}>
      {!dismissed ? (
        // Exact Figma values: w-652, py-32, px-10, gap-8 between sections
        <div
          className="bg-neutral-2 rounded-[16px] flex flex-col items-start"
          style={{ width: 652, paddingTop: 32, paddingBottom: 32, gap: 16 }}
        >
          {/* Illustration wrapper — px-72 each side */}
          <div className="w-full flex flex-col items-start" style={{ paddingLeft: 72, paddingRight: 72 }}>
            {/* Outer: fixed size + blend mode */}
            <div
              className="relative mix-blend-multiply shrink-0"
              style={{ width: 360, height: 241 }}
            >
              {/* Inner: clips the oversized image */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={illustration}
                  alt=""
                  className="absolute select-none"
                  style={{
                    width: "130.61%",
                    height: "129.95%",
                    left: "-15.31%",
                    top: "-12.18%",
                    maxWidth: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Text + button — pl-32 pr-64, gap-10 between text block and button */}
          <div
            className="w-full flex flex-col items-start"
            style={{ paddingLeft: 32, paddingRight: 64, gap: 10 }}
          >
            <div>
              <p className="text-size-3 font-medium text-neutral-12 leading-6">{title}</p>
              <p className="text-size-3 text-neutral-10 leading-6">{description}</p>
            </div>

            <button
              onClick={dismiss}
              className="h-10 px-4 rounded bg-white text-size-2 font-medium text-neutral-12 cursor-pointer shrink-0"
              style={{
                boxShadow:
                  "0px 1px 3px rgba(0,0,0,0.05), 0px 2px 1px rgba(0,0,0,0.05), 0px 1px 4px rgba(0,0,45,0.09)",
              }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
