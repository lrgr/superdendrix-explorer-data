// Load required modules
const fs = require("fs");
const yaml = require("js-yaml");
const { exec } = require("child_process");

// Parse the YAML config file
const fileContents = fs.readFileSync("./config.yml", "utf8");
const {
  outputDirectory,
  datasets,
} = yaml.safeLoad(fileContents);

// Go through each dataset and execute the pipeline
datasets.forEach(({
  name,
  alterationsFileURL,
  samplesFileURL,
  dependenciesFileURL,
  twoComponentProfilesFileURL,
}) => {
  // Alterations
  const alterationsCommand = `node src/processAlterations.js "${alterationsFileURL}" ${outputDirectory} ${name}`;
  exec(alterationsCommand);

  // Samples
  const samplesCommand = `node src/processSamples.js "${samplesFileURL}" ${outputDirectory} ${name}`;
  exec(samplesCommand);

  // Dependencies
  const dependenciesCommand = `node src/processDependencyScores.js "${dependenciesFileURL}" "${twoComponentProfilesFileURL}" ${outputDirectory} ${name}`;
  exec(dependenciesCommand);

});

// Write out a manifest for all the datasets
if (!fs.existsSync(outputDirectory)) fs.mkdirSync(outputDirectory, { recursive: true });

const manifestFile = `${outputDirectory}/manifest.json`;
const manifest = {
  datasets: datasets.map((d) => d.name),
};

fs.writeFileSync(manifestFile, JSON.stringify(manifest));
