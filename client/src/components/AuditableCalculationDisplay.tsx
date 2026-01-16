/**
 * Auditable Calculation Display Component
 * 
 * Displays step-by-step calculation breakdowns for feed experts.
 * Every formula, input, and intermediate result is shown transparently.
 */

import React, { useState } from 'react';
import { 
  AuditableCalculationResult, 
  CalculationStep,
  FeedContribution,
  generateAuditReport 
} from '../lib/auditableCalculator';

// ============================================================================
// Sub-components
// ============================================================================

interface CalculationStepCardProps {
  step: CalculationStep;
  index?: number;
}

function CalculationStepCard({ step, index }: CalculationStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-white hover:bg-gray-50">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
              Stap {index}
            </span>
          )}
          <span className="font-medium text-gray-900">{step.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-green-700">
            {step.result.toLocaleString('nl-NL')} {step.unit}
          </span>
          <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500 font-medium min-w-24">Formule:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">{step.formula}</code>
            </div>
            
            <div className="flex gap-2">
              <span className="text-gray-500 font-medium min-w-24">Invoer:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(step.inputs).map(([key, value]) => (
                  <span key={key} className="bg-blue-50 px-2 py-1 rounded text-blue-800">
                    {key}: {typeof value === 'number' ? value.toLocaleString('nl-NL') : value}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <span className="text-gray-500 font-medium min-w-24">Berekening:</span>
              <code className="bg-yellow-50 px-2 py-1 rounded text-yellow-800">{step.calculation}</code>
            </div>
            
            <div className="flex gap-2">
              <span className="text-gray-500 font-medium min-w-24">Bron:</span>
              <span className="text-gray-600 italic">{step.source}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FeedContributionCardProps {
  feed: FeedContribution;
}

function FeedContributionCard({ feed }: FeedContributionCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-white">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <span className="font-medium text-gray-900">{feed.displayName}</span>
          <span className="text-gray-500 text-sm ml-2">
            ({feed.amountKgDs} kg DS, {feed.dsPercent}% DS)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-700 font-medium">{feed.contributions.vem.result.toLocaleString('nl-NL')} VEM</span>
          <span className="text-blue-700 font-medium">{feed.contributions.dve.result.toLocaleString('nl-NL')}g DVE</span>
          <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Basis:</span>
              <span className="ml-2">{feed.basis}</span>
            </div>
            <div>
              <span className="text-gray-500">kg Product:</span>
              <span className="ml-2">{feed.amountKgProduct}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-gray-600">VEM: </span>
              <code className="bg-gray-100 px-1 rounded">{feed.contributions.vem.calculation}</code>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">DVE: </span>
              <code className="bg-gray-100 px-1 rounded">{feed.contributions.dve.calculation}</code>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">OEB: </span>
              <code className="bg-gray-100 px-1 rounded">{feed.contributions.oeb.calculation}</code>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">SW: </span>
              <code className="bg-gray-100 px-1 rounded">{feed.contributions.sw.calculation}</code>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">VW: </span>
              <code className="bg-gray-100 px-1 rounded">{feed.contributions.vw.calculation}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon, children, defaultExpanded = false }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border border-gray-300 rounded-lg mb-4 overflow-hidden">
      <div 
        className="bg-gray-100 px-4 py-3 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
      </div>
      
      {expanded && (
        <div className="p-4 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface AuditableCalculationDisplayProps {
  result: AuditableCalculationResult;
}

export function AuditableCalculationDisplay({ result }: AuditableCalculationDisplayProps) {
  const [showRawReport, setShowRawReport] = useState(false);
  
  const downloadReport = () => {
    const report = generateAuditReport(result);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rantsoen-audit-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">📊 Rantsoenberekening - Audit Rapport</h1>
            <p className="text-blue-100">
              Gegenereerd: {new Date(result.timestamp).toLocaleString('nl-NL')}
            </p>
          </div>
          <button
            onClick={downloadReport}
            className="bg-white text-blue-800 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            📥 Download Rapport
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">VEM Dekking</div>
          <div className={`text-2xl font-bold ${result.summary.vemCoverage >= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summary.vemCoverage}%
          </div>
          <div className="text-xs text-gray-400">
            {result.summary.totalVemSupplied.toLocaleString('nl-NL')} / {result.summary.totalVemRequired.toLocaleString('nl-NL')}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">DVE Dekking</div>
          <div className={`text-2xl font-bold ${result.summary.dveCoverage >= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summary.dveCoverage}%
          </div>
          <div className="text-xs text-gray-400">
            {result.summary.totalDveSupplied.toLocaleString('nl-NL')}g / {result.summary.totalDveRequired.toLocaleString('nl-NL')}g
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">VOC Benutting</div>
          <div className={`text-2xl font-bold ${result.summary.vocUtilization <= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summary.vocUtilization}%
          </div>
          <div className="text-xs text-gray-400">
            van {result.summary.vocCapacity} kg DS
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Structuurwaarde</div>
          <div className={`text-2xl font-bold ${result.summary.swPerKgDs >= 1.0 ? 'text-green-600' : 'text-orange-600'}`}>
            {result.summary.swPerKgDs}
          </div>
          <div className="text-xs text-gray-400">
            SW/kg DS ({result.summary.swStatus})
          </div>
        </div>
      </div>
      
      {/* Input Summary */}
      <Section title="Invoergegevens" icon="📝" defaultExpanded={true}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Dierprofiel</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="text-gray-500 py-1">Naam:</td><td className="font-medium">{result.inputs.animalProfile.name}</td></tr>
                <tr><td className="text-gray-500 py-1">Gewicht:</td><td className="font-medium">{result.inputs.animalProfile.weightKg} kg</td></tr>
                <tr><td className="text-gray-500 py-1">Pariteit:</td><td className="font-medium">{result.inputs.animalProfile.parity}</td></tr>
                <tr><td className="text-gray-500 py-1">Dagen in Melk:</td><td className="font-medium">{result.inputs.animalProfile.daysInMilk}</td></tr>
                <tr><td className="text-gray-500 py-1">Dagen Drachtig:</td><td className="font-medium">{result.inputs.animalProfile.daysPregnant}</td></tr>
                <tr><td className="text-gray-500 py-1">Beweiding:</td><td className="font-medium">{result.inputs.isGrazing ? 'Ja' : 'Nee'}</td></tr>
              </tbody>
            </table>
          </div>
          
          {result.inputs.milkProduction && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-700 mb-3">Melkproductie</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="text-gray-500 py-1">Melk:</td><td className="font-medium">{result.inputs.milkProduction.kgPerDay} kg/dag</td></tr>
                  <tr><td className="text-gray-500 py-1">Vet%:</td><td className="font-medium">{result.inputs.milkProduction.fatPercent}%</td></tr>
                  <tr><td className="text-gray-500 py-1">Eiwit%:</td><td className="font-medium">{result.inputs.milkProduction.proteinPercent}%</td></tr>
                  <tr><td className="text-gray-500 py-1">FPCM:</td><td className="font-medium text-blue-600">{result.inputs.milkProduction.fpcm} kg/dag</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>
      
      {/* VEM Requirements */}
      <Section title="VEM Behoefte - Stap voor Stap" icon="⚡">
        <CalculationStepCard step={result.requirements.vem.maintenance} index={1} />
        <CalculationStepCard step={result.requirements.vem.production} index={2} />
        {result.requirements.vem.pregnancy.result > 0 && (
          <CalculationStepCard step={result.requirements.vem.pregnancy} index={3} />
        )}
        {result.requirements.vem.growth.result > 0 && (
          <CalculationStepCard step={result.requirements.vem.growth} index={4} />
        )}
        {result.requirements.vem.grazing.result > 0 && (
          <CalculationStepCard step={result.requirements.vem.grazing} index={5} />
        )}
        
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-green-800">TOTAAL VEM BEHOEFTE</span>
            <span className="text-2xl font-bold text-green-700">
              {result.requirements.vem.total.result.toLocaleString('nl-NL')} VEM
            </span>
          </div>
          <div className="text-sm text-green-600 mt-1">
            {result.requirements.vem.total.calculation}
          </div>
        </div>
      </Section>
      
      {/* DVE Requirements */}
      <Section title="DVE Behoefte - Stap voor Stap" icon="🥩">
        <CalculationStepCard step={result.requirements.dve.maintenance} index={1} />
        <CalculationStepCard step={result.requirements.dve.production} index={2} />
        {result.requirements.dve.pregnancy.result > 0 && (
          <CalculationStepCard step={result.requirements.dve.pregnancy} index={3} />
        )}
        {result.requirements.dve.growth.result > 0 && (
          <CalculationStepCard step={result.requirements.dve.growth} index={4} />
        )}
        
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-blue-800">TOTAAL DVE BEHOEFTE</span>
            <span className="text-2xl font-bold text-blue-700">
              {result.requirements.dve.total.result.toLocaleString('nl-NL')} gram
            </span>
          </div>
          <div className="text-sm text-blue-600 mt-1">
            {result.requirements.dve.total.calculation}
          </div>
        </div>
      </Section>
      
      {/* VOC Calculation */}
      <Section title="VOC Berekening (Voeropnamecapaciteit)" icon="🐄">
        <div className="space-y-2">
          <CalculationStepCard step={result.requirements.voc.lactationAge} />
          <CalculationStepCard step={result.requirements.voc.maturityComponent} />
          <CalculationStepCard step={result.requirements.voc.lactationComponent} />
          <CalculationStepCard step={result.requirements.voc.pregnancyComponent} />
          <CalculationStepCard step={result.requirements.voc.vocTotal} />
          <CalculationStepCard step={result.requirements.voc.vocKgDs} />
        </div>
        
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-purple-800">VOC CAPACITEIT</span>
            <span className="text-2xl font-bold text-purple-700">
              {result.requirements.voc.vocKgDs.result} kg DS
            </span>
          </div>
        </div>
      </Section>
      
      {/* Feed Contributions */}
      <Section title="Voermiddelen Bijdrage" icon="🌾">
        {result.supply.feeds.map((feed, index) => (
          <FeedContributionCard key={index} feed={feed} />
        ))}
        
        {result.supply.grazingSurcharge && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-green-700">🌿 Beweidingstoeslag</span>
              <span className="font-bold text-green-700">+1,175 VEM</span>
            </div>
          </div>
        )}
      </Section>
      
      {/* Totals */}
      <Section title="Totaal Aanbod" icon="📊" defaultExpanded={true}>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">Droge Stof</div>
            <div className="text-xl font-bold">{result.supply.totals.dryMatterKg.result} kg DS</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">VEM Aanbod</div>
            <div className="text-xl font-bold text-green-600">{result.supply.totals.vem.result.toLocaleString('nl-NL')} VEM</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">DVE Aanbod</div>
            <div className="text-xl font-bold text-blue-600">{result.supply.totals.dve.result.toLocaleString('nl-NL')} gram</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">OEB</div>
            <div className={`text-xl font-bold ${result.supply.totals.oeb.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {result.supply.totals.oeb.result >= 0 ? '+' : ''}{result.supply.totals.oeb.result.toLocaleString('nl-NL')} gram
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">Structuurwaarde</div>
            <div className={`text-xl font-bold ${result.supply.totals.swPerKgDs.result >= 1.0 ? 'text-green-600' : 'text-orange-600'}`}>
              {result.supply.totals.swPerKgDs.result} SW/kg DS
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">Verzadigingswaarde</div>
            <div className="text-xl font-bold">{result.supply.totals.vw.result} VW</div>
          </div>
        </div>
      </Section>
      
      {/* Balances */}
      <Section title="Voedingsbalans" icon="⚖️" defaultExpanded={true}>
        <div className="space-y-4">
          {result.balances.map((balance, index) => {
            // OEB is a threshold (≥0), not a requirement - use different labels
            const isOEB = balance.parameter === 'OEB';
            const requirementLabel = isOEB ? 'Doel:' : 'Behoefte:';
            const requirementDisplay = isOEB ? '≥ 0' : balance.requirement.toLocaleString('nl-NL');
            const coverageDisplay = isOEB 
              ? (balance.supply >= 0 ? 'Status: OK' : 'Status: Tekort')
              : `${balance.balancePercent}% dekking`;
            
            return (
              <div 
                key={index}
                className={`rounded-lg p-4 border ${
                  balance.status === 'ok' ? 'bg-green-50 border-green-200' :
                  balance.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{balance.parameter}</span>
                  <span className={`text-lg font-bold ${
                    balance.status === 'ok' ? 'text-green-700' :
                    balance.status === 'warning' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {coverageDisplay}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{requirementLabel}</span>
                    <span className="ml-2 font-medium">{requirementDisplay} {balance.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Aanbod:</span>
                    <span className="ml-2 font-medium">{balance.supply.toLocaleString('nl-NL')} {balance.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Balans:</span>
                    <span className={`ml-2 font-medium ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.balance >= 0 ? '+' : ''}{balance.balance.toLocaleString('nl-NL')} {balance.unit}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Berekening: {balance.calculation.calculation}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      
      {/* Raw Report Toggle */}
      <div className="mt-6">
        <button
          onClick={() => setShowRawReport(!showRawReport)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showRawReport ? '▼ Verberg' : '▶ Toon'} Tekst Rapport (voor kopiëren)
        </button>
        
        {showRawReport && (
          <pre className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {generateAuditReport(result)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default AuditableCalculationDisplay;
