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

const generatePage = (
  doc: PDFDocument,
  font: PDFFont,
  num: number,
  size: [number, number]
) => {
  const page = doc.addPage(size);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fontSize = pageWidth / 1.5;
  const text = `${num}`;
  page.drawText(text, {
    x: pageWidth / 2 - (fontSize / 4) * text.length,
    y: pageHeight / 2 - fontSize / 4,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
};

const builder = flow(
  (args: Argv<{}>) =>
    args.positional("pages", {
      describe: "Number of pages in the generated PDF",
      demandOption: true,
      type: "number",
    }),
  outputOption,
  sizeOptions
);

const handler = async ({
  pages,
  output,
  width,
  height,
}: OptionsType<typeof builder>): Promise<void> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 0; i < pages; i++) {
    generatePage(pdfDoc, font, i + 1, [width, height]);
  }

  const pdfBytes = await pdfDoc.save();
  writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler, aliases };
