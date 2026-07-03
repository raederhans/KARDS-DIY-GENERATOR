import { CARD_HEIGHT, CARD_WIDTH } from "./canvas/layout";

export type ImageDataLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
};

export type ImageDiffMetrics = {
  width: number;
  height: number;
  comparedPixels: number;
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  maxChannelDelta: number;
  changedPixels: number;
  changedPixelRatio: number;
};

export function calculateImageDataDiff(
  actual: ImageDataLike,
  expected: ImageDataLike,
  threshold = 12,
): ImageDiffMetrics {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error("Image data dimensions must match before pixel diff can run.");
  }
  if (actual.width <= 0 || actual.height <= 0) {
    throw new Error("Image data dimensions must be positive before pixel diff can run.");
  }
  const requiredLength = actual.width * actual.height * 4;
  if (actual.data.length < requiredLength || expected.data.length < requiredLength) {
    throw new Error("Image data arrays must contain RGBA values for every compared pixel.");
  }

  const comparedPixels = actual.width * actual.height;
  let absoluteDeltaTotal = 0;
  let squaredDeltaTotal = 0;
  let maxChannelDelta = 0;
  let changedPixels = 0;

  for (let pixelIndex = 0; pixelIndex < comparedPixels; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    let pixelChanged = false;

    for (let channelOffset = 0; channelOffset < 4; channelOffset += 1) {
      const channelDelta = Math.abs(actual.data[offset + channelOffset] - expected.data[offset + channelOffset]);
      absoluteDeltaTotal += channelDelta;
      squaredDeltaTotal += channelDelta * channelDelta;
      maxChannelDelta = Math.max(maxChannelDelta, channelDelta);
      if (channelDelta > threshold) {
        pixelChanged = true;
      }
    }

    if (pixelChanged) {
      changedPixels += 1;
    }
  }

  const channelCount = comparedPixels * 4;
  return {
    width: actual.width,
    height: actual.height,
    comparedPixels,
    meanAbsoluteError: roundMetric(absoluteDeltaTotal / channelCount),
    rootMeanSquareError: roundMetric(Math.sqrt(squaredDeltaTotal / channelCount)),
    maxChannelDelta,
    changedPixels,
    changedPixelRatio: roundMetric(changedPixels / comparedPixels),
  };
}

export async function compareCanvasToReferenceFile(
  canvas: HTMLCanvasElement,
  file: File,
): Promise<ImageDiffMetrics> {
  const actualContext = canvas.getContext("2d");
  if (!actualContext) {
    throw new Error("The card canvas is not available for pixel diff.");
  }

  const referenceImage = await loadImageFromFile(file);
  const referenceCanvas = document.createElement("canvas");
  referenceCanvas.width = CARD_WIDTH;
  referenceCanvas.height = CARD_HEIGHT;
  const referenceContext = referenceCanvas.getContext("2d");
  if (!referenceContext) {
    throw new Error("The reference canvas is not available for pixel diff.");
  }

  referenceContext.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  referenceContext.drawImage(referenceImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  const actualData = actualContext.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const referenceData = referenceContext.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
  return calculateImageDataDiff(actualData, referenceData);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name} as an image.`));
    };
    image.src = url;
  });
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}
