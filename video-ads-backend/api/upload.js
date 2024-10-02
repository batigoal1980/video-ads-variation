import multer from 'multer';
import nextConnect from 'next-connect';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import cors from 'cors';

const upload = multer({ dest: 'uploads/' });
const handler = nextConnect();

handler.use(cors());
handler.use(upload.single('video'));

handler.post(async (req, res) => {
  // Ensure necessary directories exist
  ['uploads', 'processed', 'transcriptions', 'new_audio'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      console.log(`Created directory: ${dir}`);
    }
  });

  // Handle file upload
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Process the video file (example logic)
  const outputPath = `processed/${file.filename}.mp4`;
  ffmpeg(file.path)
    .output(outputPath)
    .on('end', () => {
      res.status(200).json({ message: 'File processed successfully', outputPath });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'Error processing file', details: err.message });
    })
    .run();
});

export default handler;
