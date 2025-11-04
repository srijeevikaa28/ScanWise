
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type QrScannerProps = {
  onScan: (data: string) => void;
};

export default function QrScanner({ onScan }: QrScannerProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const scannerWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    scannerWorkerRef.current = new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' });

    scannerWorkerRef.current.onmessage = (e) => {
      setIsLoading(false);
      const { data } = e;
      if (data) {
        onScan(data);
      } else {
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "Could not detect a QR code in the frame.",
        });
      }
    };
    
    scannerWorkerRef.current.onerror = (e) => {
        setIsLoading(false);
        toast({
            variant: "destructive",
            title: "Scan Worker Error",
            description: "An error occurred in the scanning process."
        })
        console.error("Scanner worker error:", e.message);
    }

    return () => {
      scannerWorkerRef.current?.terminate();
      stopCamera();
    };
  }, [onScan, toast]);

  const stopCamera = () => {
    setIsCameraOn(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera permission denied",
        description: "Please allow camera access in your browser settings to use live scanning.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const captureAndScanFrame = () => {
    if (!videoRef.current || !scannerWorkerRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }
    
    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        setIsLoading(true);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        if (context) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            scannerWorkerRef.current.postMessage({
                data: imageData.data,
                width: imageData.width,
                height: imageData.height
            });
        } else {
            setIsLoading(false);
        }
    } else {
        toast({
            variant: "destructive",
            title: "Video Error",
            description: "Video stream not yet ready. Please try again."
        })
    }
  }

  const handleToggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Camera className="text-primary" />
          Live QR Code Scanner
        </CardTitle>
        <CardDescription>Point your camera at a QR code to scan it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center relative">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {!isCameraOn && !isLoading && (
              <Image
                src="/qrimage.jpg"
                alt="QR Code Scanner Placeholder"
                fill
                sizes="100%"
                className="object-cover"
                priority
              />
          )}
           {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        {hasCameraPermission === false && (
          <Alert variant="destructive">
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Please allow camera access to use this feature.
            </AlertDescription>
          </Alert>
        )}

        <div className="w-full grid grid-cols-2 gap-2">
          <Button onClick={handleToggleCamera} variant="outline" disabled={isLoading}>
            {isCameraOn ? (
              <>
                <CameraOff className="mr-2 h-4 w-4" />
                Turn Off Camera
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Turn On Camera
              </>
            )}
          </Button>
           <Button onClick={captureAndScanFrame} className="w-full" disabled={isLoading || !isCameraOn}>
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Frame
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
