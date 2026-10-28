import { ImageResponse } from "next/og";

export const alt = "A letter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#efe8dc",
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            background: "#8d3b48",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
