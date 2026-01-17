import React from "react";

export default function LogoStatic({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 210 297"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        .stroke {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>

      {/* აქ დატოვე შენი path-ები 그대로 */}
      <g>
        <path className="stroke" style={{ strokeWidth: 2.452 }} d="M 14.023932,169.0076 ... z" />
        {/* ყველა სხვა path იგივე დატოვე */}
      </g>
    </svg>
  );
}
