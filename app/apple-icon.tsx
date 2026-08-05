import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(145deg, #de9b35, #a86f1c)",
            color: "#140e05",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "0.04em",
            clipPath:
              "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
          }}
        >
          CS2
        </div>
      </div>
    ),
    size,
  );
}
