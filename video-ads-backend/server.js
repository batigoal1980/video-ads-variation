const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { exec } = require('child_process');
const axios = require('axios');
const fetch = require('node-fetch');
const mime = require('mime-types');

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage });

// Ensure necessary directories exist
['uploads', 'processed', 'transcriptions', 'new_audio'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`Created directory: ${dir}`);
  }
});

app.use(cors());
app.use(express.json());

// ElevenLabs API key (replace with your actual key)
ELEVENLABS_API_KEY = "sk_5967397e69fac16f0f0ffe3a1ea9c506f27f962ccceb30af"
VOICE_ID = "cgSgspJ2msm6clMCkdW9"

function logFileDetails(filePath) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`File ${filePath} exists. Size: ${stats.size} bytes`);
  } else {
    console.log(`File ${filePath} does not exist.`);
  }
}

app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    console.log('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  
  const videoPath = req.file.path;
  const originalFilename = req.file.originalname;
  const videoName = path.parse(originalFilename).name;
  console.log(`Video uploaded: ${originalFilename}`);
  logFileDetails(videoPath);
  
  // Start processing in the background
  processVideo(videoPath, videoName);

  res.json({
    message: 'Video uploaded and processing started',
    videoName: videoName,
    originalFilename: originalFilename
  });
});

app.post('/upload-url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send('No URL provided');
  }

  try {
    console.log(`Attempting to fetch video from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video from URL: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type of the response: ${contentType}`);

    const originalFilename = path.basename(new URL(url).pathname);
    const fileExtension = path.extname(originalFilename);
    const mimeType = mime.lookup(fileExtension);

    console.log(`File extension: ${fileExtension}, Mime type: ${mimeType}`);

    if (!mimeType || !mimeType.startsWith('video/')) {
      console.warn(`Warning: The file might not be a video. Mime type: ${mimeType}`);
      // Proceed anyway, but log a warning
    }

    const videoName = path.parse(originalFilename).name;
    const videoPath = path.join('uploads', originalFilename);

    console.log(`Saving video to: ${videoPath}`);
    const fileStream = fs.createWriteStream(videoPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    console.log(`Video downloaded from URL: ${originalFilename}`);
    logFileDetails(videoPath);

    // Start processing in the background
    processVideo(videoPath, videoName);

    res.json({
      message: 'Video uploaded from URL and processing started',
      videoName: videoName,
      originalFilename: originalFilename
    });
  } catch (error) {
    console.error('Error processing video from URL:', error);
    res.status(500).send(`Error processing video from URL: ${error.message}`);
  }
});

function processVideo(videoPath, videoName) {
  // Generate thumbnail
  ffmpeg(videoPath)
    .screenshots({
      count: 1,
      folder: 'processed',
      filename: `${videoName}_thumbnail.png`,
      size: '320x180'
    });

  // Extract audio
  const audioPath = `processed/${videoName}.mp3`;
  ffmpeg(videoPath)
    .output(audioPath)
    .audioCodec('libmp3lame')
    .on('end', () => {
      console.log(`Audio extraction complete: ${audioPath}`);
      transcribeAudio(audioPath, videoName);
    })
    .run();
}

// Enhanced function to transcribe audio using Whisper
function transcribeAudio(audioPath, videoName) {
  console.log(`Starting transcription for ${videoName}`);
  const outputPath = path.join('transcriptions', `${videoName}.txt`);
  const command = `whisper "${audioPath}" --model base --output_dir transcriptions --output_format txt`;
  
  console.log(`Executing command: ${command}`);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Transcription error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Transcription stderr: ${stderr}`);
    }
    console.log(`Transcription stdout: ${stdout}`);
    console.log(`Transcription complete for ${videoName}`);
    logFileDetails(outputPath);
    
    // Read the transcription and start text-to-speech
    fs.readFile(outputPath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading transcription: ${err.message}`);
        return;
      }
      console.log(`Transcription content: ${data}`);
      textToSpeech(data, videoName);
    });
  });
}

// Enhanced function for text-to-speech using ElevenLabs
async function textToSpeech(text, videoName) {
  console.log(`Starting text-to-speech for ${videoName}`);
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      { text },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    const outputPath = path.join('new_audio', `${videoName}_tts.mp3`);
    fs.writeFileSync(outputPath, response.data);
    console.log(`Text-to-speech complete for ${videoName}: ${outputPath}`);
    logFileDetails(outputPath);

    // After text-to-speech, merge new audio with original video
    mergeAudioWithVideo(videoName);
  } catch (error) {
    console.error('Error in text-to-speech:', error.response ? error.response.data : error.message);
  }
}

// Enhanced function to merge new audio with original video
function mergeAudioWithVideo(videoName) {
  console.log(`Starting audio-video merge for ${videoName}`);
  const originalVideoPath = path.join('uploads', `${videoName}.mp4`);
  const newAudioPath = path.join('new_audio', `${videoName}_tts.mp3`);
  const outputPath = path.join('processed', `${videoName}_new_audio.mp4`);
  const tempVideoPath = path.join('processed', `${videoName}_temp_video.mp4`);

  logFileDetails(originalVideoPath);
  logFileDetails(newAudioPath);

  // First, extract video without audio
  ffmpeg(originalVideoPath)
    .outputOptions(['-c:v copy', '-an'])
    .save(tempVideoPath)
    .on('start', (command) => {
      console.log(`FFmpeg extraction process started: ${command}`);
    })
    .on('end', () => {
      console.log(`Video extracted without audio: ${tempVideoPath}`);
      logFileDetails(tempVideoPath);
      
      // Then, merge the extracted video with new audio
      ffmpeg(tempVideoPath)
        .input(newAudioPath)
        .outputOptions(['-c:v copy', '-c:a aac', '-strict experimental'])
        .save(outputPath)
        .on('start', (command) => {
          console.log(`FFmpeg merge process started: ${command}`);
        })
        .on('progress', (progress) => {
          console.log(`Merging: ${progress.percent}% done`);
        })
        .on('error', (err) => {
          console.error('An error occurred during merging:', err.message);
        })
        .on('end', () => {
          console.log(`Merging complete for ${videoName}: ${outputPath}`);
          logFileDetails(outputPath);
          // Clean up temporary file
          fs.unlink(tempVideoPath, (err) => {
            if (err) console.error(`Error deleting temp file: ${err}`);
            else console.log(`Temporary file deleted: ${tempVideoPath}`);
          });
        });
    })
    .on('error', (err) => {
      console.error('An error occurred during video extraction:', err.message);
    });
}

// Enhanced endpoint to get processing status
app.get('/status/:videoName', (req, res) => {
  const videoName = req.params.videoName;
  console.log(`Checking status for ${videoName}`);
  const thumbnailPath = path.join('processed', `${videoName}_thumbnail.png`);
  const audioPath = path.join('processed', `${videoName}.mp3`);
  const newAudioPath = path.join('new_audio', `${videoName}_tts.mp3`);
  const processedVideoPath = path.join('processed', `${videoName}_new_audio.mp4`);
  
  const thumbnailReady = fs.existsSync(thumbnailPath);
  const audioExtracted = fs.existsSync(audioPath);
  const newAudioReady = fs.existsSync(newAudioPath);
  const videoProcessed = fs.existsSync(processedVideoPath);
  
  if (thumbnailReady && audioExtracted && newAudioReady && videoProcessed) {
    console.log(`Processing complete for ${videoName}`);
    res.json({ status: 'complete' });
  } else {
    console.log(`Thumbnail path: ${thumbnailPath}, exists: ${thumbnailReady}`);
    console.log(`Extracted audio path: ${audioPath}, exists: ${audioExtracted}`);
    console.log(`New audio path: ${newAudioPath}, exists: ${newAudioReady}`);
    console.log(`Processed video path: ${processedVideoPath}, exists: ${videoProcessed}`);
    
    res.json({ status: 'processing', thumbnailReady, audioExtracted, newAudioReady, videoProcessed });
  }
});

// Serve processed files
app.use('/processed', express.static('processed'));
app.use('/transcriptions', express.static('transcriptions'));
app.use('/new_audio', express.static('new_audio'));

app.get('/uploads/:videoName', (req, res) => {
  const videoPath = path.join(__dirname, 'uploads', req.params.videoName);
  streamVideo(req, res, videoPath);
});

app.get('/processed/:videoName', (req, res) => {
  const videoPath = path.join(__dirname, 'processed', req.params.videoName);
  streamVideo(req, res, videoPath);
});

function streamVideo(req, res, videoPath) {
  fs.access(videoPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Error accessing file: ${videoPath}`, err);
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
      const chunksize = (end-start)+1;
      const file = fs.createReadStream(videoPath, {start, end});
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../video-ads-uploader/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../video-ads-uploader/build/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});