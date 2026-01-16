import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

type HerdGroup = {
  id: number;
  name: string;
  cowCount: number;
  lifeStage: string;
  avgWeightKg: number;
  avgMilkYieldKg: number;
  avgFatPercent: number;
  avgProteinPercent: number;
  avgDaysInMilk: number;
  vemTarget: number | null;
  dveTarget: number | null;
};

interface GroupSelectorProps {
  selectedGroupId: number | null;
  onGroupSelect: (group: HerdGroup | null) => void;
}

export default function GroupSelector({ selectedGroupId, onGroupSelect }: GroupSelectorProps) {
  const { data: groups, isLoading } = trpc.herdGroups.list.useQuery();
  const [isOpen, setIsOpen] = useState(false);

  // Find selected group
  const selectedGroup = groups?.find(g => g.id === selectedGroupId) || null;

  // Auto-select first group if none selected
  useEffect(() => {
    if (!selectedGroupId && groups && groups.length > 0) {
      // Don't auto-select, let user choose
    }
  }, [groups, selectedGroupId]);

  if (isLoading) {
    return (
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-b border-green-200 dark:border-green-800 py-3">
        <CardTitle className="text-lg font-bold flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-green-900 dark:text-green-100">Koegroep Selecteren</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Kies een groep om het rantsoen te berekenen
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Selected Group Display or Selector */}
        {selectedGroup ? (
          <div className="space-y-3">
            {/* Selected Group Card */}
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {selectedGroup.lifeStage === 'dry' ? '🤰' : '🐄'}
                  </span>
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {selectedGroup.name}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {selectedGroup.cowCount} koeien • {selectedGroup.lifeStage === 'dry' ? 'Droogstaand' : `${selectedGroup.avgMilkYieldKg} kg melk/dag`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-green-600 hover:text-green-800 text-sm px-3 py-1 border border-green-300 rounded-lg hover:bg-green-100"
                >
                  Wijzigen
                </button>
              </div>
              
              {/* Group Stats */}
              <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{selectedGroup.avgWeightKg}</div>
                  <div className="text-xs text-gray-500">kg gewicht</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{selectedGroup.avgFatPercent}%</div>
                  <div className="text-xs text-gray-500">vet</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{selectedGroup.avgProteinPercent}%</div>
                  <div className="text-xs text-gray-500">eiwit</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{selectedGroup.avgDaysInMilk}</div>
                  <div className="text-xs text-gray-500">DIM</div>
                </div>
              </div>
            </div>

            {/* Dropdown for changing group */}
            {isOpen && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                {groups?.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      onGroupSelect(group);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                      group.id === selectedGroupId ? 'bg-green-50 dark:bg-green-950/30' : ''
                    }`}
                  >
                    <span className="text-2xl">
                      {group.lifeStage === 'dry' ? '🤰' : '🐄'}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 dark:text-white">{group.name}</div>
                      <div className="text-sm text-gray-500">
                        {group.cowCount} koeien • {group.lifeStage === 'dry' ? 'Droog' : `${group.avgMilkYieldKg} kg`}
                      </div>
                    </div>
                    {group.id === selectedGroupId && (
                      <span className="text-green-600">✓</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onGroupSelect(null);
                    setIsOpen(false);
                  }}
                  className="w-full p-3 text-left text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  Geen groep (handmatig invoeren)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* No Group Selected - Show Selection List */
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              Selecteer een koegroep of gebruik handmatige invoer hieronder
            </p>
            {groups?.map(group => (
              <button
                key={group.id}
                onClick={() => onGroupSelect(group)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-300 transition-colors"
              >
                <span className="text-2xl">
                  {group.lifeStage === 'dry' ? '🤰' : '🐄'}
                </span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">{group.name}</div>
                  <div className="text-sm text-gray-500">
                    {group.cowCount} koeien • {group.lifeStage === 'dry' ? 'Droogstaand' : `${group.avgMilkYieldKg} kg melk/dag`}
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            ))}
            {(!groups || groups.length === 0) && (
              <div className="text-center py-6 text-gray-500">
                <span className="text-4xl mb-2 block">👥</span>
                <p>Nog geen groepen aangemaakt</p>
                <a href="/groepen" className="text-green-600 hover:text-green-800 text-sm">
                  Groepen beheren →
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { HerdGroup };
