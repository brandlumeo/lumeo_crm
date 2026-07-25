import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 5 20 L 5 80 L 25 100 L 85 100 L 85 75 L 30 75 L 30 20 Z"
            fill="#1C1B19"
          />
          <path
            d="M 45 5 L 100 5 L 100 60 Z"
            fill="#eb5e28"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
