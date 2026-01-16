import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Button } from "@/components/ui/button";
import { Save, Check, Loader2 } from "lucide-react";

interface RationItem {
  feedId: number;
  amountKgDs: number;
  feedingMethod?: string;
  loadOrder?: number;
}

interface SaveRationButtonProps {
  groupId: number | null;
  groupName: string;
  rations: RationItem[];
  disabled?: boolean;
}

export default function SaveRationButton({ 
  groupId, 
  groupName, 
  rations,
  disabled = false 
}: SaveRationButtonProps) {
  const [saved, setSaved] = useState(false);

  const saveRationMutation = trpc.groupRations.save.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    if (!groupId || rations.length === 0) return;
    
    saveRationMutation.mutate({
      groupId,
      rations: rations.filter(r => r.amountKgDs > 0),
    });
  };

  if (!groupId) {
    return null;
  }

  const isLoading = saveRationMutation.isPending;
  const hasRations = rations.some(r => r.amountKgDs > 0);

  return (
    <Button
      onClick={handleSave}
      disabled={disabled || isLoading || !hasRations}
      className={`transition-all ${
        saved 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Opslaan...
        </>
      ) : saved ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Opgeslagen!
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          Rantsoen Opslaan voor {groupName}
        </>
      )}
    </Button>
  );
}
