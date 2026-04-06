import { Image, ImageSourcePropType } from "react-native";

type AddOneLogoProps = {
  color?: string;
  height?: number;
  opacity?: number;
  width?: number;
};

const LOGO_MARK_ASPECT_RATIO = 804 / 594;
const LOGO_VERTICAL_ASPECT_RATIO = 1290 / 1070;
const LOGO_WORDMARK_ASPECT_RATIO = 1745 / 249;

const LOGO_ASSETS = {
  light: {
    mark: require("../../assets/branding/logos/ao_white_chmrk.png"),
    vertical: require("../../assets/branding/logos/ao_white_v.png"),
    wordmark: require("../../assets/branding/logos/ao_white_h.png"),
  },
  dark: {
    mark: require("../../assets/branding/logos/ao_black_chmrk.png"),
    vertical: require("../../assets/branding/logos/ao_black_v.png"),
    wordmark: require("../../assets/branding/logos/ao_black_h.png"),
  },
} satisfies Record<"dark" | "light", Record<"mark" | "vertical" | "wordmark", ImageSourcePropType>>;

function resolveDimensions(aspectRatio: number, width?: number, height?: number) {
  if (width && height) {
    return { width, height };
  }

  if (width) {
    return { width, height: width / aspectRatio };
  }

  if (height) {
    return { width: height * aspectRatio, height };
  }

  return { width: 120, height: 120 / aspectRatio };
}

function resolveTone(color?: string) {
  const normalized = color?.trim().toLowerCase();
  if (normalized === "#000" || normalized === "#000000" || normalized === "black") {
    return "dark" as const;
  }

  return "light" as const;
}

function LogoImage({
  aspectRatio,
  height,
  opacity = 1,
  source,
  width,
}: Omit<AddOneLogoProps, "color"> & { aspectRatio: number; source: ImageSourcePropType }) {
  const dimensions = resolveDimensions(aspectRatio, width, height);

  return (
    <Image
      resizeMode="contain"
      source={source}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        opacity,
      }}
    />
  );
}

export function AddOneLogoMark({ color = "#FFFFFF", height, opacity = 1, width }: AddOneLogoProps) {
  const tone = resolveTone(color);

  return (
    <LogoImage
      aspectRatio={LOGO_MARK_ASPECT_RATIO}
      height={height}
      opacity={opacity}
      source={LOGO_ASSETS[tone].mark}
      width={width}
    />
  );
}

export function AddOneLogoWordmark({ color = "#FFFFFF", height, opacity = 1, width }: AddOneLogoProps) {
  const tone = resolveTone(color);

  return (
    <LogoImage
      aspectRatio={LOGO_WORDMARK_ASPECT_RATIO}
      height={height}
      opacity={opacity}
      source={LOGO_ASSETS[tone].wordmark}
      width={width}
    />
  );
}

export function AddOneLogoVertical({ color = "#FFFFFF", height, opacity = 1, width }: AddOneLogoProps) {
  const tone = resolveTone(color);

  return (
    <LogoImage
      aspectRatio={LOGO_VERTICAL_ASPECT_RATIO}
      height={height}
      opacity={opacity}
      source={LOGO_ASSETS[tone].vertical}
      width={width}
    />
  );
}
