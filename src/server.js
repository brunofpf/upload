const express = require("express");
const fileUpload = require("express-fileupload");
const { publishDashboard } = require("./modules/Publish");
const jwt = require("jsonwebtoken");
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 4848;
const secretKey =  process.env.SECRET_KEY; // Change this to your secret key
const allowedUser = process.env.ALLOWED_USER; // Specify the allowed user

// Middleware for handling file uploads
app.use(fileUpload());
app.use(cors());

// Authorization middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token.split(" ")[1], secretKey, (err, decoded) => {
    if (err) {
      console.error("Error verifying token:", err);
      return res.status(403).send("Invalid token.");
    }

    // Check if the decoded username corresponds to the allowed user
    if (decoded.username !== allowedUser) {
      console.log("Unauthorized user:", decoded.username);
      return res.sendStatus(403); // Forbidden
    }

    req.user = decoded;
    next();
  });
};

// Endpoint to upload a file
app.post("/upload", authenticateToken, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const uploadedFile = req.files.uploadedFile;

  // Move the uploaded file to a secure location
  uploadedFile.mv(`uploads/${uploadedFile.name}`, (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    res.send("File uploaded successfully.");
  });
});

// Endpoint to run a script using the uploaded file
app.get("/run-script", authenticateToken, (req, res) => {
  const dirPath = "./uploads"; // Assuming the uploaded file is stored in this directory
  const fileName = req.query.fileName;

  // Call the publish function from the imported module
  publishDashboard(dirPath, fileName,  (error) => {
    // Callback function called when the operation is completed
    if (error) {
      // If an error occurs during publishing, send an error response
      res.status(500).send("Error publishing the dashboard: " + error);
    } else {
      // If publishing is successful, send a success response
      res.send("Successfully publish the dashboard!");
    }
  });
});

// Generate token endpoint with username parameter
app.get("/generate-token", (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).send("Username is required");
  }

  // Check if the requested username matches the allowed user
  if (username !== allowedUser) {
    return res.status(403).send("Unauthorized user");
  }

  // Encode additional information along with the username
  const token = jwt.sign({ username: username, role: "user" }, secretKey);
  res.json({ token });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
