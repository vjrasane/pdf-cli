import { number } from "decoders";
import { writeFileSync } from "fs";
import { flow } from "lodash/fp";
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { Argv } from "yargs";
import { outputOption, sizeOptions } from "./common";
import { OptionsType, writeOutputOrStdout } from "./utils";

const command = "generate <pages>";

const description = "Generate dummy PDF";

const aliases = ["gen"];

const builder = flow(
  (args: Argv<{}>) =>
    args
      .positional("pages", {
        describe: "Number of pages in the generated PDF",
        demandOption: true,
        type: "number",
      })
      .option("orientation", {
        describe: "Orientation of the pages",
        choices: ["portrait", "landscape"] as const,
        default: "portrait" as const,
      }),
  outputOption,
  sizeOptions
);

type Opts = OptionsType<typeof builder>;

const getDimensions = (
  width: number,
  height: number,
  orientation: Opts["orientation"]
): [number, number] => {
  switch (orientation) {
    case "portrait":
      return [width, height];
    case "landscape":
      return [height, width];
  }
};

const generatePage = (
  doc: PDFDocument,
  font: PDFFont,
  pageNum: number,
  opts: Opts
) => {
  const dimensions: [number, number] = getDimensions(
    opts.width,
    opts.height,
    opts.orientation
  );
  const page = doc.addPage(dimensions);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fontSize = pageWidth / 1.5;
  const text = `${pageNum}`;
  page.drawText(text, {
    x: pageWidth / 2 - (fontSize / 4) * text.length,
    y: pageHeight / 2 - fontSize / 4,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
};

const handler = async (opts: Opts): Promise<void> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 0; i < opts.pages; i++) {
    generatePage(pdfDoc, font, i + 1, opts);
  }

  const pdfBytes = await pdfDoc.save();
  writeOutputOrStdout(pdfBytes, opts.output);
};

export { command, description, builder, handler, aliases };
