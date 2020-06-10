// Load required modules
const fs = require("fs");
const path = require("path");
const d3DSV = require("d3-dsv");
const axios = require("axios");

// Process command line arguments
const args = process.argv;
if (args.length < 5){
  console.error('Requires three arguments: input file URL, output directory, and prefix.')
  process.exit(1);
}

const [inputFileURL, outputDirectory, prefix] = args.slice(2);

// Download the input file
axios.get(inputFileURL)
  .then((response) => {
    // Sanity checking
    if (response.status !== 200){
      throw new Error(`Got a response with status code ${response.status}`);
    }

    // Process the input file
    const parsedLines = d3DSV.csvParse(response.data);

    const sampleToTissue = {};
    const sampleToAlterationCount = {};
    parsedLines.forEach(({
      CCLE_name,
      primary_tissue,
      alteration_count,
    }) => {
      sampleToTissue[CCLE_name] = primary_tissue;
      sampleToAlterationCount[CCLE_name] = parseInt(alteration_count);
    });

    // Output a manifest to file
    const outputPrefix = path.join(outputDirectory, prefix);
    if (!fs.existsSync(outputPrefix)) fs.mkdirSync(outputPrefix, { recursive: true });

    const manifestFile = `${outputPrefix}/samples.json`
    const manifest = {
      inputFileURL,
      outputDirectory,
      sampleToTissue,
      sampleToAlterationCount,
    };

    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  }).catch((error) => {
    throw new Error(error);
  })
