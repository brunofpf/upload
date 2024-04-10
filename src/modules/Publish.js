// Publish.js

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const publishDashboard = (uploadDir, fileName, callback) => {

  // Initialize variable to store file name
  let pbixFileName = "";

  // Look for .pbix files in the /uploads directory
  fs.readdirSync(uploadDir).forEach((file) => {
    if (file === fileName) {
      pbixFileName = file;
    }
  });

  // Check if a .pbix file was found
  if (pbixFileName !== "") {
    console.log("Found file:", pbixFileName);
  } else {
    console.log("No .pbix file found in the /uploads directory.");
    callback("No .pbix file found in the /uploads directory.");
    return;
  }

  const pbixFilePath = path.join(uploadDir, pbixFileName);

  // Publish the pbix and capture the import value id
  exec(
    `pbicli import pbix --workspace 5ca9a6c2-b2a7-4c0d-9c05-04f29775ca52 --file "${pbixFilePath}" --conflict CreateOrOverwrite`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        return;
      }
      const lines = stdout.split("\n");
      let importId;
      lines.forEach((line) => {
        if (line.includes('"id"')) {
          importId = line
            .split(":")[1]
            .trim()
            .replace(/["{},]/g, "");
        }
      });

      console.log("Import:", importId);

      // Wait for import to finish
      const waitImport = () => {
        exec(`pbicli import show --import ${importId}`, (error, stdout, stderr) => {
          if (error) {
            console.error(error);
            return;
          }
          if (stdout.includes('"datasets": []')) {
            console.log("Import command not ready, waiting...");
            setTimeout(waitImport, 2000); // Check again after 2 seconds
          } else {
            console.log("Import done");

            // Initialize the counter
            let counter = 0;

            // Run the command and capture the output
            exec(`pbicli import show --import ${importId}`, (error, stdout, stderr) => {
              if (error) {
                console.error(error);
                return;
              }
              const lines = stdout.split("\n");
              let datasetId;
              let correctLine;
              lines.forEach((line) => {
                counter++;
                if (line.includes('"datasets": [')) {
                  correctLine = counter + 2;
                }
                if (counter === correctLine) {
                  datasetId = line.split(":")[1].trim().replace(/["]/g, "").replace(/,/g, "");
                }
              });
              console.log("Dataset ID:", datasetId);

              // Update the parameters
              exec(
                `pbicli dataset parameter update --workspace 5ca9a6c2-b2a7-4c0d-9c05-04f29775ca52 --dataset ${datasetId} --parameter @dataSource.json`,
                (error, stdout, stderr) => {
                  if (error) {
                    console.error(error);
                    callback(error);
                    return;
                  }
                  console.log("Successfully publish the dashboard!");
                  callback();
                  return;
                  // process.exit();
                }
              );
            });
          }
        });
      };

      waitImport();
    }
  );
}

module.exports = { publishDashboard };
