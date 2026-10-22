import { ImageResponse } from "next/og";
import IconArtwork from "../artwork";

export function GET() {
  return new ImageResponse(<IconArtwork size={192} />, { width: 192, height: 192 });
}
