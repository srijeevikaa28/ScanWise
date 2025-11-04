
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, PackagePlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';

const formSchema = z.object({
  productName: z.string().min(2, 'Product name must be at least 2 characters.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  expiryDate: z.date({ required_error: 'An expiry date is required.' }),
  manufacture_date: z.date().optional(),
  ingredient: z.string().optional(),
  note: z.string().optional(),
});

type ManualAddProductFormValues = z.infer<typeof formSchema>;

type ManualAddProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => void;
};

export default function ManualAddProductDialog({
  open,
  onOpenChange,
  onProductAdded,
}: ManualAddProductDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const user = auth.currentUser;

  const form = useForm<ManualAddProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      quantity: 1,
      ingredient: '',
      note: '',
    },
  });

  const onSubmit = async (values: ManualAddProductFormValues) => {
    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database. Please try again.',
        });
        return;
    }
    
    setIsAdding(true);

    const productData = {
        productName: values.productName,
        quantity: values.quantity,
        expiryDate: values.expiryDate.toISOString(),
        manufacture_date: values.manufacture_date?.toISOString() || null,
        ingredient: values.ingredient || null,
        note: values.note || null,
        status: 'in use',
        qrId: null, // No QR ID for manual entries
        userId: user.uid,
    };

    try {
        const productsCollection = collection(firestore, 'products');
        await addDocumentNonBlocking(productsCollection, productData);
        onProductAdded();
        form.reset();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product Manually</DialogTitle>
          <DialogDescription>
            Enter the details for the new product to add to your inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Organic Milk" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="ingredient"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Ingredients (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Milk, Vitamin D" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                        Add Product
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
