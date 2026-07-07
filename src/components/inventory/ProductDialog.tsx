import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, History, ChevronsUpDown, Check, Plus } from "lucide-react";
import { Product, ProductFormData } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

const productTypes = ["Color", "Lightener", "Developer", "Treatment"];

const formSchema = z.object({
  type: z.string().min(1, "Product type is required"),
  brand: z.string().min(1, "Brand is required"),
  line: z.string().optional(),
  shade: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  size: z.coerce.number().min(0.01, "Size must be greater than 0"),
  sizeUnit: z.string().min(1),
  cost: z.coerce.number().min(0, "Cost must be 0 or more"),
  stock: z.coerce.number().min(0, "Stock must be 0 or more"),
  reorderLevel: z.coerce.number().min(0, "Reorder level must be 0 or more"),
  targetStock: z.coerce.number().min(0, "Target stock must be 0 or more"),
  status: z.enum(["active", "inactive"]),
}).refine((data) => {
  if (data.type === "Color") {
    return (data.line && data.line.length > 0) && (data.shade && data.shade.length > 0);
  }
  if (data.type === "Lightener") {
    return data.line && data.line.length > 0;
  }
  return true;
}, {
  message: "Product line is required for this product type",
  path: ["line"],
});


interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded?: (product: ProductFormData) => void;
  onProductUpdated?: (id: string, product: ProductFormData) => void;
  onProductDeleted?: (id: string) => void;
  editingProduct?: Product | null;
  canViewCosts?: boolean;
  readOnly?: boolean;
  onViewHistory?: (product: Product) => void;
  existingBrands?: string[];
  existingLines?: Record<string, string[]>;
}

export function ProductDialog({ 
  open, 
  onOpenChange, 
  onProductAdded,
  onProductUpdated,
  onProductDeleted,
  editingProduct,
  canViewCosts = true,
  readOnly = false,
  onViewHistory,
  existingBrands = [],
  existingLines = {},
}: ProductDialogProps) {
  const { toast } = useToast();
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [lineSearch, setLineSearch] = useState("");
  const isEditing = !!editingProduct;
  const isViewOnly = readOnly && isEditing;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "Color",
      brand: "",
      line: "",
      shade: "",
      name: "",
      size: 60,
      sizeUnit: "ml",
      cost: 0,
      stock: 0,
      reorderLevel: 2,
      targetStock: 10,
      status: "active",
    },
  });

  useEffect(() => {
    if (editingProduct && open) {
      const productType = editingProduct.type || "Color";
      form.reset({
        type: productType,
        brand: editingProduct.brand,
        line: editingProduct.line || "",
        shade: editingProduct.shade || "",
        name: editingProduct.name,
        size: editingProduct.size || 60,
        sizeUnit: editingProduct.sizeUnit || "ml",
        cost: editingProduct.cost || 0,
        stock: editingProduct.stock,
        reorderLevel: editingProduct.reorderLevel,
        targetStock: editingProduct.targetStock || 0,
        status: editingProduct.isActive ? "active" : "inactive",
      });
      setSelectedBrand(editingProduct.brand);
    } else if (!editingProduct && open) {
      form.reset({
        type: "Color",
        brand: "",
        line: "",
        shade: "",
        name: "",
        size: 60,
        sizeUnit: "ml",
        cost: 0,
        stock: 0,
        reorderLevel: 2,
        targetStock: 10,
        status: "active",
      });
      setSelectedBrand("");
    }
  }, [editingProduct, open, form]);


  const productType = form.watch("type");
  const isDeveloper = productType === "Developer";
  const isLightener = productType === "Lightener";
  const isTreatment = productType === "Treatment";
  const needsProductLine = !isDeveloper;
  const needsShadeCode = productType === "Color";
  const useSwitch = isDeveloper || isLightener || isTreatment;
  
  const stockUnit = (isDeveloper || isTreatment) ? "bottles" : 
                    (productType === "Color" || isLightener) ? "tubes" : "units";
  
  const availableLines = selectedBrand ? (existingLines[selectedBrand] || []) : [];

  // Filter brands based on search
  const filteredBrands = existingBrands.filter(b =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const brandSearchTrimmed = brandSearch.trim();
  const showCreateBrand = brandSearchTrimmed.length > 0 && 
    !existingBrands.some(b => b.toLowerCase() === brandSearchTrimmed.toLowerCase());

  // Filter lines based on search
  const filteredLines = availableLines.filter(l =>
    l.toLowerCase().includes(lineSearch.toLowerCase())
  );
  const lineSearchTrimmed = lineSearch.trim();
  const showCreateLine = lineSearchTrimmed.length > 0 && 
    !availableLines.some(l => l.toLowerCase() === lineSearchTrimmed.toLowerCase());

  const onSubmit = (data: ProductFormData) => {
    if (isEditing && editingProduct && onProductUpdated) {
      onProductUpdated(editingProduct.id, data);
      toast({
        title: "Product updated",
        description: isDeveloper 
          ? `${data.name} has been updated.`
          : `${data.shade} - ${data.name} has been updated.`,
      });
    } else if (onProductAdded) {
      onProductAdded(data);
      toast({
        title: "Product added",
        description: isDeveloper 
          ? `${data.name} has been added to inventory.`
          : `${data.shade} - ${data.name} has been added to inventory.`,
      });
    }
    form.reset();
    setSelectedBrand("");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingProduct && onProductDeleted) {
      onProductDeleted(editingProduct.id);
      toast({
        title: "Product deleted",
        description: "The product has been removed from inventory.",
        variant: "destructive",
      });
      form.reset();
      setSelectedBrand("");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedBrand("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isViewOnly ? "Product Details" : isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isViewOnly}>
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Brand *</FormLabel>
                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={brandOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isViewOnly}
                          >
                            {field.value || "Select brand"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search or create brand..."
                            value={brandSearch}
                            onValueChange={setBrandSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No brands found.</CommandEmpty>
                            <CommandGroup>
                              {filteredBrands.map((brand) => (
                                <CommandItem
                                  key={brand}
                                  value={brand}
                                  onSelect={() => {
                                    field.onChange(brand);
                                    setSelectedBrand(brand);
                                    form.setValue("line", "");
                                    setBrandSearch("");
                                    setBrandOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === brand ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {brand}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            {showCreateBrand && (
                              <>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      field.onChange(brandSearchTrimmed);
                                      setSelectedBrand(brandSearchTrimmed);
                                      form.setValue("line", "");
                                      setBrandSearch("");
                                      setBrandOpen(false);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{brandSearchTrimmed}"
                                  </CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsProductLine && (
                <FormField
                  control={form.control}
                  name="line"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product Line {needsShadeCode || isLightener ? "*" : ""}</FormLabel>
                      <Popover open={lineOpen} onOpenChange={setLineOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={lineOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={!selectedBrand || isViewOnly}
                            >
                              {field.value || (selectedBrand ? "Select line" : "Select brand first")}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search or create line..."
                              value={lineSearch}
                              onValueChange={setLineSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No lines found.</CommandEmpty>
                              <CommandGroup>
                                {filteredLines.map((line) => (
                                  <CommandItem
                                    key={line}
                                    value={line}
                                    onSelect={() => {
                                      field.onChange(line);
                                      setLineSearch("");
                                      setLineOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === line ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {line}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {showCreateLine && (
                                <>
                                  <CommandSeparator />
                                  <CommandGroup>
                                    <CommandItem
                                      onSelect={() => {
                                        field.onChange(lineSearchTrimmed);
                                        setLineSearch("");
                                        setLineOpen(false);
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Create "{lineSearchTrimmed}"
                                    </CommandItem>
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isDeveloper && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10 Volume" {...field} disabled={isViewOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {needsShadeCode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09V" {...field} disabled={isViewOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mirage Natural" {...field} disabled={isViewOnly} />
                      </FormControl>
                      <FormDescription>Optional — descriptive name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(isLightener || isTreatment) && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isLightener ? "e.g., Blondme 9+" : "e.g., Original Solution, Perm Lotion"} 
                        {...field}
                        disabled={isViewOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className={`grid grid-cols-1 ${canViewCosts ? 'sm:grid-cols-2' : ''} gap-4`}>
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size ({isDeveloper ? form.watch("sizeUnit") || "ml" : "ml"}) *</FormLabel>
                    <FormControl>
                      {isDeveloper ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            {...field}
                            disabled={isViewOnly}
                            className="flex-1"
                          />
                          <FormField
                            control={form.control}
                            name="sizeUnit"
                            render={({ field: unitField }) => (
                              <Select
                                value={unitField.value}
                                onValueChange={unitField.onChange}
                                disabled={isViewOnly}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="L">L (liter)</SelectItem>
                                  <SelectItem value="oz">oz</SelectItem>
                                  <SelectItem value="gal">gal</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      ) : (
                        <Input type="number" placeholder="60" {...field} disabled={isViewOnly} />
                      )}
                    </FormControl>
                    {isDeveloper && (
                      <FormDescription>
                        1 gal = 3785 ml · 1 L = 1000 ml. Pick the unit you actually buy in.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canViewCosts && (
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>
                      {isDeveloper
                        ? `Container Price ($ per ${form.watch("sizeUnit") || "ml"}) *`
                        : "Tube/Bottle Price ($) *"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="7.57" {...field} disabled={isViewOnly} />
                    </FormControl>
                    <FormDescription>
                      {isDeveloper
                        ? `Total price you paid for one ${form.watch("sizeUnit") === "gal" ? "gallon" : form.watch("sizeUnit") === "L" ? "liter" : form.watch("sizeUnit") || "ml"} container.`
                        : "Full price of one tube/bottle"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  )}

                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock ({stockUnit})</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.25" placeholder="10" {...field} disabled={isViewOnly} />
                    </FormControl>
                    <FormDescription>Total inventory on hand (supports quarter units)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level ({stockUnit})</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} disabled={isViewOnly} />
                    </FormControl>
                    <FormDescription>Alert when below this</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Stock ({stockUnit})</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} disabled={isViewOnly} />
                    </FormControl>
                    <FormDescription>Ideal inventory level</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  {useSwitch ? (
                    <div className="flex items-center space-x-3">
                      <FormControl>
                        <Switch
                          checked={field.value === "active"}
                          onCheckedChange={(checked) => 
                            field.onChange(checked ? "active" : "inactive")
                          }
                          disabled={isViewOnly}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">Product is active</FormLabel>
                    </div>
                  ) : (
                    <>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                          disabled={isViewOnly}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="active" id="active" />
                            <Label htmlFor="active">Active</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="inactive" id="inactive" />
                            <Label htmlFor="inactive">Inactive</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && !isViewOnly && onProductDeleted && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove {editingProduct?.shade || editingProduct?.name} from your inventory. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {isEditing && onViewHistory && editingProduct && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onViewHistory(editingProduct)}
                >
                  <History className="w-4 h-4" />
                  History
                </Button>
              )}
              
              <div className="flex-1" />
              
              {!isViewOnly && (
                <Button type="submit">
                  {isEditing ? "Save Changes" : "Add Product"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
