// Feed Quality Assessment Utilities
// Based on CVB 2025 standards and practical farm experience

export type QualityScore = 'excellent' | 'good' | 'average' | 'poor' | 'unknown';

export interface QualityAssessment {
  score: QualityScore;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  warnings: string[];
  recommendations: string[];
  impactEstimate?: string; // e.g., "-2.6 kg milk per cow"
}

/**
 * Assess grass silage quality
 */
function assessGrassSilage(vem: number, dve: number, oeb: number): QualityAssessment {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // VEM-based quality
  let score: QualityScore = 'unknown';
  if (vem >= 940) {
    score = 'excellent';
  } else if (vem >= 900) {
    score = 'good';
  } else if (vem >= 860) {
    score = 'average';
    warnings.push(`Lage energie (${vem} VEM). Verhoogt krachtvoerbehoefte.`);
  } else {
    score = 'poor';
    warnings.push(`Zeer lage energie (${vem} VEM)! Verwacht -1.5 tot -2.5 kg melk per koe.`);
    recommendations.push('Overweeg bijvoeren met energierijk ruwvoer of verhoog krachtvoer.');
  }
  
  // OEB warnings
  if (oeb < -20) {
    warnings.push(`Laag OEB (${oeb}). Eiwitbalans suboptimaal.`);
    recommendations.push('Voeg eiwitrijk krachtvoer toe (bijv. raapzaadschroot).');
  } else if (oeb > 50) {
    warnings.push(`Hoog OEB (${oeb}). Mogelijk stikstofverlies.`);
  }
  
  return {
    score,
    badge: getQualityBadge(score),
    color: getQualityColor(score),
    bgColor: getQualityBgColor(score),
    borderColor: getQualityBorderColor(score),
    warnings,
    recommendations,
    impactEstimate: score === 'poor' ? '-1.5 tot -2.5 kg melk' : score === 'average' ? '-0.5 tot -1.0 kg melk' : undefined,
  };
}

/**
 * Assess maize silage quality
 */
function assessMaizeSilage(vem: number, dve: number, oeb: number): QualityAssessment {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // VEM + OEB combined quality
  let score: QualityScore = 'unknown';
  if (vem >= 1000 && oeb > -30) {
    score = 'excellent';
  } else if (vem >= 970 && oeb > -40) {
    score = 'good';
  } else if (vem >= 940) {
    score = 'average';
    if (oeb < -40) {
      warnings.push(`Zeer laag OEB (${oeb}). Eiwitaanvulling noodzakelijk.`);
    }
  } else {
    score = 'poor';
    warnings.push(`Lage energie (${vem} VEM) voor maïs. Verwacht -1.0 tot -2.0 kg melk.`);
  }
  
  // OEB is critical for maize
  if (oeb < -50) {
    warnings.push(`Kritisch laag OEB (${oeb})! Verhoog eiwitrijk krachtvoer.`);
    recommendations.push('Voeg minimaal 2 kg eiwitrijk krachtvoer toe per koe per dag.');
  } else if (oeb < -30) {
    warnings.push(`Laag OEB (${oeb}). Eiwitbalans suboptimaal.`);
    recommendations.push('Overweeg eiwitrijk krachtvoer (raapzaadschroot, sojaschroot).');
  }
  
  return {
    score,
    badge: getQualityBadge(score),
    color: getQualityColor(score),
    bgColor: getQualityBgColor(score),
    borderColor: getQualityBorderColor(score),
    warnings,
    recommendations,
    impactEstimate: score === 'poor' ? '-1.0 tot -2.0 kg melk' : score === 'average' ? '-0.5 tot -1.0 kg melk' : undefined,
  };
}

/**
 * Main quality assessment function
 */
export function assessFeedQuality(
  productName: string,
  vem: number,
  dve: number,
  oeb: number
): QualityAssessment {
  const nameLower = productName.toLowerCase();
  
  // Grass silage
  if (nameLower.includes('gras') || nameLower.includes('grass')) {
    return assessGrassSilage(vem, dve, oeb);
  }
  
  // Maize silage
  if (nameLower.includes('maïs') || nameLower.includes('mais') || nameLower.includes('maize')) {
    return assessMaizeSilage(vem, dve, oeb);
  }
  
  // Hay (hooi)
  if (nameLower.includes('hooi') || nameLower.includes('hay')) {
    // Simple VEM-based assessment
    let score: QualityScore = 'unknown';
    if (vem >= 800) score = 'good';
    else if (vem >= 750) score = 'average';
    else score = 'poor';
    
    return {
      score,
      badge: getQualityBadge(score),
      color: getQualityColor(score),
      bgColor: getQualityBgColor(score),
      borderColor: getQualityBorderColor(score),
      warnings: score === 'poor' ? [`Lage energie (${vem} VEM) voor hooi.`] : [],
      recommendations: [],
    };
  }
  
  // Default/unknown feed type
  return {
    score: 'unknown',
    badge: 'Onbekend',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    warnings: [],
    recommendations: [],
  };
}

function getQualityBadge(score: QualityScore): string {
  switch (score) {
    case 'excellent': return 'Uitstekend';
    case 'good': return 'Goed';
    case 'average': return 'Gemiddeld';
    case 'poor': return 'Matig';
    default: return 'Onbekend';
  }
}

function getQualityColor(score: QualityScore): string {
  switch (score) {
    case 'excellent': return 'text-green-800';
    case 'good': return 'text-blue-800';
    case 'average': return 'text-yellow-800';
    case 'poor': return 'text-red-800';
    default: return 'text-gray-600';
  }
}

function getQualityBgColor(score: QualityScore): string {
  switch (score) {
    case 'excellent': return 'bg-green-50';
    case 'good': return 'bg-blue-50';
    case 'average': return 'bg-yellow-50';
    case 'poor': return 'bg-red-50';
    default: return 'bg-gray-50';
  }
}

function getQualityBorderColor(score: QualityScore): string {
  switch (score) {
    case 'excellent': return 'border-green-200';
    case 'good': return 'border-blue-200';
    case 'average': return 'border-yellow-200';
    case 'poor': return 'border-red-200';
    default: return 'border-gray-200';
  }
}
