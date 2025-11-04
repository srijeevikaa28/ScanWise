'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScanPage from '@/components/scan-page';
import AddProductDialog from '@/components/scan/add-product-dialog';
import { useToast } from '@/hooks/use-toast';

export default function ScanDashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannedQrData, setScannedQrData] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleScan = (data: string) => {
    if (data) {
      setScannedQrData(data);
      setDialogOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: 'Could not detect a valid QR code.',
      });
    }
  };

  const handleProductAdded = () => {
    setDialogOpen(false);
    toast({
      title: 'Success',
      description: 'Product has been added to your inventory.',
    });
    // Navigate to inventory to see the new product
    router.push('/dashboard');
  };

  return (
    <>
      <ScanPage onScan={handleScan} />
      <AddProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        qrData={scannedQrData}
        onProductAdded={handleProductAdded}
      />
    </>
  );
}
