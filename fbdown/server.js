const express = require("express");
const { exec } = require("child_process"); // Used to call yt-dlp from Node.js
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Directory to save downloaded Facebook videos
const DOWNLOAD_FOLDER = "facebook_videos";
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER);
}

// Serve the index.html file
app.use(express.static(path.join(__dirname, "public")));

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set up socket.io for real-time communication
const io = socketIo(server);

// Handle client connection
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle the download request
  socket.on("download_facebook_video", (fbUrl) => {
    console.log(`Downloading video from: ${fbUrl}`);
    const outputFilename = path.join(DOWNLOAD_FOLDER, "facebook_video.mp4");

    // Spawn a process to run yt-dlp for downloading the video
    const downloadProcess = exec(
      `yt-dlp -f best -o ${outputFilename} ${fbUrl}`
    );

    // Capture yt-dlp progress output
    downloadProcess.stdout.on("data", (data) => {
      const match = data.match(/\[download\]\s+(\d+\.\d+)%/);
      if (match) {
        const progress = parseFloat(match[1]);
        console.log(`Download progress: ${progress}%`);

        // Send progress to the client
        socket.emit("progress", { progress });
      }
    });

    // Handle process completion
    downloadProcess.on("close", (code) => {
      console.log("Download finished.");
      socket.emit("progress", { progress: 100 });
    });

    // Handle any errors
    downloadProcess.on("error", (error) => {
      console.error(`Error: ${error.message}`);
      socket.emit("progress", { error: error.message });
    });
  });
});
