import type {
  AssistantFollowUp,
  AssistantResult,
  FollowUpRequirement,
  ReleasedLocale,
} from './contracts.js';

export interface AssistantCapabilities {
  chart: boolean;
  houses: boolean;
  transits: boolean;
}

export type SafetyRoute = 'crisis' | 'medical' | 'legal' | 'financial' | 'deterministic' | 'moderation';

const CRISIS_RE = /\b(suicid(?:e|al|io|arme|armi|ar-me|ar)?|suic[ií]dio|kill myself|end my life|self[- ]?harm|hurt myself|don'?t want to live|(?:ya )?no quiero (?:seguir )?vivir|quiero morir|quiero matarme|matarme|je veux mourir|je ne veux plus vivre|me suicider|me tuer|non voglio (?:più )?vivere|voglio morire|uccidermi|farmi del male|quero morrer|n[aã]o quero (?:mais )?viver|quero me matar|me matar|me suicidar)\b/iu;
const MEDICAL_RE = /\b(diagnos(?:e|is)|medication|medicine dose|treatment plan|antidepressants?|stop taking (?:my )?(?:medication|medicine|pills?)|change (?:my )?dose|should i take (?:this )?(?:drug|medicine|medication)|am i pregnant|do i have (?:cancer|a disease)|diagnosticar|medicamento|antidepresivos?|traitement médical|antidépresseurs?|diagnosi|farmaco|antidepressivi?|estou grávida|tenho uma doença|antidepressivos?)\b/i;
const LEGAL_RE = /\b(legal advice|should i sue|lawsuit strategy|plead guilty|sign (?:this contract|the settlement|a settlement)|take my case to trial|accept (?:the )?plea|consejo legal|debo demandar|firmar el acuerdo|llevar mi caso a juicio|conseil juridique|signer l'accord|aller au procès|causa legale|consiglio legale|firmare l'accordo|andare a processo|aconselhamento jurídico|assinar o acordo|levar meu caso a julgamento)\b/i;
const FINANCIAL_RE = /\b(should i (?:buy|sell|invest)|which (?:stock|crypto)|investment advice|trade (?:bitcoin|stocks)|debo invertir|qué acción comprar|conseil d'investissement|investire in|devo investir|qual ação comprar)\b/i;
const DETERMINISTIC_RE = /\b(will (?:i|we|they|he|she) (?:die|get pregnant|marry|divorce|win|lose|cheat)|when(?: exactly)? will (?:i|we|they|he|she) (?:die|marry|divorce|get pregnant)|va(?:i|mos) morrer|voy a morir|vais-je mourir|morirò|me engaña|is (?:he|she|my partner|my husband|my wife|my boyfriend|my girlfriend) cheating)\b/i;

const COPY: Record<ReleasedLocale, Record<SafetyRoute | 'noCoverage', string>> = {
  en: {
    crisis: 'I’m sorry you’re carrying this. A chart is not the right tool for immediate safety. If you may act on these thoughts or are in danger, contact local emergency services now. In the US or Canada, call or text 988; elsewhere, use findahelpline.com to find a local crisis line.',
    medical: 'A birth chart cannot diagnose a condition, choose treatment, or confirm a pregnancy. Please use a qualified medical professional for that decision. I can still help you explore the feelings or symbolic themes around it without treating astrology as medical evidence.',
    legal: 'A chart cannot determine a legal decision or replace advice from a qualified lawyer. I can help frame the symbolic themes you want to reflect on, but not tell you what legal action to take.',
    financial: 'A chart is not a sound basis for an investment or trading decision. Use regulated financial information and a qualified adviser where appropriate. I can discuss astrology symbolically without predicting a market outcome.',
    deterministic: 'Astrology cannot reliably tell you that a specific event will happen or reveal another person’s private actions. It can be used as a reflective language for patterns, choices, and timing without turning those into fate.',
    moderation: 'I can’t help with that request. I can help with a general astrology question, explain a Zodiacs tool, or reflect on the placements in a chart you choose to attach.',
    noCoverage: 'I don’t have enough reviewed Zodiacs material or attached chart facts to answer that reliably. Try asking about a sign, planet, house, aspect, timing concept, or one of the site’s astrology tools.',
  },
  es: {
    crisis: 'Siento que estés pasando por esto. Una carta no es la herramienta adecuada para tu seguridad inmediata. Si podrías hacerte daño o estás en peligro, llama ahora a los servicios de emergencia de tu país. En EE. UU. o Canadá, llama o escribe al 988; en otros países, busca una línea local en findahelpline.com.',
    medical: 'Una carta natal no puede diagnosticar, elegir un tratamiento ni confirmar un embarazo. Consulta a un profesional médico cualificado. Sí puedo ayudarte a explorar los sentimientos o temas simbólicos sin presentar la astrología como evidencia médica.',
    legal: 'Una carta no puede decidir un asunto legal ni sustituir a un abogado cualificado. Puedo ayudarte a reflexionar sobre temas simbólicos, pero no decirte qué acción legal tomar.',
    financial: 'Una carta no es una base fiable para invertir o hacer operaciones financieras. Usa información regulada y asesoramiento cualificado cuando corresponda. Puedo hablar de astrología simbólicamente, sin predecir mercados.',
    deterministic: 'La astrología no puede asegurar que ocurrirá un hecho concreto ni revelar las acciones privadas de otra persona. Puede servir para reflexionar sobre patrones y elecciones sin convertirlos en destino.',
    moderation: 'No puedo ayudar con esa solicitud. Sí puedo responder una pregunta general de astrología, explicar una herramienta de Zodiacs o interpretar una carta que decidas adjuntar.',
    noCoverage: 'No tengo suficiente material revisado de Zodiacs ni datos de una carta adjunta para responder con fiabilidad. Prueba con un signo, planeta, casa, aspecto, ciclo o herramienta del sitio.',
  },
  pt: {
    crisis: 'Sinto muito que você esteja passando por isso. Um mapa não é a ferramenta certa para segurança imediata. Se houver risco de você agir ou se estiver em perigo, procure agora o serviço de emergência local. Nos EUA ou Canadá, ligue ou envie mensagem para 988; em outros países, encontre uma linha local em findahelpline.com.',
    medical: 'Um mapa astral não pode diagnosticar, escolher tratamento ou confirmar gravidez. Procure um profissional de saúde qualificado. Posso ajudar a explorar sentimentos e temas simbólicos sem tratar astrologia como evidência médica.',
    legal: 'Um mapa não pode decidir uma questão jurídica nem substituir um advogado qualificado. Posso ajudar na reflexão simbólica, mas não indicar qual ação legal tomar.',
    financial: 'Um mapa não é uma base segura para investir ou negociar. Use informações reguladas e orientação qualificada quando necessário. Posso falar de astrologia simbolicamente, sem prever o mercado.',
    deterministic: 'A astrologia não pode garantir um acontecimento específico nem revelar ações privadas de outra pessoa. Ela pode servir como linguagem de reflexão sobre padrões e escolhas, sem virar destino.',
    moderation: 'Não posso ajudar com esse pedido. Posso responder sobre astrologia em geral, explicar uma ferramenta do Zodiacs ou interpretar um mapa que você decidir anexar.',
    noCoverage: 'Não tenho material revisado do Zodiacs nem fatos de um mapa anexado suficientes para responder com segurança. Pergunte sobre um signo, planeta, casa, aspecto, ciclo ou ferramenta do site.',
  },
  fr: {
    crisis: 'Je suis désolé que vous traversiez cela. Un thème astral n’est pas l’outil adapté à votre sécurité immédiate. Si vous risquez de passer à l’acte ou êtes en danger, contactez maintenant les secours locaux. Aux États-Unis ou au Canada, appelez ou écrivez au 988 ; ailleurs, trouvez une ligne locale sur findahelpline.com.',
    medical: 'Un thème natal ne peut ni poser un diagnostic, ni choisir un traitement, ni confirmer une grossesse. Consultez un professionnel de santé qualifié. Je peux explorer les émotions ou les thèmes symboliques sans présenter l’astrologie comme une preuve médicale.',
    legal: 'Un thème ne peut pas trancher une question juridique ni remplacer un avocat qualifié. Je peux aider à réfléchir aux thèmes symboliques, mais pas indiquer quelle démarche légale suivre.',
    financial: 'Un thème n’est pas une base fiable pour investir ou négocier. Appuyez-vous sur des informations réglementées et un conseil qualifié si nécessaire. Je peux parler d’astrologie symboliquement, sans prédire les marchés.',
    deterministic: 'L’astrologie ne peut pas garantir un événement précis ni révéler les actes privés d’une autre personne. Elle peut servir de langage de réflexion sur les schémas et les choix, sans en faire un destin.',
    moderation: 'Je ne peux pas aider avec cette demande. Je peux répondre à une question générale d’astrologie, expliquer un outil Zodiacs ou interpréter un thème que vous choisissez de joindre.',
    noCoverage: 'Je n’ai pas assez de contenu Zodiacs vérifié ni de faits de thème joint pour répondre de façon fiable. Essayez une question sur un signe, une planète, une maison, un aspect, un cycle ou un outil du site.',
  },
  it: {
    crisis: 'Mi dispiace che tu stia vivendo questo. Un tema natale non è lo strumento giusto per la sicurezza immediata. Se potresti agire o sei in pericolo, contatta subito i servizi di emergenza locali. Negli Stati Uniti o in Canada chiama o scrivi al 988; altrove trova una linea locale su findahelpline.com.',
    medical: 'Un tema natale non può formulare diagnosi, scegliere cure o confermare una gravidanza. Rivolgiti a un professionista sanitario qualificato. Posso aiutarti a esplorare emozioni o temi simbolici senza trattare l’astrologia come prova medica.',
    legal: 'Un tema non può decidere una questione legale né sostituire un avvocato qualificato. Posso aiutarti a riflettere sui temi simbolici, ma non dirti quale azione legale intraprendere.',
    financial: 'Un tema non è una base affidabile per investimenti o trading. Usa informazioni regolamentate e consulenza qualificata quando serve. Posso parlare di astrologia in modo simbolico, senza prevedere i mercati.',
    deterministic: 'L’astrologia non può garantire un evento specifico né rivelare le azioni private di un’altra persona. Può essere un linguaggio di riflessione su schemi e scelte, senza trasformarli in destino.',
    moderation: 'Non posso aiutarti con questa richiesta. Posso rispondere a una domanda generale di astrologia, spiegare uno strumento Zodiacs o interpretare un tema che scegli di allegare.',
    noCoverage: 'Non ho abbastanza materiale Zodiacs verificato o fatti di un tema allegato per rispondere in modo affidabile. Prova a chiedere di un segno, pianeta, casa, aspetto, ciclo o strumento del sito.',
  },
};

const STARTERS: Record<ReleasedLocale, { plain: string[]; chart: string[]; houses: string[] }> = {
  en: {
    plain: ['What is the difference between my Sun, Moon, and rising sign?', 'How should I start reading a birth chart?'],
    chart: ['What is the strongest pattern in this chart?', 'Where does this chart show growth through pressure?'],
    houses: ['Which houses carry the most emphasis here?', 'How do the strongest placements work together?'],
  },
  es: {
    plain: ['¿Qué diferencia hay entre Sol, Luna y ascendente?', '¿Por dónde empiezo a leer una carta natal?'],
    chart: ['¿Cuál es el patrón más fuerte de esta carta?', '¿Dónde muestra crecimiento a través de la presión?'],
    houses: ['¿Qué casas tienen más énfasis?', '¿Cómo funcionan juntas las posiciones más fuertes?'],
  },
  pt: {
    plain: ['Qual é a diferença entre Sol, Lua e ascendente?', 'Por onde começo a ler um mapa astral?'],
    chart: ['Qual é o padrão mais forte deste mapa?', 'Onde este mapa mostra crescimento por meio da pressão?'],
    houses: ['Quais casas recebem mais ênfase?', 'Como as posições mais fortes trabalham juntas?'],
  },
  fr: {
    plain: ['Quelle différence entre le Soleil, la Lune et l’ascendant ?', 'Par où commencer pour lire un thème natal ?'],
    chart: ['Quel est le schéma le plus fort de ce thème ?', 'Où ce thème montre-t-il une croissance sous pression ?'],
    houses: ['Quelles maisons sont les plus accentuées ?', 'Comment les placements les plus forts fonctionnent-ils ensemble ?'],
  },
  it: {
    plain: ['Qual è la differenza tra Sole, Luna e ascendente?', 'Da dove comincio a leggere un tema natale?'],
    chart: ['Qual è lo schema più forte di questo tema?', 'Dove mostra crescita attraverso la pressione?'],
    houses: ['Quali case hanno più enfasi?', 'Come lavorano insieme le posizioni più forti?'],
  },
};

export function defaultFollowUps(
  locale: ReleasedLocale,
  capabilities: AssistantCapabilities,
): AssistantFollowUp[] {
  const kind = capabilities.houses ? 'houses' : capabilities.chart ? 'chart' : 'plain';
  const requires: FollowUpRequirement = capabilities.houses
    ? 'houses'
    : capabilities.chart
      ? 'chart'
      : 'none';
  return STARTERS[locale][kind].slice(0, 2).map((question) => ({
    question,
    requires,
    factIds: [],
    sourceIds: [],
  }));
}

export function classifySafetyRoute(text: string): Exclude<SafetyRoute, 'moderation'> | null {
  if (CRISIS_RE.test(text)) return 'crisis';
  if (MEDICAL_RE.test(text)) return 'medical';
  if (LEGAL_RE.test(text)) return 'legal';
  if (FINANCIAL_RE.test(text)) return 'financial';
  if (DETERMINISTIC_RE.test(text)) return 'deterministic';
  return null;
}

export function routedResult(
  route: SafetyRoute,
  locale: ReleasedLocale,
  capabilities: AssistantCapabilities,
): AssistantResult {
  return {
    answer: COPY[locale][route],
    receipts: [],
    // An acute safety or moderation response should leave one clear action,
    // not pivot immediately into chart prompts that compete for attention.
    followUps: route === 'crisis' || route === 'moderation'
      ? []
      : defaultFollowUps(locale, capabilities),
  };
}

export function noCoverageResult(
  locale: ReleasedLocale,
  capabilities: AssistantCapabilities,
): AssistantResult {
  return {
    answer: COPY[locale].noCoverage,
    receipts: [],
    followUps: defaultFollowUps(locale, capabilities),
  };
}
