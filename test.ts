import pdfParseDef from "pdf-parse";
import * as pdfParseStar from "pdf-parse";
const pdfParseReq = require("pdf-parse");

console.log("Default Import typeof:", typeof pdfParseDef);
console.log("Star Import Object Keys:", Object.keys(pdfParseStar));
console.log("Require typeof:", typeof pdfParseReq);
console.log("Require Object Keys:", Object.keys(pdfParseReq));
