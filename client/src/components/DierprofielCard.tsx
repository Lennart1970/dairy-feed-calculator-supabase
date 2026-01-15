import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { calculateDynamicRequirements, type DynamicRequirementInputs } from "@/lib/dynamicRequirements";

interface DierprofielCardProps {
  onProfileChange: (profile: {
    id: number;
    name: string;
    weightKg: number;
    vemTarget: number;
    dveTargetGrams: number;
    maxBdsKg: number;
    description: string | null;
    notes: string | null;
  } | null) => void;
  onDynamicRequirementsChange?: (requirements: {
    vemTotal: number;
    dveTotal: number;
  } | null) => void;
  onParityChange?: (parity: number) => void;
  onDaysInMilkChange?: (dim: number) => void;
  onDaysPregnantChange?: (days: number) => void;
  mprData?: {
    milkProduction: number;
    fatPercent: number;
    proteinPercent: number;
    ureum: number;
  } | null;
}

export default function DierprofielCard({
  onProfileChange,
  onDynamicRequirementsChange,
  onParityChange,
  onDaysInMilkChange,
  onDaysPregnantChange,
  mprData,
}: DierprofielCardProps) {
  const { data: animalProfiles } = trpc.animalProfiles.list.useQuery();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [parity, setParity] = useState(3);
  const [daysInMilk, setDaysInMilk] = useState(150);
  const [daysPregnant, setDaysPregnant] = useState(0);

  const selectedProfile = animalProfiles?.find((p) => p.id === selectedProfileId) || null;

  // Calculate FPCM and dynamic requirements for HF profile
  const fpcm = mprData 
    ? mprData.milkProduction * (0.337 + 0.116 * mprData.fatPercent + 0.06 * mprData.proteinPercent)
    : 0;
  
  const dynamicRequirements = selectedProfile?.name.includes('Holstein-Fries') && mprData
    ? calculateDynamicRequirements({
        weightKg: selectedProfile.weightKg,
        parity,
        daysInMilk,
        daysPregnant,
        fpcm,
        isGrazing: false, // Will be passed from parent later if needed
      })
    : null;

  // Notify parent of profile changes
  useEffect(() => {
    onProfileChange(selectedProfile);
  }, [selectedProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of dynamic requirements changes
  useEffect(() => {
    if (onDynamicRequirementsChange) {
      onDynamicRequirementsChange(dynamicRequirements);
    }
  }, [dynamicRequirements]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of parity/DIM/pregnancy changes
  useEffect(() => {
    if (onParityChange) onParityChange(parity);
  }, [parity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (onDaysInMilkChange) onDaysInMilkChange(daysInMilk);
  }, [daysInMilk]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (onDaysPregnantChange) onDaysPregnantChange(daysPregnant);
  }, [daysPregnant]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProfileChange = (profileId: number) => {
    setSelectedProfileId(profileId);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50/50 dark:from-blue-950/40 dark:to-sky-950/20 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            2
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-400">Dierprofiel</span>
            <span className="text-muted-foreground font-normal text-sm ml-2">— De Bouwtekening</span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Selecteer het diertype om de theoretische behoefte te bepalen.
        </p>
        
        {/* Dynamic Requirements Explanation - HF Only */}
        {selectedProfile?.name.includes('Holstein-Fries') && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <p className="font-medium mb-1">🧮 Dynamische berekening (alleen Holstein-Fries):</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li><strong>Lactatie #</strong>: 1e lactatie +625 VEM groeitoeslag, 2e lactatie +325 VEM</li>
              <li><strong>Dagen in Melk</strong>: Groeitoeslag alleen in eerste 100 DIM</li>
              <li><strong>Dracht</strong>: Drachttoeslag vanaf 190 dagen drachtig</li>
            </ul>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-select" className="text-sm font-medium">
            Selecteer Diertype
          </Label>
          <Select
            value={selectedProfileId?.toString() ?? ""}
            onValueChange={(value) => handleProfileChange(parseInt(value))}
          >
            <SelectTrigger id="profile-select" className="h-11 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Kies een dierprofiel" />
            </SelectTrigger>
            <SelectContent>
              {animalProfiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id.toString()}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* VOC Input Fields - HF Lactating Only */}
        {selectedProfile && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="space-y-2">
              <Label htmlFor="parity-input" className="text-sm font-medium">
                Lactatie #
              </Label>
              <Input
                id="parity-input"
                type="number"
                min="1"
                max="6"
                value={parity}
                onChange={(e) => setParity(parseInt(e.target.value) || 1)}
                className="h-11 bg-white dark:bg-slate-800"
              />
              <p className="text-xs text-muted-foreground">1 = vaars, 3+ = volwassen</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dim-input" className="text-sm font-medium">
                Dagen in Melk
              </Label>
              <Input
                id="dim-input"
                type="number"
                min="0"
                max="305"
                value={daysInMilk}
                onChange={(e) => setDaysInMilk(parseInt(e.target.value) || 0)}
                className="h-11 bg-white dark:bg-slate-800"
              />
              <p className="text-xs text-muted-foreground">0-305 dagen</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pregnant-input" className="text-sm font-medium">
                Dagen Drachtig
              </Label>
              <Input
                id="pregnant-input"
                type="number"
                min="0"
                max="283"
                value={daysPregnant}
                onChange={(e) => setDaysPregnant(parseInt(e.target.value) || 0)}
                className="h-11 bg-white dark:bg-slate-800"
              />
              <p className="text-xs text-muted-foreground">0-283 dagen</p>
            </div>
          </div>
        )}
        
        {selectedProfile && (
          <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-700 dark:text-blue-400">
                Behoefte (Bouwtekening)
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{selectedProfile.description}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {dynamicRequirements ? dynamicRequirements.vemTotal.toLocaleString() : selectedProfile.vemTarget.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">VEM</p>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {dynamicRequirements ? `${dynamicRequirements.dveTotal}g` : `${selectedProfile.dveTargetGrams}g`}
                </p>
                <p className="text-xs text-muted-foreground">DVE</p>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{selectedProfile.maxBdsKg}</p>
                <p className="text-xs text-muted-foreground">kg DS max</p>
              </div>
            </div>
            {selectedProfile.notes && (
              <p className="text-xs text-muted-foreground italic mt-3">{selectedProfile.notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
