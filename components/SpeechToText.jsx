import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import axios from "axios";
import AWS from "aws-sdk"; // Import the AWS SDK
import { config } from "dotenv";
config();

const SpeechToText = () => {
  const speechRecognitionSupported = SpeechRecognition.browserSupportsSpeechRecognition();

  const [isSupported, setIsSupported] = useState(null);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [response, setResponse] = useState({
    loading: false,
    message: "",
    error: false,
    success: false,
  });
  const textBodyRef = useRef(null);

  // Configure AWS S3 instance
  const s3 = new AWS.S3({
    accessKeyId: process.env.KEY,
    secretAccessKey: process.env.SECRET,
    region: "us-east-1",
  });

  const startListening = () => {
    setListening(true);
    SpeechRecognition.startListening({ continuous: true });
  };

  const stopListening = () => {
    setListening(false);
    SpeechRecognition.stopListening();
  };

  const resetText = () => {
    stopListening();
    resetTranscript();
    if (textBodyRef.current) {
      textBodyRef.current.innerText = "";
    }
  };

  const handleConversion = async () => {
    if (typeof window !== "undefined") {
      const userText = textBodyRef.current?.innerText;

      if (!userText) {
        alert("Please speak or write some text.");
        return;
      }

      try {
        setResponse({
          loading: true,
          message: "",
          error: false,
          success: false,
        });

        const config = {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        };

        // Create the PDF from the text
        const res = await axios.post(
          "http://localhost:3000", // Adjust to your endpoint
          { text: userText },
          config
        );

        const pdfBlob = new Blob([res.data], { type: "application/pdf" });
        const fileName = `converted-${Date.now()}.pdf`; // Unique filename with timestamp

        // S3 Upload Parameters
        const s3Params = {
          Bucket: "fccec2", // Adjust with your bucket name
          Key: fileName,
          Body: pdfBlob,
          ContentType: "application/pdf",
        };

        // Upload to S3
        await s3.upload(s3Params).promise();

        setResponse({
          loading: false,
          error: false,
          message: "PDF successfully uploaded to S3!",
          success: true,
        });

      } catch (error) {
        console.error("Error during conversion/upload:", error);
        setResponse({
          loading: false,
          error: true,
          message: "An error occurred during conversion or upload.",
          success: false,
        });
      }
    }
  };

  useEffect(() => {
    setIsSupported(speechRecognitionSupported);
  }, [speechRecognitionSupported]);

  if (!isSupported) {
    return <div>Your browser does not support speech recognition.</div>;
  }

  return (
    <>
      <section>
        <div className="button-container">
          <button onClick={startListening} disabled={listening}>
            Start
          </button>
          <button onClick={stopListening} disabled={!listening}>
            Stop
          </button>
        </div>

        <div
          className="words"
          contentEditable
          ref={textBodyRef}
          suppressContentEditableWarning
        >
          {transcript}
        </div>

        <div>
          {response.success && <span className="success">{response.message}</span>}
          {response.error && <span className="error">{response.message}</span>}
        </div>

        <div className="button-container">
          <button onClick={resetText}>
            Reset
          </button>
          <button onClick={handleConversion}>
            {response.loading ? "Converting..." : "Convert to PDF"}
          </button>
        </div>
      </section>
    </>
  );
};

export default SpeechToText;
