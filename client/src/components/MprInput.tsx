import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface MprData {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
  ureum: number;
  fcm: number;
}

interface MprInputProps {
  onChange?: (data: MprData) => void;
  defaultValues?: Partial<MprData>;
}

/**
 * Calculate Fat Corrected Milk (FCM)
 * Formula: FCM = (0.337 + 0.116 × Fat% + 0.06 × Protein%) × Milk Production
 */
function calculateFCM(milkProduction: number, fatPercent: number, proteinPercent: number): number {
  return (0.337 + 0.116 * fatPercent + 0.06 * proteinPercent) * milkProduction;
}

/**
 * MprInput component - Shows only input fields for MPR data
 * Used on Page 2 (Profiel & MPR step)
 * Validation results are shown in MprValidation component on Page 5
 */
export default function MprInput({ onChange, defaultValues }: MprInputProps) {
  const [milkProduction, setMilkProduction] = useState(defaultValues?.milkProduction ?? 41);
  const [fatPercent, setFatPercent] = useState(defaultValues?.fatPercent ?? 4.60);
  const [proteinPercent, setProteinPercent] = useState(defaultValues?.proteinPercent ?? 3.75);
  const [ureum, setUreum] = useState(defaultValues?.ureum ?? 21);
  
  const fcm = calculateFCM(milkProduction, fatPercent, proteinPercent);
  
  useEffect(() => {
    onChange?.({
      milkProduction,
      fatPercent,
      proteinPercent,
      ureum,
      fcm,
    });
  }, [milkProduction, fatPercent, proteinPercent, ureum, fcm, onChange]);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50/50 dark:from-blue-950/40 dark:to-cyan-950/20 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div>
              <span className="text-blue-700 dark:text-blue-400">MPR Uitslagen</span>
              <span className="text-muted-foreground font-normal text-sm ml-2">— Melkproductie Registratie</span>
            </div>
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300">
            Input
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Voer de MPR-gegevens in. Deze worden gebruikt voor de validatie in Stap 5.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Milk Production */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <Label htmlFor="milk-production" className="text-sm font-medium">
              Melkproductie (kg/d)
            </Label>
            <Input
              id="milk-production"
              type="number"
              step="0.1"
              min="0"
              value={milkProduction || ""}
              onChange={(e) => setMilkProduction(parseFloat(e.target.value) || 0)}
              className="h-9 bg-background"
            />
          </div>
          
          {/* Fat Percentage */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <Label htmlFor="fat-percent" className="text-sm font-medium">
              Vet%
            </Label>
            <Input
              id="fat-percent"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={fatPercent || ""}
              onChange={(e) => setFatPercent(parseFloat(e.target.value) || 0)}
              className="h-9 bg-background"
            />
          </div>
          
          {/* Protein Percentage */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <Label htmlFor="protein-percent" className="text-sm font-medium">
              Eiwit%
            </Label>
            <Input
              id="protein-percent"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={proteinPercent || ""}
              onChange={(e) => setProteinPercent(parseFloat(e.target.value) || 0)}
              className="h-9 bg-background"
            />
          </div>
          
          {/* Ureum */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <Label htmlFor="ureum" className="text-sm font-medium">
              Ureum (mg/100ml)
            </Label>
            <Input
              id="ureum"
              type="number"
              step="1"
              min="0"
              value={ureum || ""}
              onChange={(e) => setUreum(parseFloat(e.target.value) || 0)}
              className="h-9 bg-background"
            />
          </div>
        </div>
        
        {/* Info note */}
        <div className="p-3 rounded-lg bg-blue-100/30 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50">
          <p className="text-sm text-muted-foreground">
            💡 De validatie en FCM-berekening worden getoond in <span className="font-medium">Stap 5: MPR Validatie</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export type { MprData };
