import { ImageResponse } from "next/og";
import IconArtwork from "../artwork";

export function GET() {
  return new ImageResponse(<IconArtwork size={512} />, { width: 512, height: 512 });
}
