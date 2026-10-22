import { ImageResponse } from "next/og";
import IconArtwork from "../artwork";

export function GET() {
  return new ImageResponse(<IconArtwork size={180} />, { width: 180, height: 180 });
}
