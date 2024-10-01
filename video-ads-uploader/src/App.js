import React from 'react';
import VideoAdsUploader from './VideoAdsUploader';
import { ToastWrapper } from "./components/ui/use-toast";
import './globals.css';

function App() {
  return (
    <ToastWrapper>
      <div className="App">
        <VideoAdsUploader />
      </div>
    </ToastWrapper>
  );
}

export default App;
