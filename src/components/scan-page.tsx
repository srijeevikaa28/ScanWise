"use client";

import QrScanner from "./scan/qr-scanner";
import QrUploader from "./scan/qr-uploader";

type ScanPageProps = {
  onScan: (data: string) => void;
};

export default function ScanPage({ onScan }: ScanPageProps) {
  return (
    <div className="space-y-6">
       <div>
          <h2 className="text-2xl font-bold tracking-tight">Scan Product</h2>
          <p className="text-muted-foreground">Scan a QR code with your camera or upload an image.</p>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <QrScanner onScan={onScan} />
        <QrUploader onScan={onScan} />
      </div>
    </div>
  );
}
