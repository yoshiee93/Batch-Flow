import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator as CalcIcon, Scale, ArrowRightLeft, Package, Loader2, Truck } from 'lucide-react';
import { useProducts, useRecipes, useRecipeItems, type Product, type Recipe, type RecipeItem } from '@/lib/api';

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-calculator-title">
          <CalcIcon className="inline-block mr-2 h-7 w-7" />
          Calculator
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Calculate yields, materials, and conversions for your production.
        </p>
      </div>

      <Tabs defaultValue="yield" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="yield" data-testid="tab-yield-calc">
            <Scale size={14} className="mr-1" /> Yield
          </TabsTrigger>
          <TabsTrigger value="recipe" data-testid="tab-recipe-calc">
            <Package size={14} className="mr-1" /> Recipe
          </TabsTrigger>
          <TabsTrigger value="convert" data-testid="tab-convert-calc">
            <ArrowRightLeft size={14} className="mr-1" /> Convert
          </TabsTrigger>
          <TabsTrigger value="batch" data-testid="tab-batch-calc">
            <CalcIcon size={14} className="mr-1" /> Batch
          </TabsTrigger>
          <TabsTrigger value="netweight" data-testid="tab-netweight-calc">
            <Truck size={14} className="mr-1" /> Delivery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yield">
          <YieldCalculator />
        </TabsContent>

        <TabsContent value="recipe">
          <RecipeCalculator />
        </TabsContent>

        <TabsContent value="convert">
          <UnitConverter />
        </TabsContent>

        <TabsContent value="batch">
          <BatchCalculator />
        </TabsContent>

        <TabsContent value="netweight">
          <NetWeightCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function YieldCalculator() {
  const [inputWeight, setInputWeight] = useState('');
  const [yieldPercent, setYieldPercent] = useState('85');
  const [wastePercent, setWastePercent] = useState('5');
  const [millingPercent, setMillingPercent] = useState('5');
  const [wetPercent, setWetPercent] = useState('5');
  const [results, setResults] = useState<{
    finished: number;
    waste: number;
    milling: number;
    wet: number;
    total: number;
  } | null>(null);

  const calculate = () => {
    const input = parseFloat(inputWeight) || 0;
    const yieldPct = parseFloat(yieldPercent) || 0;
    const wastePct = parseFloat(wastePercent) || 0;
    const millingPct = parseFloat(millingPercent) || 0;
    const wetPct = parseFloat(wetPercent) || 0;

    const finished = (input * yieldPct) / 100;
    const waste = (input * wastePct) / 100;
    const milling = (input * millingPct) / 100;
    const wet = (input * wetPct) / 100;
    const total = finished + waste + milling + wet;

    setResults({ finished, waste, milling, wet, total });
  };

  const totalPercent = (parseFloat(yieldPercent) || 0) + 
                       (parseFloat(wastePercent) || 0) + 
                       (parseFloat(millingPercent) || 0) + 
                       (parseFloat(wetPercent) || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale size={20} /> Yield Calculator
        </CardTitle>
        <CardDescription>
          Calculate expected output from raw material input weight.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inputWeight">Input Weight (KG)</Label>
              <Input
                id="inputWeight"
                type="number"
                placeholder="Enter raw material weight"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                data-testid="input-yield-weight"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yieldPercent">Finished Product %</Label>
                <Input
                  id="yieldPercent"
                  type="number"
                  value={yieldPercent}
                  onChange={(e) => setYieldPercent(e.target.value)}
                  data-testid="input-yield-percent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wastePercent">Waste %</Label>
                <Input
                  id="wastePercent"
                  type="number"
                  value={wastePercent}
                  onChange={(e) => setWastePercent(e.target.value)}
                  data-testid="input-waste-percent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="millingPercent">Milling %</Label>
                <Input
                  id="millingPercent"
                  type="number"
                  value={millingPercent}
                  onChange={(e) => setMillingPercent(e.target.value)}
                  data-testid="input-milling-percent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wetPercent">Wet (Redry) %</Label>
                <Input
                  id="wetPercent"
                  type="number"
                  value={wetPercent}
                  onChange={(e) => setWetPercent(e.target.value)}
                  data-testid="input-wet-percent"
                />
              </div>
            </div>

            <div className={`text-sm ${totalPercent === 100 ? 'text-green-600' : 'text-amber-600'}`}>
              Total: {totalPercent.toFixed(1)}% {totalPercent !== 100 && '(should equal 100%)'}
            </div>

            <Button onClick={calculate} className="w-full" data-testid="button-calculate-yield">
              Calculate Yield
            </Button>
          </div>

          <div className="space-y-4">
            {results && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">Results</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Finished Product</div>
                    <div className="text-xl font-mono font-bold text-green-700 dark:text-green-400" data-testid="result-finished">
                      {results.finished.toFixed(3)} KG
                    </div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Waste</div>
                    <div className="text-xl font-mono font-bold text-red-700 dark:text-red-400" data-testid="result-waste">
                      {results.waste.toFixed(3)} KG
                    </div>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Milling</div>
                    <div className="text-xl font-mono font-bold text-amber-700 dark:text-amber-400" data-testid="result-milling">
                      {results.milling.toFixed(3)} KG
                    </div>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Wet (Redry)</div>
                    <div className="text-xl font-mono font-bold text-blue-700 dark:text-blue-400" data-testid="result-wet">
                      {results.wet.toFixed(3)} KG
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Accounted</span>
                    <span className="font-mono font-bold" data-testid="result-total">{results.total.toFixed(3)} KG</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Original Input</span>
                    <span className="font-mono">{parseFloat(inputWeight).toFixed(3)} KG</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeCalculator() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const { data: recipeItems = [] } = useRecipeItems(selectedRecipeId);
  const [calculatedMaterials, setCalculatedMaterials] = useState<{ name: string; quantity: number; unit: string }[]>([]);

  const productRecipes = recipes.filter(r => r.productId === selectedProductId);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedRecipeId('');
    setCalculatedMaterials([]);
  };

  const calculate = () => {
    if (!selectedRecipeId || !targetQuantity) return;

    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return;

    const outputQty = parseFloat(recipe.outputQuantity) || 1;
    const target = parseFloat(targetQuantity);
    const multiplier = target / outputQty;

    const materials = recipeItems.map(item => ({
      name: item.materialName || `Material ${item.materialId.substring(0, 8)}`,
      quantity: parseFloat(item.quantity) * multiplier,
      unit: item.materialUnit || 'KG',
    }));

    setCalculatedMaterials(materials);
  };

  if (productsLoading || recipesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package size={20} /> Recipe Calculator
        </CardTitle>
        <CardDescription>
          Calculate materials needed for a target product quantity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Product</Label>
              <Select value={selectedProductId} onValueChange={handleProductChange}>
                <SelectTrigger data-testid="select-recipe-product">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProductId && (
              <div className="space-y-2">
                <Label>Select Recipe</Label>
                <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                  <SelectTrigger data-testid="select-recipe">
                    <SelectValue placeholder={productRecipes.length > 0 ? "Choose a recipe" : "No recipes found"} />
                  </SelectTrigger>
                  <SelectContent>
                    {productRecipes.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} (v{recipe.version}) - Output: {recipe.outputQuantity} KG
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRecipeId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="targetQty">Target Quantity</Label>
                  <Input
                    id="targetQty"
                    type="number"
                    placeholder="How much do you want to produce?"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    data-testid="input-target-quantity"
                  />
                </div>

                <Button onClick={calculate} className="w-full" data-testid="button-calculate-recipe">
                  Calculate Materials
                </Button>
              </>
            )}
          </div>

          <div className="space-y-4">
            {calculatedMaterials.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">Materials Needed</h3>
                <div className="space-y-2">
                  {calculatedMaterials.map((mat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-background rounded border">
                      <span className="font-medium">{mat.name}</span>
                      <span className="font-mono font-bold" data-testid={`result-material-${idx}`}>
                        {mat.quantity.toFixed(3)} {mat.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProductId && productRecipes.length === 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No recipes found for this product. Create a recipe first in the Production section.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UnitConverter() {
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('kg');
  const [toUnit, setToUnit] = useState('g');
  const [result, setResult] = useState<number | null>(null);

  const conversions: Record<string, Record<string, number>> = {
    kg: { kg: 1, g: 1000, lb: 2.20462, oz: 35.274 },
    g: { kg: 0.001, g: 1, lb: 0.00220462, oz: 0.035274 },
    lb: { kg: 0.453592, g: 453.592, lb: 1, oz: 16 },
    oz: { kg: 0.0283495, g: 28.3495, lb: 0.0625, oz: 1 },
    l: { l: 1, ml: 1000, gal: 0.264172 },
    ml: { l: 0.001, ml: 1, gal: 0.000264172 },
    gal: { l: 3.78541, ml: 3785.41, gal: 1 },
  };

  const getAvailableToUnits = (from: string) => {
    return Object.keys(conversions[from] || {});
  };

  const handleFromUnitChange = (unit: string) => {
    setFromUnit(unit);
    const available = getAvailableToUnits(unit);
    if (!available.includes(toUnit)) {
      setToUnit(available[0] || '');
    }
    setResult(null);
  };

  const convert = () => {
    const val = parseFloat(value) || 0;
    const factor = conversions[fromUnit]?.[toUnit];
    if (factor !== undefined) {
      setResult(val * factor);
    }
  };

  const unitLabels: Record<string, string> = {
    kg: 'Kilograms (KG)',
    g: 'Grams (g)',
    lb: 'Pounds (lb)',
    oz: 'Ounces (oz)',
    l: 'Liters (L)',
    ml: 'Milliliters (ml)',
    gal: 'Gallons (gal)',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft size={20} /> Unit Converter
        </CardTitle>
        <CardDescription>
          Convert between different weight and volume units.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="convertValue">Value</Label>
            <Input
              id="convertValue"
              type="number"
              placeholder="Enter value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-testid="input-convert-value"
            />
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromUnit} onValueChange={handleFromUnitChange}>
              <SelectTrigger data-testid="select-from-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(conversions).map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unitLabels[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toUnit} onValueChange={setToUnit}>
              <SelectTrigger data-testid="select-to-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableToUnits(fromUnit).map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unitLabels[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={convert} className="w-full md:w-auto" data-testid="button-convert">
          Convert
        </Button>

        {result !== null && (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <div className="text-sm text-muted-foreground mb-2">Result</div>
            <div className="text-3xl font-mono font-bold" data-testid="result-conversion">
              {result.toFixed(4)} {toUnit.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {parseFloat(value).toFixed(4)} {fromUnit.toUpperCase()} = {result.toFixed(4)} {toUnit.toUpperCase()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BatchCalculator() {
  const { data: products = [] } = useProducts();
  const [entries, setEntries] = useState<{ productId: string; quantity: string }[]>([
    { productId: '', quantity: '' }
  ]);
  const [yieldPercent, setYieldPercent] = useState('85');
  const [results, setResults] = useState<{ productName: string; quantity: number; rawNeeded: number; unit: string }[]>([]);

  const addEntry = () => {
    setEntries([...entries, { productId: '', quantity: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: 'productId' | 'quantity', value: string) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const calculate = () => {
    const yieldFactor = (parseFloat(yieldPercent) || 85) / 100;
    
    const calculated = entries
      .filter(e => e.productId && e.quantity)
      .map(entry => {
        const product = products.find(p => p.id === entry.productId);
        const qty = parseFloat(entry.quantity) || 0;
        return {
          productName: product?.name || 'Unknown',
          quantity: qty,
          rawNeeded: qty / yieldFactor,
          unit: product?.unit || 'KG',
        };
      });

    setResults(calculated);
  };

  const totalRaw = results.reduce((sum, r) => sum + r.rawNeeded, 0);
  const totalOutput = results.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalcIcon size={20} /> Batch Planner
        </CardTitle>
        <CardDescription>
          Calculate total raw materials needed for multiple products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchYield">Expected Yield %</Label>
              <Input
                id="batchYield"
                type="number"
                value={yieldPercent}
                onChange={(e) => setYieldPercent(e.target.value)}
                data-testid="input-batch-yield"
              />
            </div>

            <div className="space-y-3">
              <Label>Products to Produce</Label>
              {entries.map((entry, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select value={entry.productId} onValueChange={(v) => updateEntry(index, 'productId', v)}>
                    <SelectTrigger className="flex-1" data-testid={`select-batch-product-${index}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qty"
                    className="w-24"
                    value={entry.quantity}
                    onChange={(e) => updateEntry(index, 'quantity', e.target.value)}
                    data-testid={`input-batch-quantity-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    disabled={entries.length === 1}
                    data-testid={`button-remove-batch-entry-${index}`}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEntry} data-testid="button-add-batch-entry">
                + Add Product
              </Button>
            </div>

            <Button onClick={calculate} className="w-full" data-testid="button-calculate-batch">
              Calculate Raw Materials
            </Button>
          </div>

          <div className="space-y-4">
            {results.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">Production Plan</h3>
                <div className="space-y-2">
                  {results.map((result, idx) => (
                    <div key={idx} className="p-3 bg-background rounded border">
                      <div className="font-medium">{result.productName}</div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Target Output:</span>
                          <span className="font-mono ml-2" data-testid={`result-batch-output-${idx}`}>
                            {result.quantity.toFixed(2)} {result.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Raw Needed:</span>
                          <span className="font-mono ml-2 font-bold" data-testid={`result-batch-raw-${idx}`}>
                            {result.rawNeeded.toFixed(2)} {result.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Output</span>
                    <span className="font-mono font-bold" data-testid="result-batch-total-output">
                      {totalOutput.toFixed(2)} KG
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Raw Material</span>
                    <span className="font-mono font-bold text-lg" data-testid="result-batch-total-raw">
                      {totalRaw.toFixed(2)} KG
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NetWeightCalculator() {
  const [grossWeight, setGrossWeight] = useState('');
  const [palletWeight, setPalletWeight] = useState('25');
  const [palletCount, setPalletCount] = useState('1');
  const [containerWeight, setContainerWeight] = useState('2');
  const [containerCount, setContainerCount] = useState('0');
  const [results, setResults] = useState<{
    gross: number;
    totalPalletWeight: number;
    totalContainerWeight: number;
    totalTare: number;
    netWeight: number;
  } | null>(null);

  const calculate = () => {
    const gross = parseFloat(grossWeight) || 0;
    const palletWt = parseFloat(palletWeight) || 0;
    const pallets = parseInt(palletCount) || 0;
    const containerWt = parseFloat(containerWeight) || 0;
    const containers = parseInt(containerCount) || 0;

    const totalPalletWeight = palletWt * pallets;
    const totalContainerWeight = containerWt * containers;
    const totalTare = totalPalletWeight + totalContainerWeight;
    const netWeight = gross - totalTare;

    setResults({
      gross,
      totalPalletWeight,
      totalContainerWeight,
      totalTare,
      netWeight: Math.max(0, netWeight),
    });
  };

  const reset = () => {
    setGrossWeight('');
    setPalletWeight('25');
    setPalletCount('1');
    setContainerWeight('2');
    setContainerCount('0');
    setResults(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck size={20} /> Delivery Net Weight
        </CardTitle>
        <CardDescription>
          Calculate actual product weight by subtracting pallets and containers from delivery weight.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grossWeight">Total Delivery Weight (KG)</Label>
              <Input
                id="grossWeight"
                type="number"
                placeholder="Enter the weight shown on scale"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                data-testid="input-gross-weight"
              />
              <p className="text-xs text-muted-foreground">
                The full weight of the delivery as weighed
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm">Pallets</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="palletWeight">Weight Each (KG)</Label>
                  <Input
                    id="palletWeight"
                    type="number"
                    value={palletWeight}
                    onChange={(e) => setPalletWeight(e.target.value)}
                    data-testid="input-pallet-weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="palletCount">Number of Pallets</Label>
                  <Input
                    id="palletCount"
                    type="number"
                    min="0"
                    value={palletCount}
                    onChange={(e) => setPalletCount(e.target.value)}
                    data-testid="input-pallet-count"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm">Containers / Bins / Boxes</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="containerWeight">Weight Each (KG)</Label>
                  <Input
                    id="containerWeight"
                    type="number"
                    value={containerWeight}
                    onChange={(e) => setContainerWeight(e.target.value)}
                    data-testid="input-container-weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="containerCount">Number of Containers</Label>
                  <Input
                    id="containerCount"
                    type="number"
                    min="0"
                    value={containerCount}
                    onChange={(e) => setContainerCount(e.target.value)}
                    data-testid="input-container-count"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1" data-testid="button-calculate-netweight">
                Calculate Net Weight
              </Button>
              <Button variant="outline" onClick={reset} data-testid="button-reset-netweight">
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {results && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Weight Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-background rounded">
                    <span className="text-muted-foreground">Delivery Weight (Gross)</span>
                    <span className="font-mono" data-testid="result-gross-weight">
                      {results.gross.toFixed(2)} KG
                    </span>
                  </div>
                  
                  <div className="border-t pt-2 space-y-2">
                    <div className="flex justify-between items-center p-2">
                      <span className="text-muted-foreground">Pallets ({palletCount} × {palletWeight} KG)</span>
                      <span className="font-mono text-red-600" data-testid="result-pallet-weight">
                        − {results.totalPalletWeight.toFixed(2)} KG
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <span className="text-muted-foreground">Containers ({containerCount} × {containerWeight} KG)</span>
                      <span className="font-mono text-red-600" data-testid="result-container-weight">
                        − {results.totalContainerWeight.toFixed(2)} KG
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center p-2">
                      <span className="text-muted-foreground">Total Tare Weight</span>
                      <span className="font-mono text-red-600" data-testid="result-tare-weight">
                        − {results.totalTare.toFixed(2)} KG
                      </span>
                    </div>
                  </div>

                  <div className="border-t-2 pt-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <span className="font-semibold">Net Product Weight</span>
                      <span className="font-mono font-bold text-xl text-green-600" data-testid="result-net-weight">
                        {results.netWeight.toFixed(2)} KG
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      This is the actual weight of the product you received
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!results && (
              <div className="bg-muted/30 rounded-lg p-6 text-center text-muted-foreground">
                <Truck className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">
                  Enter the delivery weight and pallet/container details to calculate the actual product weight.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
