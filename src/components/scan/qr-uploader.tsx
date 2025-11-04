
"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileImage, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type QrUploaderProps = {
  onScan: (data: string) => void;
};

export default function QrUploader({ onScan }: QrUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const scannerWorkerRef = useRef<Worker | null>(null);


  useEffect(() => {
    scannerWorkerRef.current = new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' });

    scannerWorkerRef.current.onmessage = (e) => {
      const { data } = e;
      setIsLoading(false);
      if (data) {
        onScan(data);
      } else {
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "No QR code found in the image.",
        });
      }
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    
    scannerWorkerRef.current.onerror = (e) => {
      setIsLoading(false);
      toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "Could not process the image file.",
        });
      console.error("Scanner worker error:", e.message);
    }

    return () => {
      scannerWorkerRef.current?.terminate();
    };
  }, [onScan, toast]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please choose an image file to upload.",
      });
      return;
    }

    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, img.width, img.height);
                scannerWorkerRef.current?.postMessage({
                  data: imageData.data,
                  width: imageData.width,
                  height: imageData.height
                });
            }
        }
        img.src = e.target?.result as string;
    }
    reader.readAsDataURL(selectedFile);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Upload className="text-primary" />
          Scan from Image
        </CardTitle>
        <CardDescription>Upload an image file containing a QR code.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-full">
          <Input
            id="qrfile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="cursor-pointer file:text-primary file:font-semibold"
          />
          {selectedFile && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              <span>{selectedFile.name}</span>
            </p>
          )}
        </div>
        <Button onClick={handleUpload} className="w-full" disabled={!selectedFile || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Scan Image
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
