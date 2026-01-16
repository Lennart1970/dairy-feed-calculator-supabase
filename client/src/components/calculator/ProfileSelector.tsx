/**
 * ProfileSelector Component
 * 
 * Handles animal profile selection and VOC parameter controls.
 * Extracted from CalculatorForm.tsx for better maintainability.
 * 
 * Responsibilities:
 * - Profile dropdown selection
 * - VOC parameters (parity, days in milk, days pregnant)
 * - Weight input
 * - Grazing toggle
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Target, Leaf } from "lucide-react";
import type { DynamicRequirements } from "@/lib/dynamicRequirements";

// Types
export interface AnimalProfile {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  weightKg: number;
  vemTarget: number;
  dveTargetGrams: number;
  maxBdsKg: number;
  parity: number | null;
  daysInMilk: number | null;
  daysPregnant: number | null;
}

export interface VocParams {
  parity: number;
  daysInMilk: number;
  daysPregnant: number;
  weightKg: number;
}

export interface ProfileSelectorProps {
  profiles: AnimalProfile[] | undefined;
  selectedProfile: AnimalProfile | null;
  onProfileChange: (profileId: number) => void;
  vocParams: VocParams;
  onVocParamsChange: (params: Partial<VocParams>) => void;
  isGrazing: boolean;
  onGrazingChange: (isGrazing: boolean) => void;
  dynamicRequirements: DynamicRequirements | null;
  isLoading?: boolean;
}

// Parity options
const PARITY_OPTIONS = [
  { value: 1, label: "1e kalfskoe (vaars)" },
  { value: 2, label: "2e kalfskoe" },
  { value: 3, label: "Volwassen (3+)" },
];

// Days in milk options
const DAYS_IN_MILK_OPTIONS = [
  { value: 30, label: "0-60 dagen (vroege lactatie)" },
  { value: 100, label: "60-120 dagen (piek)" },
  { value: 150, label: ">120 dagen (midden/laat)" },
];

// Days pregnant options
const DAYS_PREGNANT_OPTIONS = [
  { value: 0, label: "Niet drachtig" },
  { value: 90, label: "1-3 maanden" },
  { value: 180, label: "4-6 maanden" },
  { value: 250, label: "7-9 maanden" },
];

export default function ProfileSelector({
  profiles,
  selectedProfile,
  onProfileChange,
  vocParams,
  onVocParamsChange,
  isGrazing,
  onGrazingChange,
  dynamicRequirements,
  isLoading = false,
}: ProfileSelectorProps) {
  
  // Check if this is a Holstein-Fries profile (shows VOC controls)
  const isHolsteinFries = selectedProfile?.name.includes('Holstein-Fries');
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Dierprofiel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Selection */}
        <div className="space-y-2">
          <Label htmlFor="profile">Selecteer dierprofiel</Label>
          <Select
            value={selectedProfile?.id?.toString() || ""}
            onValueChange={(value) => onProfileChange(parseInt(value))}
            disabled={isLoading || !profiles}
          >
            <SelectTrigger id="profile">
              <SelectValue placeholder={isLoading ? "Laden..." : "Selecteer profiel"} />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id.toString()}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Profile Info */}
        {selectedProfile && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VEM behoefte:</span>
              <span className="font-medium">
                {dynamicRequirements 
                  ? dynamicRequirements.vemTotal.toLocaleString() 
                  : selectedProfile.vemTarget.toLocaleString()} VEM
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">DVE behoefte:</span>
              <span className="font-medium">
                {dynamicRequirements 
                  ? Math.round(dynamicRequirements.dveTotal).toLocaleString() 
                  : selectedProfile.dveTargetGrams.toLocaleString()}g
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max DS opname:</span>
              <span className="font-medium">{selectedProfile.maxBdsKg} kg DS</span>
            </div>
            {selectedProfile.description && (
              <p className="text-xs text-muted-foreground mt-2">{selectedProfile.description}</p>
            )}
          </div>
        )}

        {/* VOC Parameters (only for Holstein-Fries) */}
        {isHolsteinFries && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">VOC Parameters</Badge>
            </div>
            
            {/* Weight */}
            <div className="space-y-1">
              <Label htmlFor="weight" className="text-sm">Gewicht (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={vocParams.weightKg}
                onChange={(e) => onVocParamsChange({ weightKg: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            
            {/* Parity */}
            <div className="space-y-1">
              <Label htmlFor="parity" className="text-sm">Pariteit</Label>
              <Select
                value={vocParams.parity.toString()}
                onValueChange={(value) => onVocParamsChange({ parity: parseInt(value) })}
              >
                <SelectTrigger id="parity" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Days in Milk */}
            <div className="space-y-1">
              <Label htmlFor="dim" className="text-sm">Dagen in lactatie</Label>
              <Select
                value={vocParams.daysInMilk.toString()}
                onValueChange={(value) => onVocParamsChange({ daysInMilk: parseInt(value) })}
              >
                <SelectTrigger id="dim" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_IN_MILK_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Days Pregnant */}
            <div className="space-y-1">
              <Label htmlFor="pregnant" className="text-sm">Dagen drachtig</Label>
              <Select
                value={vocParams.daysPregnant.toString()}
                onValueChange={(value) => onVocParamsChange({ daysPregnant: parseInt(value) })}
              >
                <SelectTrigger id="pregnant" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_PREGNANT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Grazing Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-600" />
            <Label htmlFor="grazing" className="text-sm font-medium">Beweiding</Label>
          </div>
          <Switch
            id="grazing"
            checked={isGrazing}
            onCheckedChange={onGrazingChange}
          />
        </div>
        {isGrazing && (
          <p className="text-xs text-muted-foreground">
            +500 VEM voor beweidingsactiviteit (CVB 2025)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
