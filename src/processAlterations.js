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

// Process the input file
axios.get(inputFileURL)
  .then((response) => {
    // Sanity checking
    if (response.status !== 200){
      throw new Error(`Got a response with status code ${response.status}`);
    }
    
    // Process the content
    const parsedLines = d3DSV.tsvParse(response.data);

    const geneAlterations = {};
    const samples = new Set([]);

    parsedLines.forEach(({
      Alteration,
      Tumor_Sample_Barcode,
      Protein_Change,
    }) => {
      const gene = Alteration.split('_MUT')[0];
      if (!geneAlterations[gene]){
        geneAlterations[gene] = {};
      }
      if (!geneAlterations[gene][Tumor_Sample_Barcode]){
        geneAlterations[gene][Tumor_Sample_Barcode] = [];
      }
      geneAlterations[gene][Tumor_Sample_Barcode].push(Protein_Change);
      samples.add(Tumor_Sample_Barcode);
    });

    const genes = Object.keys(geneAlterations);

    console.log(`- Genes: ${genes.length}`);
    console.log(`- Samples: ${Array.from(samples).length}`);

    // Then write out a manifest and a file per gene
    const outputPrefix = path.join(outputDirectory, prefix, 'genes');
    if (!fs.existsSync(outputPrefix)) fs.mkdirSync(outputPrefix, { recursive: true });

    const manifestFile = `${outputPrefix}/manifest.json`;
    const manifest = {
      inputFileURL,
      outputDirectory,
      alterations: genes.sort(),
      samples: Array.from(samples).sort(),
    };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));

    genes.forEach((gene) => {
      const geneFile = `${outputPrefix}/${gene}.json`;
      fs.writeFileSync(geneFile, JSON.stringify(geneAlterations[gene]));
    });
  }).catch((error) =>  {
    throw new Error(error);
  });
