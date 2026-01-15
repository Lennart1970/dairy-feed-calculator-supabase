import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MprData {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
  ureum: number;
  fcm: number;
}

interface MprInputFieldsProps {
  onMprChange: (data: MprData) => void;
}

/**
 * Calculate Fat Corrected Milk (FCM)
 * Formula: FCM = (0.337 + 0.116 × Fat% + 0.06 × Protein%) × Milk Production
 */
function calculateFCM(milkProduction: number, fatPercent: number, proteinPercent: number): number {
  return (0.337 + 0.116 * fatPercent + 0.06 * proteinPercent) * milkProduction;
}

/**
 * MPR input fields without Card wrapper - for use in BehoefteCard
 */
export default function MprInputFields({ onMprChange }: MprInputFieldsProps) {
  const [milkProduction, setMilkProduction] = useState(41);
  const [fatPercent, setFatPercent] = useState(4.60);
  const [proteinPercent, setProteinPercent] = useState(3.75);
  const [ureum, setUreum] = useState(21);
  
  const fcm = calculateFCM(milkProduction, fatPercent, proteinPercent);
  
  useEffect(() => {
    onMprChange({
      milkProduction,
      fatPercent,
      proteinPercent,
      ureum,
      fcm,
    });
  }, [milkProduction, fatPercent, proteinPercent, ureum, fcm, onMprChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Milk Production */}
        <div className="space-y-1.5">
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
            className="h-9"
          />
        </div>
        
        {/* Fat Percentage */}
        <div className="space-y-1.5">
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
            className="h-9"
          />
        </div>
        
        {/* Protein Percentage */}
        <div className="space-y-1.5">
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
            className="h-9"
          />
        </div>
        
        {/* Ureum */}
        <div className="space-y-1.5">
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
            className="h-9"
          />
        </div>
      </div>
      
      {/* Info note */}
      <div className="p-3 rounded-lg bg-blue-100/30 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50">
        <p className="text-sm text-muted-foreground">
          💡 De validatie en FCM-berekening worden getoond in <span className="font-medium">Stap 5: MPR Validatie</span>
        </p>
      </div>
    </div>
  );
}
