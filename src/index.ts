import yargs from "yargs";
import * as pad from "./pad";
import * as merge from "./merge";
import * as split from "./split";
import * as generate from "./generate";
import * as reorder from "./reorder";
import * as pagenum from "./pagenum";

yargs
  .scriptName("pdf-cli")
  .command(pagenum)
  .command(merge)
  .command(split)
  .command(generate)
  .command(pad)
  .command(reorder)
  .demandCommand()
  .help().argv;
