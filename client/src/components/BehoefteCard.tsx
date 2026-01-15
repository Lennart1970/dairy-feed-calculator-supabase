import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type MprData } from "@/components/MprInput";
import MprInputFields from "@/components/MprInputFields";
import DierprofielFields from "@/components/DierprofielFields";
import { Target } from "lucide-react";

interface BehoefteCardProps {
  mprData: MprData | null;
  onMprChange: (data: MprData) => void;
  onProfileChange: (profile: any) => void;
  initialProfileName?: string | null;
}

export default function BehoefteCard({
  mprData,
  onMprChange,
  onProfileChange,
  initialProfileName,
}: BehoefteCardProps) {
  const handleProfileChange = useCallback((profile: any) => {
    onProfileChange(profile?.name || null);
  }, [onProfileChange]);

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
            2
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-100">Behoefte</span>
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Bepaal de voedingsbehoefte op basis van melkproductie en dierprofiel
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Section A: MPR Uitslagen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              MPR Uitslagen
              <span className="text-muted-foreground font-normal text-sm ml-2">— Melkproductie Registratie</span>
            </h3>
          </div>
          <MprInputFields onMprChange={onMprChange} />
        </div>

        {/* Section B: Dierprofiel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              B
            </div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              Dierprofiel
              <span className="text-muted-foreground font-normal text-sm ml-2">— Dierkenmerken</span>
            </h3>
          </div>
          <DierprofielFields
            initialProfileName={initialProfileName}
            onProfileChange={handleProfileChange}
            mprData={mprData}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export type { MprData };
