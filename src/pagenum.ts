import { writeFileSync } from "fs";
import { flow, range, values } from "lodash/fp";
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
      .option("vertical", {
        alias: ["v", "y"],
        describe: "Vertical position of the page number",
        default: "bottom",
        type: "string",
        coerce: (value: string) =>
          either(number, oneOf(["top", "bottom", "middle"] as const)).verify(
            value
          ),
      })
      .option("horizontal", {
        alias: ["h", "x"],
        describe: "Horizontal position of the page number",
        default: "left",
        type: "string",
        coerce: (value: string) =>
          either(number, oneOf(["left", "right", "middle"] as const)).verify(
            value
          ),
      })
      .option("alternate", {
        describe: "Alternate page number horizontal position",
        choices: ["parity", "halves"] as const,
      })
      .option("font", {
        describe: "Page number font",
        choices: values(StandardFonts),
        default: StandardFonts.HelveticaBold,
      })
      .option("size", {
        describe: "Page number font size",
        type: "number",
      })
      .option("padding", {
        describe: "Page border padding",
        type: "number",
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
  position: HorizontalPosition
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
  position: VerticalPositon
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

const alternateHorizontalPos = (
  position: HorizontalPosition,
  pageWidth: number
): HorizontalPosition => {
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

const getAlternatedHorizontalPos = (
  position: HorizontalPosition,
  pageWidth: number,
  pageCount: number,
  pageIndex: number,
  alternate?: Alternate
): HorizontalPosition => {
  if (!alternate) return position;
  switch (alternate) {
    case "parity":
      return pageIndex % 2 == 0
        ? position
        : alternateHorizontalPos(position, pageWidth);
    case "halves":
      return pageIndex < pageCount / 2
        ? position
        : alternateHorizontalPos(position, pageWidth);
  }
};

const drawPageNum = (
  pageNum: number,
  pageCount: number,
  page: PDFPage,
  font: PDFFont,
  opts: Opts
) => {
  if (opts.skip.includes(pageNum)) return;
  if (pageNum == pageCount && opts.skip.includes("last")) return;

  const horizontalPos = getAlternatedHorizontalPos(
    opts.horizontal,
    page.getWidth(),
    pageCount,
    pageNum - 1,
    opts.alternate
  );

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fontSize = opts.size ?? pageWidth * 0.05;
  const padding = opts.padding ?? pageWidth * 0.05;
  const text = `${pageNum}`;
  page.drawText(text, {
    x: getXPosition(pageWidth, padding, horizontalPos),
    y: getYPosition(pageHeight, padding, opts.vertical),
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
};

const handler = async (opts: Opts): Promise<void> => {
  const data = await readInputOrStdin(opts.input);
  const sourceDoc = await PDFDocument.load(data);
  const embeddedFont = await sourceDoc.embedFont(opts.font);

  const pages = sourceDoc.getPages();

  const startIndex = Math.max(0, opts.offset);
  range(startIndex, pages.length).forEach((i) => {
    const page = pages[i];
    const pageNum = i - opts.offset + 1;
    drawPageNum(pageNum, pages.length, page, embeddedFont, opts);
  });

  const pdfBytes = await sourceDoc.save();
  writeOutputOrStdout(pdfBytes, opts.output);
};

export { command, description, builder, handler, aliases };
