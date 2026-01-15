import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { calculateDynamicRequirements, type DynamicRequirementInputs } from "@/lib/dynamicRequirements";

interface DierprofielFieldsProps {
  initialProfileName?: string | null;
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
  mprData?: {
    milkProduction: number;
    fatPercent: number;
    proteinPercent: number;
    ureum: number;
    fcm: number;
  } | null;
}

/**
 * Dierprofiel input fields without Card wrapper - for use in BehoefteCard
 */
export default function DierprofielFields({
  initialProfileName,
  onProfileChange,
  onDynamicRequirementsChange,
  mprData,
}: DierprofielFieldsProps) {
  const { data: animalProfiles, isLoading } = trpc.animalProfiles.list.useQuery();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const hasInitialized = useRef(false);
  const lastNotifiedProfileId = useRef<number | null>(null);

  const [parity, setParity] = useState(3);
  const [daysInMilk, setDaysInMilk] = useState(150);
  const [daysPregnant, setDaysPregnant] = useState(0);
  const [weightKg, setWeightKg] = useState<number>(675);

  const selectedProfile = animalProfiles?.find((p) => p.id === selectedProfileId) || null;

  // Auto-select initial profile when profiles load (only once)
  useEffect(() => {
    if (!isLoading && animalProfiles && animalProfiles.length > 0 && initialProfileName && !hasInitialized.current) {
      const profile = animalProfiles.find(p => p.name === initialProfileName);
      if (profile) {
        setSelectedProfileId(profile.id);
        setWeightKg(profile.weightKg);
        hasInitialized.current = true;
        // Immediately notify parent of the auto-selected profile
        lastNotifiedProfileId.current = profile.id;
        onProfileChange(profile);
      }
    }
  }, [animalProfiles, isLoading, initialProfileName, onProfileChange]);

  // Notify parent when user changes profile (not on initial auto-select)
  useEffect(() => {
    // Only notify if we've initialized and the profile ID actually changed
    if (hasInitialized.current && selectedProfileId !== lastNotifiedProfileId.current) {
      lastNotifiedProfileId.current = selectedProfileId;
      onProfileChange(selectedProfile);
    }
  }, [selectedProfileId, selectedProfile, onProfileChange]);

  // Auto-fill weight when profile changes (user selection)
  useEffect(() => {
    if (selectedProfile) {
      setWeightKg(selectedProfile.weightKg);
    }
  }, [selectedProfileId]);

  // Calculate dynamic requirements for Holstein-Fries
  const dynamicRequirements = selectedProfile?.name.includes('Holstein-Fries') && mprData
    ? calculateDynamicRequirements({
        weightKg,
        parity,
        daysInMilk,
        daysPregnant,
        fpcm: mprData.fcm,
        isGrazing: false,
      })
    : null;

  useEffect(() => {
    if (onDynamicRequirementsChange) {
      onDynamicRequirementsChange(dynamicRequirements);
    }
  }, [dynamicRequirements, onDynamicRequirementsChange]);

  const handleProfileChange = (profileId: number) => {
    setSelectedProfileId(profileId);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Requirements Explanation - HF Only */}
      {selectedProfile?.name.includes('Holstein-Fries') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">🧮 Dynamische berekening (alleen Holstein-Fries):</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li><strong>Gewicht</strong>: Onderhoudsbehoefte = 52.2 × LG^0.75 (metabolisch gewicht)</li>
            <li><strong>Lactatie</strong>: Vaars (1e lactatie) +625 VEM groeitoeslag</li>
            <li><strong>Dagen in Melk</strong>: Groeitoeslag alleen bij ≤100 dagen</li>
            <li><strong>Dracht</strong>: Drachttoeslag vanaf 190 dagen drachtig</li>
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="profile-select" className="text-sm font-medium">
          Selecteer Diertype
        </Label>
        <Select
          value={selectedProfileId?.toString() ?? ""}
          onValueChange={(value) => handleProfileChange(parseInt(value))}
        >
          <SelectTrigger id="profile-select" className="h-11">
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
      
      {/* Profile-specific inputs */}
      {selectedProfile && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="parity-select" className="text-sm font-medium">
              Lactatie
            </Label>
            <Select
              value={parity === 1 ? "vaars" : "volwassen"}
              onValueChange={(value) => setParity(value === "vaars" ? 1 : 3)}
            >
              <SelectTrigger id="parity-select" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vaars">Vaars (1e lactatie)</SelectItem>
                <SelectItem value="volwassen">Volwassen (2+ lactaties)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dim-select" className="text-sm font-medium">
              Dagen in Melk
            </Label>
            <Select
              value={daysInMilk <= 100 ? "early" : "late"}
              onValueChange={(value) => setDaysInMilk(value === "early" ? 50 : 150)}
            >
              <SelectTrigger id="dim-select" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="early">≤100 dagen (vroege lactatie)</SelectItem>
                <SelectItem value="late">&gt;100 dagen (midden/late lactatie)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pregnant-select" className="text-sm font-medium">
              Dracht
            </Label>
            <Select
              value={
                daysPregnant === 0 ? "not-pregnant" :
                daysPregnant < 190 ? "early-pregnant" :
                "late-pregnant"
              }
              onValueChange={(value) => {
                if (value === "not-pregnant") setDaysPregnant(0);
                else if (value === "early-pregnant") setDaysPregnant(45);
                else setDaysPregnant(190);
              }}
            >
              <SelectTrigger id="pregnant-select" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-pregnant">Niet drachtig</SelectItem>
                <SelectItem value="early-pregnant">Drachtig tot 90 dagen</SelectItem>
                <SelectItem value="late-pregnant">Drachtig (&ge;190 dagen)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Weight Input */}
      {selectedProfile && (
        <div className="space-y-2">
          <Label htmlFor="weight-input" className="text-sm font-medium">
            Gewicht (kg)
          </Label>
          <Input
            id="weight-input"
            type="number"
            min="300"
            max="1000"
            step="5"
            value={weightKg}
            onChange={(e) => setWeightKg(parseInt(e.target.value) || 675)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Levend gewicht (LG)</p>
        </div>
      )}
      
      {/* Behoefte Results */}
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
          {dynamicRequirements && (
            <p className="text-xs text-muted-foreground italic mt-3">
              Gebaseerd op Rantsoenanalyse tool. VEM dekking {((dynamicRequirements.vemTotal / selectedProfile.vemTarget) * 100).toFixed(1)}%, DVE dekking {((dynamicRequirements.dveTotal / selectedProfile.dveTargetGrams) * 100).toFixed(1)}% met standaard rantsoen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
