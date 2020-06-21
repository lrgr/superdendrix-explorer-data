// Load required modules
const fs = require("fs");
const path = require("path");
const d3DSV = require("d3-dsv");
const axios = require("axios");

// Process command line arguments
const args = process.argv;
if (args.length < 5){
  console.error('Requires four arguments: scores file URL, 2C profiles file URL, output directory, and prefix.')
  process.exit(1);
}

const [scoresFileURL, twoComponentProfilesFileURL, outputDirectory, prefix] = args.slice(2);


// Process the 2C profiles file
axios.get(twoComponentProfilesFileURL)
  .then((profilesResponse) => {
    // Sanity checking
    if (profilesResponse.status !== 200){
      throw new Error(`Got a response with status code ${profilesResponse.status}`);
    }

    axios.get(scoresFileURL)
      .then((scoresResponse) => {
        // Sanity checking
        if (scoresResponse.status !== 200){
          throw new Error(`Got a response with status code ${scoresResponse.status}`);
        }

        // Process the file content
        const parsedLines = d3DSV.tsvParse(profilesResponse.data);
        const profileToThresholdScore = {};
        const profileToDirection = {};

        parsedLines.forEach(({
          gene,
          TwoCscore_at_6sigma,
          direction,
        }) => {
          gene = gene.split(' ')[0];
          profileToThresholdScore[gene] = parseFloat(TwoCscore_at_6sigma);
          profileToDirection[gene] = direction;
        });

        // Restrict to the 2C components
        const profiles = new Set(Object.keys(profileToThresholdScore));

        // Process the scores file
        const lines = scoresResponse.data.split('\n');
        const header = lines.shift().split('\t').slice(1).map((x) => x.split(' ')[0]);
        const profileToScores = {};
        header.forEach((profile) => {
          profileToScores[profile] = {};
        });

        const samples = new Set([]);
        lines.forEach((line) => {
          const arr = line.split('\t');
          const sample = arr.shift();
          arr.forEach((score, i) => {
            if (profiles.has(header[i])){
              profileToScores[header[i]][sample] = parseFloat(score);
            }
          });
          samples.add(sample);
        });

        console.log(`- Profiles: ${Array.from(profiles).length}`);
        console.log(`- Samples: ${Array.from(samples).length}`);

        // Then write out a manifest and a file per profile
        const outputPrefix = path.join(outputDirectory, prefix, 'profiles');
        if (!fs.existsSync(outputPrefix)) fs.mkdirSync(outputPrefix, { recursive: true });

        const manifestFile = `${outputPrefix}/manifest.json`;
        const manifest = {
          scoresFileURL,
          twoComponentProfilesFileURL,
          outputDirectory,
          profiles: Array.from(profiles).sort(),
          samples: Array.from(samples).sort(),
        };
        fs.writeFileSync(manifestFile, JSON.stringify(manifest));

        profiles.forEach((profile) => {
          const profileFile = `${outputPrefix}/${profile}.json`;
          fs.writeFileSync(profileFile, JSON.stringify({
            scores: profileToScores[profile],
            thresholdScore: profileToThresholdScore[profile],
            direction: profileToDirection[profile],
          }));
        });

      }).catch((error) => {
        throw new Error(error);
      })
    // Process the content
  }).catch((error) => {
    throw new Error(error);
  })
