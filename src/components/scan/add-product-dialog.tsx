
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import type { ScannedData, Product } from '@/lib/types';
import { Loader2, PackagePlus } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useAuth } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';

type AddProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: string | null;
  onProductAdded: () => void;
};

// A type guard to check if a product has the old field names
function hasOldProductFields(p: any): p is { productname: string; expairy_date: string } {
    return typeof p.productname === 'string' && typeof p.expairy_date === 'string';
}

export default function AddProductDialog({ open, onOpenChange, qrData, onProductAdded }: AddProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [parsedData, setParsedData] = useState<ScannedData | null>(null);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    if (qrData) {
      setIsLoading(true);
      setParsedData(null);
      setExistingProduct(null);
      setQuantity(1);

      try {
        const data = JSON.parse(qrData);
        setParsedData(data);
        handleJsonId(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Invalid QR Code',
          description: 'The QR code data is not valid JSON.',
        });
        onOpenChange(false);
      }
      setIsLoading(false);
    }
  }, [qrData, onOpenChange, toast]);


  const handleJsonId = async (data: ScannedData) => {
    if (!firestore || !data.qrId) return;

    const productsCollection = collection(firestore, 'products');
    const q = query(productsCollection, where("qrId", "==", data.qrId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const productData = { id: existingDoc.id, ...existingDoc.data() } as Product;
      setExistingProduct(productData);
    }
  };


  const handleAddProduct = async () => {
    if (!qrData || quantity < 1 || !parsedData || !firestore || !auth.currentUser) return;

    setIsAdding(true);

    if (existingProduct && existingProduct.id) {
        const newQuantity = ((existingProduct.quantity || 0) as number) + quantity;
        const productDocRef = doc(firestore, 'products', existingProduct.id);
        updateDocumentNonBlocking(productDocRef, { quantity: newQuantity, status: 'in use' });
        onProductAdded();
        setIsAdding(false);
        return;
    }
    
    const getSafeDate = (dateString: string | undefined | null) => {
      if (!dateString) return new Date().toISOString();
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return new Date().toISOString();
        return date.toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    
    const productData: Omit<Product, 'id'> = {
        qrId: parsedData.qrId || null,
        productName: parsedData.productName || "Unnamed Product",
        expiryDate: getSafeDate(parsedData.expiryDate),
        ingredient: parsedData.ingredients || null,
        note: parsedData.notes || null,
        manufacture_date: getSafeDate(parsedData.manufacturingDate || parsedData.manufactureDate),
        status: 'in use',
        quantity: quantity,
        userId: auth.currentUser.uid,
    };

    try {
      const productsCollection = collection(firestore, 'products');
      addDocumentNonBlocking(productsCollection, productData);
      onProductAdded();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Product',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
      <div className="grid grid-cols-3 gap-2 text-sm">
        <dt className="text-muted-foreground font-semibold">{label}</dt>
        <dd className="col-span-2">{value}</dd>
      </div>
    ) : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {existingProduct ? "Update Product Quantity" : "Product Scanned"}
          </DialogTitle>
          <DialogDescription>
            {existingProduct 
              ? "This product is already in your inventory. Add more to the existing quantity." 
              : "Review the details and set the quantity to add to your inventory."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking your inventory...</span>
            </div>
          ) : parsedData ? (
            <dl className="space-y-2">
              <InfoRow label="Product Name" value={parsedData.productName} />
              <InfoRow label="Expiry Date" value={parsedData.expiryDate} />
              <InfoRow label="Mfg. Date" value={parsedData.manufacturingDate || parsedData.manufactureDate} />
              <InfoRow label="Ingredients" value={parsedData.ingredients} />
              <InfoRow label="Notes" value={parsedData.notes} />
              {existingProduct && <InfoRow label="Current Qty" value={String(existingProduct.quantity)} />}
            </dl>
          ) : (
            <p>Loading product details...</p>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              {existingProduct ? 'Add Quantity' : 'Quantity'}
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="col-span-3"
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddProduct} disabled={isAdding || isLoading || !parsedData}>
            {isAdding || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            {existingProduct ? 'Update Quantity' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
