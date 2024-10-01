import React, { useState, useCallback } from 'react';
import './VideoAdsUploader.css'; // We'll create this file for custom styles

const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

const VideoAdsUploader = () => {
  const [ads, setAds] = useState([]);
  const [url, setUrl] = useState('');

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    await processFiles(files);
  };

  const handleUrlSubmit = async (event) => {
    event.preventDefault();
    if (url) {
      await processUrl(url);
      setUrl('');
    }
  };

  const processFiles = async (files) => {
    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        alert(`${file.name} is not a video file.`);
        continue;
      }
      await uploadVideo(file);
    }
  };

  const processUrl = async (videoUrl) => {
    try {
      const response = await fetch(`${API_URL}/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();
      setAds(prevAds => [...prevAds, { 
        ...result, 
        file: { name: result.originalFilename },
        originalVideoReady: true,
        processedVideoReady: false
      }]);
      
      alert(`Video from URL has been uploaded and is being processed.`);
    } catch (error) {
      console.error('Error uploading video from URL:', error);
      alert(`Failed to upload video from URL. Error: ${error.message}`);
    }
  };

  const uploadVideo = async (file) => {
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setAds(prevAds => [...prevAds, { 
        ...result, 
        file, 
        originalVideoReady: true,
        processedVideoReady: false
      }]);
      
      alert(`${file.name} has been uploaded and is being processed.`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload ${file.name}. Please try again.`);
    }
  };

  const checkProcessedVideo = useCallback(async (ad) => {
    try {
      const response = await fetch(`${API_URL}/processed/${encodeURIComponent(ad.videoName)}_new_audio.mp4`, { method: 'HEAD' });
      if (response.ok) {
        setAds(prevAds => prevAds.map(prevAd => 
          prevAd.videoName === ad.videoName ? { ...prevAd, processedVideoReady: true } : prevAd
        ));
      }
    } catch (error) {
      console.error('Error checking processed video:', error);
    }
  }, []);

  return (
    <div className="container">
      <h1 className="title">Video Ads Uploader</h1>
      <div className="upload-section">
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileUpload}
          className="file-input"
        />
        <form onSubmit={handleUrlSubmit} className="url-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter video URL"
            className="url-input"
          />
          <button type="submit" className="url-submit">Upload from URL (need have direct mp4 access address)</button>
        </form>
      </div>
      {ads.length > 0 && (
        <div>
          <h2 className="subtitle">Uploaded Ads</h2>
          <div className="card-grid">
            {ads.map((ad, index) => (
              <ThumbnailCard 
                key={index} 
                ad={ad} 
                checkProcessedVideo={checkProcessedVideo}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ThumbnailCard = React.memo(({ ad, checkProcessedVideo }) => {
  React.useEffect(() => {
    if (!ad.processedVideoReady) {
      const intervalId = setInterval(() => checkProcessedVideo(ad), 5000);
      return () => clearInterval(intervalId);
    }
  }, [ad, checkProcessedVideo]);

  return (
    <div className="card">
      <h3 className="card-title">{ad.file.name}</h3>
      <div className="video-container">
        {ad.originalVideoReady && (
          <div className="video-wrapper">
            <h4 className="video-title">Original Video</h4>
            <video 
              controls
              preload="metadata"
              className="video"
            >
              <source src={`${API_URL}/uploads/${encodeURIComponent(ad.originalFilename)}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        {ad.processedVideoReady ? (
          <div className="video-wrapper">
            <h4 className="video-title">Video with New Audio</h4>
            <video 
              controls
              preload="metadata"
              className="video"
            >
              <source src={`${API_URL}/processed/${encodeURIComponent(ad.videoName)}_new_audio.mp4`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <p className="processing-message">Processing new audio... Please wait.</p>
        )}
      </div>
    </div>
  );
});

export default VideoAdsUploader;