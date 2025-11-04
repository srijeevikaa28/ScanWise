
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, differenceInDays, startOfToday } from 'date-fns';
import { Save, Loader2, Sparkles, AlertTriangle, PackageCheck, ChevronsRight, BellRing, Search, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { generateInventoryInsights } from '@/ai/flows/generate-inventory-insights';
import { Badge } from '@/components/ui/badge';
import ManualAddProductDialog from '@/components/inventory/manual-add-product-dialog';
import { cn } from '@/lib/utils';
import { ProductSchema } from '@/lib/types';

type ProductUpdate = Partial<Product> & { id: string };

type Insight = {
  title: string;
  items: string[];
  variant: 'destructive' | 'warning' | 'default';
  icon: React.ReactNode;
} | {
  title: string;
  summary: string;
  variant: 'default';
  icon: React.ReactNode;
};

// A type guard to check if a product has the old field names
function hasOldProductFields(p: any): p is { productname: string; expairy_date: string } {
    return typeof p.productname === 'string' && typeof p.expairy_date === 'string';
}

const normalizeProduct = (p: any): Product => {
  const result = ProductSchema.safeParse({
    ...p,
    productName: p.productName || p.productname,
    expiryDate: p.expiryDate || p.expairy_date,
  });

  if (result.success) {
    return result.data;
  }
  
  // Fallback for unexpected structures, though safeParse should handle it
  return {
    id: p.id,
    productName: p.productName || p.productname || "Unnamed Product",
    expiryDate: p.expiryDate || p.expairy_date || new Date().toISOString(),
    quantity: p.quantity || 0,
    status: p.status || 'in use',
    qrId: p.qrId || null,
    ingredient: p.ingredient || null,
    note: p.note || null,
    manufacture_date: p.manufacture_date || null,
    userId: p.userId,
  };
};


const parseInsights = (markdown: string): Insight[] => {
  if (!markdown) return [];

  const sections = markdown.split('###').map(s => s.trim()).filter(Boolean);
  const insights: Insight[] = [];

  sections.forEach(section => {
    const [title, ...contentLines] = section.split('\n').map(l => l.trim()).filter(Boolean);
    const content = contentLines.join('\n');
    
    if (title.includes('Expiring Soon')) {
      insights.push({
        title,
        items: contentLines.map(l => l.replace(/^-/, '').trim()),
        variant: 'destructive',
        icon: <AlertTriangle className="h-6 w-6" />
      });
    } else if (title.includes('Low Stock')) {
      insights.push({
        title,
        items: contentLines.map(l => l.replace(/^-/, '').trim()),
        variant: 'warning',
        icon: <PackageCheck className="h-6 w-6" />
      });
    } else if (title.includes('Overall Summary') || title.includes('No Products')) {
       insights.push({
        title,
        summary: content,
        variant: 'default',
        icon: <ChevronsRight className="h-6 w-6" />
      });
    }
  });

  return insights;
};

export default function InventoryPage({ refreshKey }: { refreshKey: number }) {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: serverProducts, isLoading: isLoadingProducts, error } = useCollection<any>(productsQuery);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [updates, setUpdates] = useState<Record<string, ProductUpdate>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingInsights, setIsGettingInsights] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [isExpiryAlertOpen, setIsExpiryAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    if (serverProducts) {
      // Normalize data to handle inconsistencies (productname vs productName, etc.)
      const normalizedProducts: Product[] = serverProducts.map(normalizeProduct);

      const today = startOfToday();
      const productsToUpdate: Product[] = [];
      const batch = firestore ? writeBatch(firestore) : null;

      const updatedProducts = normalizedProducts.map(p => {
        try {
          if (p.expiryDate && p.status === 'in use') {
            const expiryDate = parseISO(p.expiryDate);
            if (isBefore(expiryDate, today)) {
              productsToUpdate.push(p);
              return { ...p, status: 'expired' };
            }
          }
        } catch {}
        return p;
      });

      if (productsToUpdate.length > 0 && batch && firestore) {
        productsToUpdate.forEach(p => {
            if (p.id) {
                const docRef = doc(firestore, 'products', p.id);
                batch.update(docRef, { status: 'expired' });
            }
        });
        batch.commit().then(() => {
          toast({
            title: 'Inventory Updated',
            description: `${productsToUpdate.length} product(s) were automatically marked as expired.`,
          });
        }).catch(err => {
            console.error("Failed to auto-update expired status:", err);
        });
      }

      setProducts(updatedProducts);
      
      const soonExpiring = updatedProducts.filter(p => {
        if (!p.expiryDate || p.status === 'used' || p.status === 'expired') {
          return false;
        }
        try {
          const expiryDate = parseISO(p.expiryDate);
          const daysUntilExpiry = differenceInDays(expiryDate, today);
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 2;
        } catch {
          return false;
        }
      });
      
      if (soonExpiring.length > 0) {
        setExpiringProducts(soonExpiring);
        setIsExpiryAlertOpen(true);
      }
    }
  }, [serverProducts, firestore, toast]);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching products',
        description: error.message,
      });
    }
  }, [error, toast]);

  const handleGetInsights = async () => {
    setIsGettingInsights(true);
    try {
      const result = await generateInventoryInsights({ products });
      const parsed = parseInsights(result.insights);
      setInsights(parsed);
      setIsInsightsOpen(true);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "AI Insights Failed",
        description: e.message || "Could not generate inventory insights."
      });
    } finally {
      setIsGettingInsights(false);
    }
  }

  const handleStatusChange = (productId: string, newStatus: string) => {
    setProducts(prev => 
      prev.map(p => (p.id === productId ? { ...p, status: newStatus } : p))
    );

    setUpdates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        id: productId,
        status: newStatus,
      },
    }));
  };

  const handleSaveChanges = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    Object.values(updates).forEach(update => {
      if (update.id) {
        const docRef = doc(firestore, 'products', update.id);
        const { id, ...updateData } = update;
        batch.update(docRef, updateData);
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Success',
        description: 'Product statuses have been updated.',
      });
      setUpdates({});
    } catch (e: any) {
       toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const hasUpdates = Object.keys(updates).length > 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  const getExpiryBadge = (product: Product): React.ReactNode => {
    const dateToParse = product.expiryDate;
    if (!dateToParse || product.status === 'used') return null;
    
    try {
        const expiryDate = parseISO(dateToParse);
        const today = startOfToday();
        const daysUntilExpiry = differenceInDays(expiryDate, today);

        if (daysUntilExpiry < 0) {
            return <Badge variant="destructive">Expired</Badge>;
        }

        let badgeColor = "bg-green-500 hover:bg-green-600";
        if (daysUntilExpiry <= 7) {
            badgeColor = "bg-red-500 hover:bg-red-600";
        } else if (daysUntilExpiry <= 30) {
            badgeColor = "bg-yellow-500 text-black hover:bg-yellow-600";
        }
        
        return (
            <Badge
            variant="default"
            className={cn("text-white", badgeColor)}
            >
            {`Expires in ${daysUntilExpiry}d`}
            </Badge>
        );
    } catch {
        return null;
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search term filter
        const productName = product.productName || '';
        const matchesSearch = searchTerm.trim() === '' || 
          productName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        try {
          const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          return dateA - dateB; // Sort ascending by expiry date
        } catch {
          return 0;
        }
      });
  }, [products, searchTerm, statusFilter]);

  const isLoading = isLoadingProducts;

  return (
    <>
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Inventory</h2>
          <p className="text-muted-foreground">View, manage, and analyze your products.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasUpdates && (
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          )}
          <Button 
            onClick={handleGetInsights} 
            disabled={isGettingInsights || isLoading || products.length === 0}
            variant="outline"
          >
            {isGettingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
            Get Insights
          </Button>
           <Button onClick={() => setIsManualAddOpen(true)}>
            <PlusCircle />
            Add Product
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in use">In Use</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Ingredients</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {products.length > 0 ? 'No products match your search.' : 'No products found. Start by scanning an item.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.productName || 'N/A'}</TableCell>
                  <TableCell className="text-center">{product.quantity}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{formatDate(product.expiryDate)}</span>
                      {getExpiryBadge(product)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={product.status}
                      onValueChange={(newStatus) => handleStatusChange(product.id!, newStatus)}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in use">In Use</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">{product.ingredient || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
        <AlertDialogContent className="max-w-2xl bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Inventory Insights
            </AlertDialogTitle>
            <AlertDialogDescription>
              Here is an AI-powered analysis of your current inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {insights.length > 0 ? insights.map((insight, index) => (
              <Card key={index} className={insight.variant === 'destructive' ? 'border-destructive' : insight.variant === 'warning' ? 'border-yellow-500' : ''}>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className={`p-2 rounded-full ${
                    insight.variant === 'destructive' ? 'bg-destructive/20 text-destructive' :
                    insight.variant === 'warning' ? 'bg-yellow-500/20 text-yellow-600' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {insight.icon}
                  </div>
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {'items' in insight ? (
                    insight.items.length > 0 && insight.items[0] !== "" && !insight.items[0].toLowerCase().includes("no items") ? (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {insight.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">{ insight.items[0] || 'None to report.'}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{insight.summary}</p>
                  )}
                </CardContent>
              </Card>
            )) : <p className="text-muted-foreground text-center">No insights were generated.</p>}
          </div>
          <AlertDialogFooter>
            <Button onClick={() => setIsInsightsOpen(false)}>Close</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isExpiryAlertOpen} onOpenChange={setIsExpiryAlertOpen}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-500">
              <BellRing className="h-6 w-6" />
              Expiry Warning!
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following products in your inventory are expiring in the next 2 days.
              Please check them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto my-4 pr-4">
            <ul className="space-y-2">
              {expiringProducts.map(product => (
                <li key={product.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted">
                  <span className="font-medium">{product.productName}</span>
                  <span className="text-destructive font-semibold">
                    Expires: {formatDate(product.expiryDate)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsExpiryAlertOpen(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <ManualAddProductDialog
        open={isManualAddOpen}
        onOpenChange={setIsManualAddOpen}
        onProductAdded={() => {
            setIsManualAddOpen(false);
            toast({
                title: 'Success',
                description: 'Product has been added to your inventory.',
            });
        }}
    />
    </>
  );

    



    

