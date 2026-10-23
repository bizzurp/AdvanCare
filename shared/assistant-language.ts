export type AssistantLanguage = 'English' | 'Tagalog' | 'Ilocano';

/** Latest recognizable user message wins; short messages inherit the conversation/preference. */
export function assistantLanguage(messages: { role: string; text: string }[], preference = 'English'): AssistantLanguage {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'user') continue;
    const t = message.text.toLowerCase();
    const ilo = /\b(anya|ania|kasano|mano|ti|dagiti|iti|ken|kadi|ak|agpa|agyaman|saan|awan|adda|mabalin|mabalinak|kayat|ayat|sakit|dugo)\b/g;
    const tl = /\b(ano|paano|magkano|ang|mga|ng|po|ako|ko|ba|gusto|salamat|hindi|may|pwede|puwede|kailangan|makahinga|dibdib)\b/g;
    const en = /\b(how|what|where|when|which|please|my|the|is|are|can|help|thank|thanks|have|need|show)\b/g;
    const scores = [t.match(ilo)?.length ?? 0, t.match(tl)?.length ?? 0, t.match(en)?.length ?? 0];
    if (scores[0]! > 0 && scores[0]! >= scores[1]! && scores[0]! >= scores[2]!) return 'Ilocano';
    if (scores[1]! > 0 && scores[1]! >= scores[2]!) return 'Tagalog';
    if (scores[2]! > 0) return 'English';
  }
  return /ilocano|ilokano/i.test(preference) ? 'Ilocano' : /tagalog|filipino/i.test(preference) ? 'Tagalog' : 'English';
}

export const safetyReplies = {
  English: {
    emergency: 'If this may be an emergency, call 911 or go to the nearest hospital now. AdvanCare is for scheduled care and cannot respond to emergencies.',
    refusal: 'I can only help with AdvanCare: our services and prices, care plans, your requests, and how to use the app. What would you like to know about those?',
  },
  Tagalog: {
    emergency: 'Kung maaaring emergency ito, tumawag sa 911 o pumunta agad sa pinakamalapit na ospital. Ang AdvanCare ay para sa nakaiskedyul na pangangalaga at hindi makakatugon sa mga emergency.',
    refusal: 'Makakatulong lang ako tungkol sa AdvanCare: mga serbisyo at presyo, mga plano, iyong mga request, at paggamit ng app. Ano ang gusto mong malaman tungkol dito?',
  },
  Ilocano: {
    emergency: 'No mabalin nga emerhensia daytoy, tumawag iti 911 wenno mapan a dagus iti kaasitgan nga ospital. Ti AdvanCare ket para iti naituding a panangaywan ken saan a makasungbat kadagiti emerhensia.',
    refusal: 'Makatulongak laeng maipapan iti AdvanCare: dagiti serbisio ken presyo, plano ti panangaywan, dagiti kiddawmo, ken panagusar iti app. Ania ti kayatmo a maammuan?',
  },
} as const;
