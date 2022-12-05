import { writeFileSync } from "fs";
import { flow } from "lodash/fp";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { Argv } from "yargs";
import { ioOptions, outputOption, sizeOptions } from "./common";
import { OptionsType, readInputOrStdin, writeOutputOrStdout } from "./utils";
import { array, number, either, oneOf } from "decoders";

const command = "pagenum";

const aliases = ["num", "nums", "numbers"];

const description = "Add page numbers PDF";

const builder = flow(
  (args: Argv<{}>) =>
    args
      .option("offset", {
        describe: "Start page numbering at given page number",
        default: 0,
        type: "number",
      })
      .option("skip", {
        describe: "Skip given page number/last",
        default: [],
        type: "array",
        coerce: (value: any[]) =>
          array(either(number, oneOf(["last"] as const))).verify(value),
      })
      .option("horizontal", {
        alias: ["h", "y"],
        describe: "Horizontal position of the page number",
        default: "bottom",
        type: "string",
        coerce: (value: string) =>
          either(number, oneOf(["top", "bottom", "middle"] as const)).verify(
            value
          ),
      })
      .option("vertical", {
        alias: ["v", "x"],
        describe: "Vertical position of the page number",
        default: "left",
        type: "string",
        coerce: (value: string) =>
          either(number, oneOf(["left", "right", "middle"] as const)).verify(
            value
          ),
      })
      .option("alternate", {
        describe: "Alternate page number vertical position",
        choices: ["parity", "halves"] as const,
      }),
  ioOptions
);

type Opts = OptionsType<typeof builder>;

type VerticalPositon = Opts["vertical"];
type HorizontalPosition = Opts["horizontal"];
type Alternate = Opts["alternate"];

const getXPosition = (
  pageWidth: number,
  padding: number,
  position: VerticalPositon
): number => {
  switch (position) {
    case "left":
      return padding;
    case "right":
      return pageWidth - padding;
    case "middle":
      return pageWidth / 2;
    default:
      return position;
  }
};

const getYPosition = (
  pageHeight: number,
  padding: number,
  position: HorizontalPosition
): number => {
  switch (position) {
    case "top":
      return pageHeight - padding;
    case "bottom":
      return padding;
    case "middle":
      return pageHeight / 2;
    default:
      return position;
  }
};

const drawPageNum = (
  num: number,
  page: PDFPage,
  font: PDFFont,
  position: [VerticalPositon, HorizontalPosition]
) => {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fontSize = pageWidth * 0.05;
  const padding = pageWidth * 0.05;
  const text = `${num}`;
  page.drawText(text, {
    x: getXPosition(pageWidth, padding, position[0]),
    y: getYPosition(pageHeight, padding, position[1]),
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
};

const alternateVerticalPos = (
  position: VerticalPositon,
  pageWidth: number
): VerticalPositon => {
  switch (position) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "middle":
      return "middle";
    default:
      return pageWidth - position;
  }
};

const getAlternatedVerticalPos = (
  position: VerticalPositon,
  pageWidth: number,
  pageCount: number,
  pageIndex: number,
  alternate?: Alternate
): VerticalPositon => {
  if (!alternate) return position;
  switch (alternate) {
    case "parity":
      return pageIndex % 2 == 0
        ? position
        : alternateVerticalPos(position, pageWidth);
    case "halves":
      return pageIndex < pageCount / 2
        ? position
        : alternateVerticalPos(position, pageWidth);
  }
};

const handler = async ({
  input,
  output,
  offset,
  skip,
  horizontal,
  vertical,
  alternate,
}: Opts): Promise<void> => {
  const data = await readInputOrStdin(input);
  const sourceDoc = await PDFDocument.load(data);
  const font = await sourceDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = sourceDoc.getPages();
  for (let i = offset; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = i - offset + 1;
    if (skip.includes(pageNum)) continue;
    if (i == pages.length - 1 && skip.includes("last")) break;
    const alternatedVertical = getAlternatedVerticalPos(
      vertical,
      page.getWidth(),
      pages.length,
      i,
      alternate
    );
    drawPageNum(pageNum, page, font, [alternatedVertical, horizontal]);
  }

  const pdfBytes = await sourceDoc.save();
  writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler, aliases };
