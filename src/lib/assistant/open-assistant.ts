/**
 * Ask Zodiacs browser client. The same framework-free surface mounts inline on
 * /ask/ and in the lazy dialog used elsewhere. Birth inputs are used only for
 * local chart calculation; the v2 request carries a positions-only token,
 * retrograde body names, and (when available) house cusps.
 */
import './assistant.css';
import { houseOf, wholeSignCusps } from '../engine/houses';
import { ENGINE_VERSION, type BodyName } from '../engine/types';
import { normalizeLocale as normalizeSiteLocale, type ReleasedLocale as Locale } from '../i18n/core';
import {
  appendAssistantCompletedTurn,
  assistantMemoryLimitCode,
  clearAssistantSession,
  createAssistantSessionThread,
  deleteAllAssistantThreads,
  deleteAssistantThread,
  enableAssistantMemoryAndImportSession,
  getAssistantMemoryOptIn,
  importAssistantSession,
  listAssistantThreads,
  loadAssistantSession,
  onAssistantMemoryAuthChange,
  onAssistantMemoryChange,
  saveAssistantCompletedTurn,
  saveAssistantSession,
  setAssistantMemoryOptIn,
  type AssistantMemoryThread,
  type AssistantVisibleTurn,
} from './memory';
import { PROFILE_KEY } from '../profile/schema';
import { encodePositionsLink, POSITION_BODY_ORDER } from '../share-positions';
import { degreeInSign, signForLongitude } from '../signs';

export type AssistantLocale = Locale;

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredBody {
  body: BodyName;
  lon: number;
  retrograde: boolean;
}

export interface StoredChart {
  id: string;
  name: string;
  updatedAt: string;
  birth: {
    date: string;
    time: string | null;
    timeKnown: boolean;
    place: { lat: number; lon: number; tz: string } | null;
  };
  summary: {
    engineVersion: string;
    houseSystem: 'whole' | 'placidus';
    bodies: StoredBody[];
    angles: { asc: number; mc: number } | null;
  };
}

type FollowUpRequirement = 'none' | 'chart' | 'houses' | 'transits';

export interface AssistantChartPayload {
  positionsToken: string;
  retrogradeBodies: BodyName[];
  cusps?: number[];
}

interface AssistantCapabilities {
  chart: boolean;
  houses: boolean;
  transits: boolean;
}

interface CanonicalSource {
  id: string;
  path: string;
  title: string;
  heading?: string;
}

interface GuideReceipt {
  label: string;
  factIds: string[];
  sourceIds: string[];
  sources: CanonicalSource[];
}

interface GuideFollowUp {
  question: string;
  requires: FollowUpRequirement;
  factIds: string[];
  sourceIds: string[];
}

export interface AssistantGuideMeta {
  capabilities: AssistantCapabilities;
  receipts: GuideReceipt[];
  followUps: GuideFollowUp[];
}

export interface PreparedAssistantChart {
  payload: AssistantChartPayload;
  placementPreview: string;
  capabilities: { chart: true; houses: boolean; transits: boolean };
}

interface Copy {
  title: string;
  close: string;
  intro: string;
  log: string;
  input: string;
  placeholder: string;
  send: string;
  stop: string;
  newline: string;
  startersLabel: string;
  noChartStarters: string[];
  chartStarters: string[];
  chartStartersNoTime: string[];
  chartLabel: string;
  chartChoose: string;
  chartNone: string;
  chartAttach: string;
  chartAttached: string;
  chartUnavailable: string;
  chartReading: string;
  thinking: string;
  stopped: string;
  complete: string;
  empty: string;
  maintenance: string;
  quotaUnavailable: string;
  visitorLimit: string;
  serviceBudget: string;
  providerUnavailable: string;
  invalidRequest: string;
  safetyRouting: string;
  retry: string;
  user: string;
  assistant: string;
  privacy: string;
  privacyLink: string;
  consentTitle: string;
  consentBody: string;
  consentExact: string;
  consentConfirm: string;
  consentCancel: string;
  evidence: string;
  nextQuestions: string;
  remember: string;
  rememberConfirmTitle: string;
  rememberConfirmBody: string;
  rememberConfirm: string;
  memorySignedOut: string;
  memorySavedUntil: string;
  memorySettings: string;
  memoryThreads: string;
  memoryOpen: string;
  memoryDelete: string;
  memoryDeleteAll: string;
  memoryOptOut: string;
  memorySessionOnly: string;
  memoryFailed: string;
  memoryThreadLimit: string;
  memoryThreadTurnLimit: string;
  memoryTotalTurnLimit: string;
  memoryDeleted: string;
  memoryEmpty: string;
  clearSession: string;
}

interface AuthSnapshot {
  epoch: number;
  userId: string | null;
}

const COPY: Record<AssistantLocale, Copy> = {
  en: {
    title: 'Ask Zodiacs — your chart guide', close: 'Close Ask Zodiacs',
    intro: 'A reflective guide to astrology and your chart, grounded in Zodiacs sources and calculated chart facts.',
    log: 'Conversation', input: 'Your question', placeholder: 'Ask about a placement, pattern, or Zodiacs guide…',
    send: 'Ask', stop: 'Stop', newline: 'Shift + Enter for a new line', startersLabel: 'Try asking',
    noChartStarters: [
      'Where should I begin with astrology?',
      'What do the Sun, Moon, and Rising each describe?',
      'Which Zodiacs tool should I use?',
      'How do I read a birth chart without getting lost?',
    ],
    chartStarters: [
      'What do my Sun, Moon, and Rising say together?',
      'What is the strongest pattern in my chart?',
      'Where does my chart show growth through pressure?',
      'What themes are active for me right now?',
    ],
    chartStartersNoTime: [
      'What do my Sun and Moon say together?',
      'What is the strongest pattern in my chart?',
      'Where does my chart show growth through pressure?',
      'What themes are active for me right now?',
    ],
    chartLabel: 'Chart context', chartChoose: 'Choose a saved chart', chartNone: 'No saved charts on this device',
    chartAttach: 'Attach selected chart', chartAttached: 'Chart attached',
    chartUnavailable: 'This saved chart needs to be recalculated before it can be attached.',
    chartReading: 'Calculating chart facts on this device…', thinking: 'Reading the available facts and guides…',
    stopped: 'Stopped. The partial answer was not saved.', complete: 'Answer complete.', empty: 'Write a question first.',
    maintenance: 'Ask Zodiacs is resting for maintenance. Please try again later.',
    quotaUnavailable: 'The private quota check is unavailable, so no model request was made. Please retry shortly.',
    visitorLimit: 'You have reached today’s limit of 10 questions. Try again after 00:00 UTC.',
    serviceBudget: 'Ask Zodiacs has reached today’s service budget. The site guides are still available.',
    providerUnavailable: 'OpenAI did not return an answer. Your question was not saved; please retry.',
    invalidRequest: 'That request could not be sent safely. Refresh the page and try again.',
    safetyRouting: 'Astrology can offer reflection here, not a diagnosis, professional advice, or a certain prediction.',
    retry: 'Retry', user: 'You', assistant: 'Zodiacs',
    privacy: 'Session chats stay in this tab and are not stored by Zodiacs. Messages and any chart facts you attach are sent transiently to OpenAI; abuse-monitoring retention may still apply. Astrology is symbolic, not deterministic.', privacyLink: 'Privacy',
    consentTitle: 'Review the chart facts before attaching',
    consentBody: 'Only the exact positions-only object below will accompany your messages. Your saved name, chart ID, birth date, time, place, and coordinates are not included.',
    consentExact: 'Exact chart payload sent to OpenAI', consentConfirm: 'Attach these facts', consentCancel: 'Keep chart private',
    evidence: 'Evidence', nextQuestions: 'Useful next questions', remember: 'Remember this conversation for 90 days',
    rememberConfirmTitle: 'Remember this conversation?',
    rememberConfirmBody: 'Zodiacs will save completed visible questions and answers to your account for 90 days from today. The expiry will not be extended. Partial or failed answers are never saved.',
    rememberConfirm: 'Remember for 90 days', memorySignedOut: 'Sign in to remember conversations across devices.',
    memorySavedUntil: 'Remembered until', memorySettings: 'Conversation memory', memoryThreads: 'Remembered conversations',
    memoryOpen: 'Open', memoryDelete: 'Delete this conversation', memoryDeleteAll: 'Delete all remembered conversations',
    memoryOptOut: 'Turn off memory and delete all', memorySessionOnly: 'Session only — clears when this browser session ends.',
    memoryFailed: 'The account copy failed. This tab still has the conversation.', memoryDeleted: 'Remembered conversation deleted.',
    memoryThreadLimit: 'You have 20 remembered conversations. Delete one before remembering another; this tab still has the conversation.',
    memoryThreadTurnLimit: 'This remembered conversation has reached 100 turns. Start a new conversation; this tab still has the completed answer.',
    memoryTotalTurnLimit: 'Account memory has reached 500 turns. Delete remembered conversations before trying again; this tab still has the conversation.',
    memoryEmpty: 'No remembered conversations.', clearSession: 'Start a new session conversation',
  },
  es: {
    title: 'Pregunta a Zodiacs — tu guía de la carta', close: 'Cerrar Pregunta a Zodiacs',
    intro: 'Una guía reflexiva de astrología y de tu carta, basada en fuentes de Zodiacs y datos calculados.',
    log: 'Conversación', input: 'Tu pregunta', placeholder: 'Pregunta por una posición, un patrón o una guía…',
    send: 'Preguntar', stop: 'Detener', newline: 'Mayús + Intro para una línea nueva', startersLabel: 'Puedes preguntar',
    noChartStarters: ['¿Por dónde empiezo con la astrología?', '¿Qué describen el Sol, la Luna y el Ascendente?', '¿Qué herramienta de Zodiacs debería usar?', '¿Cómo leo una carta natal sin perderme?'],
    chartStarters: ['¿Qué dicen juntos mi Sol, Luna y Ascendente?', '¿Cuál es el patrón más fuerte de mi carta?', '¿Dónde muestra mi carta crecimiento a través de la presión?', '¿Qué temas están activos para mí ahora?'],
    chartStartersNoTime: ['¿Qué dicen juntos mi Sol y mi Luna?', '¿Cuál es el patrón más fuerte de mi carta?', '¿Dónde muestra mi carta crecimiento a través de la presión?', '¿Qué temas están activos para mí ahora?'],
    chartLabel: 'Contexto de la carta', chartChoose: 'Elige una carta guardada', chartNone: 'No hay cartas guardadas en este dispositivo',
    chartAttach: 'Adjuntar la carta elegida', chartAttached: 'Carta adjunta', chartUnavailable: 'Vuelve a calcular esta carta antes de adjuntarla.',
    chartReading: 'Calculando datos de la carta en este dispositivo…', thinking: 'Leyendo los datos y las guías disponibles…',
    stopped: 'Detenido. La respuesta parcial no se guardó.', complete: 'Respuesta completa.', empty: 'Escribe una pregunta primero.',
    maintenance: 'Pregunta a Zodiacs está en mantenimiento. Inténtalo más tarde.', quotaUnavailable: 'La comprobación privada del límite no está disponible; no se hizo ninguna solicitud al modelo.',
    visitorLimit: 'Has alcanzado el límite de 10 preguntas de hoy. Inténtalo después de las 00:00 UTC.', serviceBudget: 'Pregunta a Zodiacs alcanzó el presupuesto de hoy. Las guías siguen disponibles.',
    providerUnavailable: 'OpenAI no devolvió una respuesta. Tu pregunta no se guardó; inténtalo de nuevo.', invalidRequest: 'La solicitud no se pudo enviar de forma segura. Actualiza la página.',
    safetyRouting: 'La astrología puede servir para reflexionar, no para diagnosticar, sustituir consejo profesional ni predecir con certeza.', retry: 'Reintentar',
    user: 'Tú', assistant: 'Zodiacs', privacy: 'Los chats de sesión permanecen en esta pestaña y Zodiacs no los guarda. Los mensajes y los datos de carta que adjuntes se envían transitoriamente a OpenAI; puede aplicarse retención para prevenir abusos. La astrología es simbólica, no determinista.', privacyLink: 'Privacidad',
    consentTitle: 'Revisa los datos antes de adjuntarlos', consentBody: 'Solo el objeto exacto de posiciones que aparece abajo acompañará tus mensajes. No incluye el nombre, ID, fecha, hora, lugar ni coordenadas guardadas.',
    consentExact: 'Datos exactos enviados a OpenAI', consentConfirm: 'Adjuntar estos datos', consentCancel: 'Mantener privada la carta', evidence: 'Evidencia', nextQuestions: 'Próximas preguntas útiles',
    remember: 'Recordar esta conversación durante 90 días', rememberConfirmTitle: '¿Recordar esta conversación?', rememberConfirmBody: 'Zodiacs guardará en tu cuenta durante 90 días las preguntas y respuestas visibles y completas. La fecha no se prolonga. Las respuestas parciales o fallidas nunca se guardan.',
    rememberConfirm: 'Recordar 90 días', memorySignedOut: 'Inicia sesión para recordar conversaciones entre dispositivos.', memorySavedUntil: 'Guardada hasta', memorySettings: 'Memoria de conversación', memoryThreads: 'Conversaciones recordadas',
    memoryOpen: 'Abrir', memoryDelete: 'Borrar esta conversación', memoryDeleteAll: 'Borrar todas las conversaciones', memoryOptOut: 'Desactivar y borrar todo', memorySessionOnly: 'Solo esta sesión; se borra al terminar la sesión del navegador.',
    memoryFailed: 'Falló la copia de la cuenta. La conversación sigue en esta pestaña.', memoryDeleted: 'Conversación recordada eliminada.', memoryEmpty: 'No hay conversaciones recordadas.', clearSession: 'Iniciar una conversación nueva',
    memoryThreadLimit: 'Tienes 20 conversaciones recordadas. Borra una antes de guardar otra; esta pestaña conserva la conversación.', memoryThreadTurnLimit: 'Esta conversación llegó a 100 turnos. Inicia una nueva; esta pestaña conserva la respuesta completa.', memoryTotalTurnLimit: 'La memoria de la cuenta llegó a 500 turnos. Borra conversaciones recordadas antes de volver a intentarlo.',
  },
  pt: {
    title: 'Pergunte ao Zodiacs — seu guia do mapa', close: 'Fechar Pergunte ao Zodiacs',
    intro: 'Um guia reflexivo de astrologia e do seu mapa, baseado em fontes do Zodiacs e fatos calculados.',
    log: 'Conversa', input: 'Sua pergunta', placeholder: 'Pergunte sobre uma posição, padrão ou guia…', send: 'Perguntar', stop: 'Parar', newline: 'Shift + Enter para nova linha', startersLabel: 'Experimente perguntar',
    noChartStarters: ['Por onde começo na astrologia?', 'O que Sol, Lua e Ascendente descrevem?', 'Qual ferramenta do Zodiacs devo usar?', 'Como leio um mapa astral sem me perder?'],
    chartStarters: ['O que meu Sol, Lua e Ascendente dizem juntos?', 'Qual é o padrão mais forte no meu mapa?', 'Onde meu mapa mostra crescimento através da pressão?', 'Quais temas estão ativos para mim agora?'],
    chartStartersNoTime: ['O que meu Sol e minha Lua dizem juntos?', 'Qual é o padrão mais forte no meu mapa?', 'Onde meu mapa mostra crescimento através da pressão?', 'Quais temas estão ativos para mim agora?'],
    chartLabel: 'Contexto do mapa', chartChoose: 'Escolha um mapa salvo', chartNone: 'Nenhum mapa salvo neste dispositivo', chartAttach: 'Anexar mapa escolhido', chartAttached: 'Mapa anexado', chartUnavailable: 'Recalcule este mapa antes de anexá-lo.',
    chartReading: 'Calculando fatos do mapa neste dispositivo…', thinking: 'Lendo os fatos e guias disponíveis…', stopped: 'Interrompido. A resposta parcial não foi salva.', complete: 'Resposta concluída.', empty: 'Escreva uma pergunta primeiro.',
    maintenance: 'Pergunte ao Zodiacs está em manutenção. Tente mais tarde.', quotaUnavailable: 'A verificação privada de limite está indisponível; nenhuma solicitação foi feita ao modelo.', visitorLimit: 'Você atingiu o limite de 10 perguntas de hoje. Tente após 00:00 UTC.', serviceBudget: 'O orçamento diário foi atingido. Os guias continuam disponíveis.',
    providerUnavailable: 'A OpenAI não retornou uma resposta. Sua pergunta não foi salva; tente novamente.', invalidRequest: 'A solicitação não pôde ser enviada com segurança. Atualize a página.', safetyRouting: 'A astrologia pode apoiar reflexão, não diagnóstico, aconselhamento profissional ou previsão certa.', retry: 'Tentar novamente',
    user: 'Você', assistant: 'Zodiacs', privacy: 'Os chats da sessão ficam nesta aba e não são armazenados pelo Zodiacs. Mensagens e fatos do mapa anexados são enviados transitoriamente à OpenAI; pode haver retenção para monitorar abuso. A astrologia é simbólica, não determinista.', privacyLink: 'Privacidade',
    consentTitle: 'Revise os fatos antes de anexar', consentBody: 'Somente o objeto exato de posições abaixo acompanhará suas mensagens. Nome, ID, data, hora, local e coordenadas salvos não são incluídos.', consentExact: 'Dados exatos enviados à OpenAI', consentConfirm: 'Anexar estes fatos', consentCancel: 'Manter o mapa privado', evidence: 'Evidências', nextQuestions: 'Próximas perguntas úteis',
    remember: 'Lembrar esta conversa por 90 dias', rememberConfirmTitle: 'Lembrar esta conversa?', rememberConfirmBody: 'O Zodiacs salvará perguntas e respostas visíveis e concluídas na sua conta por 90 dias. O prazo não será prorrogado. Respostas parciais ou com falha nunca são salvas.', rememberConfirm: 'Lembrar por 90 dias', memorySignedOut: 'Entre na conta para lembrar conversas entre dispositivos.', memorySavedUntil: 'Lembrada até', memorySettings: 'Memória da conversa', memoryThreads: 'Conversas lembradas', memoryOpen: 'Abrir', memoryDelete: 'Excluir esta conversa', memoryDeleteAll: 'Excluir todas as conversas', memoryOptOut: 'Desativar memória e excluir tudo', memorySessionOnly: 'Somente nesta sessão; limpa ao encerrar a sessão do navegador.', memoryFailed: 'A cópia da conta falhou. Esta aba ainda tem a conversa.', memoryThreadLimit: 'Você tem 20 conversas lembradas. Exclua uma antes de salvar outra; esta aba mantém a conversa.', memoryThreadTurnLimit: 'Esta conversa chegou a 100 turnos. Inicie uma nova; esta aba mantém a resposta concluída.', memoryTotalTurnLimit: 'A memória da conta chegou a 500 turnos. Exclua conversas lembradas antes de tentar novamente.', memoryDeleted: 'Conversa lembrada excluída.', memoryEmpty: 'Nenhuma conversa lembrada.', clearSession: 'Iniciar nova conversa',
  },
  fr: {
    title: 'Demander à Zodiacs — votre guide du thème', close: 'Fermer Demander à Zodiacs',
    intro: 'Un guide réflexif de l’astrologie et de votre thème, fondé sur les sources de Zodiacs et des faits calculés.',
    log: 'Conversation', input: 'Votre question', placeholder: 'Posez une question sur une position, un motif ou un guide…', send: 'Demander', stop: 'Arrêter', newline: 'Maj + Entrée pour une nouvelle ligne', startersLabel: 'Questions possibles',
    noChartStarters: ['Par où commencer avec l’astrologie ?', 'Que décrivent le Soleil, la Lune et l’Ascendant ?', 'Quel outil Zodiacs choisir ?', 'Comment lire un thème natal sans se perdre ?'],
    chartStarters: ['Que disent ensemble mon Soleil, ma Lune et mon Ascendant ?', 'Quel est le motif le plus fort de mon thème ?', 'Où mon thème montre-t-il une croissance sous pression ?', 'Quels thèmes sont actifs pour moi maintenant ?'],
    chartStartersNoTime: ['Que disent ensemble mon Soleil et ma Lune ?', 'Quel est le motif le plus fort de mon thème ?', 'Où mon thème montre-t-il une croissance sous pression ?', 'Quels thèmes sont actifs pour moi maintenant ?'],
    chartLabel: 'Contexte du thème', chartChoose: 'Choisissez un thème enregistré', chartNone: 'Aucun thème enregistré sur cet appareil', chartAttach: 'Joindre le thème choisi', chartAttached: 'Thème joint', chartUnavailable: 'Recalculez ce thème avant de le joindre.',
    chartReading: 'Calcul des faits du thème sur cet appareil…', thinking: 'Lecture des faits et des guides disponibles…', stopped: 'Interrompu. La réponse partielle n’a pas été enregistrée.', complete: 'Réponse terminée.', empty: 'Écrivez d’abord une question.',
    maintenance: 'Demander à Zodiacs est en maintenance. Réessayez plus tard.', quotaUnavailable: 'La vérification privée du quota est indisponible ; aucune demande n’a été envoyée au modèle.', visitorLimit: 'Vous avez atteint la limite de 10 questions du jour. Réessayez après 00:00 UTC.', serviceBudget: 'Le budget du jour est atteint. Les guides restent disponibles.', providerUnavailable: 'OpenAI n’a pas renvoyé de réponse. Votre question n’a pas été enregistrée ; réessayez.', invalidRequest: 'Cette demande n’a pas pu être envoyée en toute sécurité. Actualisez la page.', safetyRouting: 'L’astrologie peut soutenir une réflexion, pas établir un diagnostic, remplacer un professionnel ou prédire avec certitude.', retry: 'Réessayer',
    user: 'Vous', assistant: 'Zodiacs', privacy: 'Les discussions de session restent dans cet onglet et ne sont pas stockées par Zodiacs. Les messages et faits du thème joints sont envoyés transitoirement à OpenAI ; une conservation anti-abus peut s’appliquer. L’astrologie est symbolique, non déterministe.', privacyLink: 'Confidentialité',
    consentTitle: 'Vérifiez les faits avant de joindre le thème', consentBody: 'Seul l’objet exact de positions ci-dessous accompagnera vos messages. Il ne contient ni nom, ni ID, ni date, heure, lieu ou coordonnées enregistrés.', consentExact: 'Données exactes envoyées à OpenAI', consentConfirm: 'Joindre ces faits', consentCancel: 'Garder le thème privé', evidence: 'Éléments vérifiés', nextQuestions: 'Questions utiles à poursuivre',
    remember: 'Mémoriser cette conversation pendant 90 jours', rememberConfirmTitle: 'Mémoriser cette conversation ?', rememberConfirmBody: 'Zodiacs enregistrera dans votre compte les questions et réponses visibles et terminées pendant 90 jours. L’échéance ne sera pas prolongée. Les réponses partielles ou échouées ne sont jamais enregistrées.', rememberConfirm: 'Mémoriser 90 jours', memorySignedOut: 'Connectez-vous pour retrouver les conversations sur vos appareils.', memorySavedUntil: 'Mémorisée jusqu’au', memorySettings: 'Mémoire de la conversation', memoryThreads: 'Conversations mémorisées', memoryOpen: 'Ouvrir', memoryDelete: 'Supprimer cette conversation', memoryDeleteAll: 'Supprimer toutes les conversations', memoryOptOut: 'Désactiver et tout supprimer', memorySessionOnly: 'Session seulement ; effacée à la fin de la session du navigateur.', memoryFailed: 'La copie du compte a échoué. Cet onglet conserve la conversation.', memoryThreadLimit: 'Vous avez 20 conversations mémorisées. Supprimez-en une avant d’en enregistrer une autre ; cet onglet conserve la conversation.', memoryThreadTurnLimit: 'Cette conversation a atteint 100 tours. Commencez-en une nouvelle ; cet onglet conserve la réponse terminée.', memoryTotalTurnLimit: 'La mémoire du compte a atteint 500 tours. Supprimez des conversations mémorisées avant de réessayer.', memoryDeleted: 'Conversation mémorisée supprimée.', memoryEmpty: 'Aucune conversation mémorisée.', clearSession: 'Commencer une nouvelle conversation',
  },
  it: {
    title: 'Chiedi a Zodiacs — la tua guida al tema', close: 'Chiudi Chiedi a Zodiacs',
    intro: 'Una guida riflessiva all’astrologia e al tuo tema, basata sulle fonti Zodiacs e su dati calcolati.',
    log: 'Conversazione', input: 'La tua domanda', placeholder: 'Chiedi di una posizione, uno schema o una guida…', send: 'Chiedi', stop: 'Interrompi', newline: 'Maiusc + Invio per una nuova riga', startersLabel: 'Prova a chiedere',
    noChartStarters: ['Da dove comincio con l’astrologia?', 'Che cosa descrivono Sole, Luna e Ascendente?', 'Quale strumento Zodiacs dovrei usare?', 'Come leggo un tema natale senza perdermi?'],
    chartStarters: ['Che cosa dicono insieme Sole, Luna e Ascendente?', 'Qual è lo schema più forte nel mio tema?', 'Dove mostra il mio tema una crescita attraverso la pressione?', 'Quali temi sono attivi per me adesso?'],
    chartStartersNoTime: ['Che cosa dicono insieme il mio Sole e la mia Luna?', 'Qual è lo schema più forte nel mio tema?', 'Dove mostra il mio tema una crescita attraverso la pressione?', 'Quali temi sono attivi per me adesso?'],
    chartLabel: 'Contesto del tema', chartChoose: 'Scegli un tema salvato', chartNone: 'Nessun tema salvato su questo dispositivo', chartAttach: 'Allega il tema scelto', chartAttached: 'Tema allegato', chartUnavailable: 'Ricalcola questo tema prima di allegarlo.', chartReading: 'Calcolo dei dati del tema su questo dispositivo…', thinking: 'Lettura dei dati e delle guide disponibili…', stopped: 'Interrotto. La risposta parziale non è stata salvata.', complete: 'Risposta completata.', empty: 'Scrivi prima una domanda.',
    maintenance: 'Chiedi a Zodiacs è in manutenzione. Riprova più tardi.', quotaUnavailable: 'Il controllo privato del limite non è disponibile; non è stata inviata alcuna richiesta al modello.', visitorLimit: 'Hai raggiunto il limite di 10 domande di oggi. Riprova dopo le 00:00 UTC.', serviceBudget: 'Il budget giornaliero è stato raggiunto. Le guide restano disponibili.', providerUnavailable: 'OpenAI non ha restituito una risposta. La domanda non è stata salvata; riprova.', invalidRequest: 'La richiesta non può essere inviata in sicurezza. Aggiorna la pagina.', safetyRouting: 'L’astrologia può offrire riflessione, non diagnosi, consulenza professionale o previsioni certe.', retry: 'Riprova',
    user: 'Tu', assistant: 'Zodiacs', privacy: 'Le chat di sessione restano in questa scheda e non vengono archiviate da Zodiacs. Messaggi e dati del tema allegati vengono inviati temporaneamente a OpenAI; può applicarsi la conservazione anti-abuso. L’astrologia è simbolica, non deterministica.', privacyLink: 'Privacy', consentTitle: 'Controlla i dati prima di allegarli', consentBody: 'Solo l’oggetto esatto delle posizioni qui sotto accompagnerà i messaggi. Non include nome, ID, data, ora, luogo o coordinate salvati.', consentExact: 'Dati esatti inviati a OpenAI', consentConfirm: 'Allega questi dati', consentCancel: 'Mantieni privato il tema', evidence: 'Evidenze', nextQuestions: 'Prossime domande utili', remember: 'Ricorda questa conversazione per 90 giorni', rememberConfirmTitle: 'Ricordare questa conversazione?', rememberConfirmBody: 'Zodiacs salverà nel tuo account domande e risposte visibili e complete per 90 giorni. La scadenza non sarà estesa. Le risposte parziali o fallite non vengono mai salvate.', rememberConfirm: 'Ricorda per 90 giorni', memorySignedOut: 'Accedi per ricordare le conversazioni tra dispositivi.', memorySavedUntil: 'Ricordata fino al', memorySettings: 'Memoria della conversazione', memoryThreads: 'Conversazioni ricordate', memoryOpen: 'Apri', memoryDelete: 'Elimina questa conversazione', memoryDeleteAll: 'Elimina tutte le conversazioni', memoryOptOut: 'Disattiva e cancella tutto', memorySessionOnly: 'Solo sessione; si cancella alla fine della sessione del browser.', memoryFailed: 'La copia nell’account non è riuscita. La conversazione resta in questa scheda.', memoryThreadLimit: 'Hai 20 conversazioni ricordate. Eliminane una prima di salvarne un’altra; questa scheda conserva la conversazione.', memoryThreadTurnLimit: 'Questa conversazione ha raggiunto 100 turni. Iniziane una nuova; questa scheda conserva la risposta completa.', memoryTotalTurnLimit: 'La memoria dell’account ha raggiunto 500 turni. Elimina conversazioni ricordate prima di riprovare.', memoryDeleted: 'Conversazione ricordata eliminata.', memoryEmpty: 'Nessuna conversazione ricordata.', clearSession: 'Inizia una nuova conversazione',
  },
};

const MAX_INPUT = 1_200;
const MAX_PRIOR_TURNS = 6;
const STYLESHEET_HREF = '/assets/assistant-ui.css';
const SOURCE_PATH_RE = /^\/$|^\/[a-z0-9][a-z0-9/_-]*\/$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const REQUIREMENTS = new Set<FollowUpRequirement>(['none', 'chart', 'houses', 'transits']);
let stylesheetPromise: Promise<void> | null = null;

class AssistantFailure extends Error {
  constructor(public code: string, public retryable = false) { super(code); }
}

function normalizeLocale(value?: string): AssistantLocale {
  return normalizeSiteLocale(value ?? document.documentElement.lang);
}

function ensureStylesheet(): Promise<void> {
  if (stylesheetPromise) return stylesheetPromise;
  const existing = document.querySelector<HTMLLinkElement>(`link[href="${STYLESHEET_HREF}"]`);
  const link = existing ?? document.createElement('link');
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = STYLESHEET_HREF;
    link.dataset.assistantStyles = '';
  }
  stylesheetPromise = new Promise((resolve) => {
    if (link.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
  if (!existing) document.head.appendChild(link);
  return stylesheetPromise;
}

function track(name: string): void {
  (window as unknown as { zodiacsAnalytics?: { track?: (event: string) => void } })
    .zodiacsAnalytics?.track?.(name);
}

function finiteLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
}

function isBodyName(value: unknown): value is BodyName {
  return typeof value === 'string' && (POSITION_BODY_ORDER as readonly string[]).includes(value);
}

function parseStoredChart(value: unknown): StoredChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const rawBirth = candidate.birth;
  const rawSummary = candidate.summary;
  if (typeof candidate.id !== 'string' || !candidate.id
    || !rawBirth || typeof rawBirth !== 'object' || Array.isArray(rawBirth)
    || !rawSummary || typeof rawSummary !== 'object' || Array.isArray(rawSummary)) return null;
  const birth = rawBirth as Record<string, unknown>;
  const summary = rawSummary as Record<string, unknown>;
  const bodies = Array.isArray(summary.bodies)
    ? summary.bodies.flatMap((item): StoredBody[] => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const body = item as Record<string, unknown>;
        return isBodyName(body.body) && finiteLongitude(body.lon)
          ? [{ body: body.body, lon: body.lon, retrograde: body.retrograde === true }]
          : [];
      })
    : [];
  if (!bodies.length || new Set(bodies.map((body) => body.body)).size !== bodies.length) return null;
  let angles: StoredChart['summary']['angles'] = null;
  if (summary.angles && typeof summary.angles === 'object' && !Array.isArray(summary.angles)) {
    const rawAngles = summary.angles as Record<string, unknown>;
    if (finiteLongitude(rawAngles.asc) && finiteLongitude(rawAngles.mc)) angles = { asc: rawAngles.asc, mc: rawAngles.mc };
  }
  let place: StoredChart['birth']['place'] = null;
  if (birth.place && typeof birth.place === 'object' && !Array.isArray(birth.place)) {
    const rawPlace = birth.place as Record<string, unknown>;
    if (typeof rawPlace.lat === 'number' && Number.isFinite(rawPlace.lat)
      && typeof rawPlace.lon === 'number' && Number.isFinite(rawPlace.lon)
      && typeof rawPlace.tz === 'string' && rawPlace.tz.trim()) {
      place = { lat: rawPlace.lat, lon: rawPlace.lon, tz: rawPlace.tz };
    }
  }
  return {
    id: candidate.id,
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Saved chart',
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
    birth: {
      date: typeof birth.date === 'string' ? birth.date : '',
      time: typeof birth.time === 'string' ? birth.time : null,
      timeKnown: birth.timeKnown === true,
      place,
    },
    summary: {
      engineVersion: typeof summary.engineVersion === 'string' && summary.engineVersion ? summary.engineVersion : ENGINE_VERSION,
      houseSystem: summary.houseSystem === 'placidus' ? 'placidus' : 'whole',
      bodies,
      angles,
    },
  };
}

/** Parse all saved charts. The caller must make an explicit selection. */
export function savedChartsFromJson(raw: string | null): StoredChart[] {
  if (!raw) return [];
  try {
    const profile = JSON.parse(raw) as { version?: unknown; charts?: unknown };
    if (profile?.version !== 1 || !Array.isArray(profile.charts)) return [];
    return profile.charts
      .map(parseStoredChart)
      .filter((chart): chart is StoredChart => chart !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

/** Compatibility helper for external callers; the UI never uses it to select. */
export function latestSavedChartFromJson(raw: string | null): StoredChart | null {
  return savedChartsFromJson(raw)[0] ?? null;
}

function readSavedCharts(): StoredChart[] {
  try { return savedChartsFromJson(localStorage.getItem(PROFILE_KEY)); } catch { return []; }
}

function placementLabel(lon: number): string {
  const sign = signForLongitude(lon);
  const within = degreeInSign(lon);
  const minutes = Math.floor((within - Math.floor(within)) * 60 + 1e-7);
  return `${Math.floor(within)}°${String(minutes).padStart(2, '0')}′ ${sign.name}`;
}

function validCusps(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 12 && value.every(finiteLongitude);
}

/** Build the complete PII-free v2 chart object and a readable local preview. */
export async function prepareChartForAssistant(chart: StoredChart): Promise<PreparedAssistantChart | null> {
  let bodies = chart.summary.bodies;
  let angles = chart.birth.timeKnown ? chart.summary.angles : null;
  let cusps: number[] | null = null;
  let engineVersion = chart.summary.engineVersion;

  if (chart.birth.timeKnown && angles && chart.summary.houseSystem === 'whole') {
    cusps = wholeSignCusps(angles.asc);
  }
  const canResolvePlacidus = chart.summary.houseSystem === 'placidus'
    && chart.birth.timeKnown && chart.birth.place !== null
    && /^\d{4}-\d{2}-\d{2}$/.test(chart.birth.date)
    && typeof chart.birth.time === 'string' && /^\d{2}:\d{2}$/.test(chart.birth.time);
  if (canResolvePlacidus) {
    try {
      const [{ computeChart }, { resolveLocalToUtc }] = await Promise.all([
        import('../engine/full'), import('../time/localToUtc'),
      ]);
      const place = chart.birth.place!;
      const resolved = resolveLocalToUtc(chart.birth.date, chart.birth.time!, place.tz);
      const computed = computeChart({
        utc: resolved.utc, latitude: place.lat, longitude: place.lon,
        houseSystem: 'placidus', timeKnown: true, flags: resolved.flags,
      });
      bodies = computed.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
      angles = computed.angles ? { asc: computed.angles.asc, mc: computed.angles.mc } : null;
      cusps = validCusps(computed.houses?.cusps) ? [...computed.houses.cusps] : null;
      engineVersion = computed.engineVersion;
    } catch {
      cusps = null;
    }
  }
  const byBody = new Map(bodies.map((body) => [body.body, body]));
  const ordered = POSITION_BODY_ORDER.map((body) => byBody.get(body));
  if (ordered.some((body) => body === undefined)) return null;
  const canonicalBodies = ordered as StoredBody[];
  const positionsToken = encodePositionsLink({
    bodies: canonicalBodies,
    angles,
    houseSystem: chart.summary.houseSystem,
    engineVersion,
  });
  if (!positionsToken) return null;
  const payload: AssistantChartPayload = {
    positionsToken,
    retrogradeBodies: canonicalBodies.filter((body) => body.retrograde).map((body) => body.body),
    ...(chart.summary.houseSystem === 'placidus' && cusps ? { cusps } : {}),
  };
  const lines = canonicalBodies.map(({ body, lon, retrograde }) => {
    const house = cusps ? houseOf(lon, cusps) : null;
    return `${body}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}${retrograde ? ' · retrograde' : ''}`;
  });
  if (angles) {
    for (const [label, lon] of [['ASC', angles.asc], ['MC', angles.mc]] as const) {
      const house = cusps ? houseOf(lon, cusps) : null;
      lines.push(`${label}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}`);
    }
  }
  return {
    payload,
    placementPreview: `Tropical chart placements:\n${lines.join('\n')}`,
    capabilities: { chart: true, houses: cusps !== null, transits: true },
  };
}

/** Kept for the cached v1 UI tests and other local preview callers. */
export async function placementSummaryForChart(chart: StoredChart): Promise<string | null> {
  return (await prepareChartForAssistant(chart))?.placementPreview ?? null;
}

function stringList(value: unknown, maximum = 8): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item || item.length > 200) return null;
    if (!output.includes(item)) output.push(item);
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCapabilities(value: unknown): AssistantCapabilities | null {
  if (!isRecord(value)
    || typeof value.chart !== 'boolean'
    || typeof value.houses !== 'boolean'
    || typeof value.transits !== 'boolean') return null;
  return { chart: value.chart, houses: value.houses, transits: value.transits };
}

/** Defense in depth: render only canonical server-provided sources and compatible prompts. */
export function parseGuideMeta(value: unknown): AssistantGuideMeta | null {
  if (!isRecord(value) || !Array.isArray(value.receipts) || !Array.isArray(value.followUps)) return null;
  const capabilities = parseCapabilities(value.capabilities);
  if (!capabilities) return null;
  const receipts = value.receipts.slice(0, 4).flatMap((item): GuideReceipt[] => {
    if (!isRecord(item) || typeof item.label !== 'string' || !item.label.trim()) return [];
    const factIds = stringList(item.factIds);
    const sourceIds = stringList(item.sourceIds);
    if (!factIds || !sourceIds || !Array.isArray(item.sources)) return [];
    const allowedIds = new Set(sourceIds);
    const sources = item.sources.slice(0, 6).flatMap((raw): CanonicalSource[] => {
      if (!isRecord(raw)
        || typeof raw.id !== 'string' || !allowedIds.has(raw.id)
        || typeof raw.path !== 'string' || !SOURCE_PATH_RE.test(raw.path)
        || typeof raw.title !== 'string' || !raw.title.trim()) return [];
      return [{ id: raw.id, path: raw.path, title: raw.title.trim(), ...(typeof raw.heading === 'string' && raw.heading.trim() ? { heading: raw.heading.trim() } : {}) }];
    });
    if (!factIds.length && !sources.length) return [];
    return [{ label: item.label.trim().slice(0, 160), factIds, sourceIds: sources.map((source) => source.id), sources }];
  });
  const followUps = value.followUps.slice(0, 2).flatMap((item): GuideFollowUp[] => {
    if (!isRecord(item) || typeof item.question !== 'string' || !item.question.trim()
      || typeof item.requires !== 'string' || !REQUIREMENTS.has(item.requires as FollowUpRequirement)) return [];
    const requires = item.requires as FollowUpRequirement;
    if (requires !== 'none' && !capabilities[requires]) return [];
    const factIds = stringList(item.factIds);
    const sourceIds = stringList(item.sourceIds);
    return factIds && sourceIds ? [{ question: item.question.trim().slice(0, 200), requires, factIds, sourceIds }] : [];
  });
  return { capabilities, receipts, followUps };
}

export interface ParsedAssistantFrame {
  delta?: string;
  done?: boolean;
  error?: string;
  retryable?: boolean;
  status?: 'thinking' | 'safety_routing' | 'no_coverage';
  meta?: AssistantGuideMeta;
}

/** Parse a named v2 SSE frame, with the seven-day v1 data-frame bridge. */
export function parseAssistantSseFrame(frame: string): ParsedAssistantFrame {
  let event = '';
  const dataLines: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  const data = dataLines.join('\n');
  if (!data) return {};
  if (data === '[DONE]') return { done: true };
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return { error: 'provider_unavailable', retryable: true }; }
  if (!event) {
    if (isRecord(parsed) && typeof parsed.t === 'string') return { delta: parsed.t };
    if (isRecord(parsed) && typeof parsed.error === 'string') return { error: parsed.error };
    return {};
  }
  if (event === 'answer.delta' && isRecord(parsed) && typeof parsed.text === 'string') return { delta: parsed.text };
  if (event === 'status' && isRecord(parsed)
    && (parsed.stage === 'thinking' || parsed.stage === 'safety_routing' || parsed.stage === 'no_coverage')) {
    return { status: parsed.stage };
  }
  if (event === 'guide.meta') {
    const meta = parseGuideMeta(parsed);
    return meta ? { meta } : {};
  }
  if (event === 'error' && isRecord(parsed) && typeof parsed.code === 'string') {
    return { error: parsed.code, retryable: parsed.retryable === true };
  }
  if (event === 'done') return { done: true };
  return {};
}

export async function consumeAssistantStream(
  response: Response,
  onDelta: (delta: string) => void,
  onMeta: (meta: AssistantGuideMeta) => void = () => {},
  onStatus: (stage: NonNullable<ParsedAssistantFrame['status']>) => void = () => {},
): Promise<AssistantGuideMeta | null> {
  if (!response.body) throw new AssistantFailure('provider_unavailable', true);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let latestMeta: AssistantGuideMeta | null = null;
  const consumeFrame = (frame: string): boolean => {
    const parsed = parseAssistantSseFrame(frame);
    if (parsed.error) throw new AssistantFailure(parsed.error, parsed.retryable);
    if (parsed.delta) onDelta(parsed.delta);
    if (parsed.meta) { latestMeta = parsed.meta; onMeta(parsed.meta); }
    if (parsed.status) onStatus(parsed.status);
    return parsed.done === true;
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = buffer.match(/\r?\n\r?\n/);
    while (boundary?.index !== undefined) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      if (consumeFrame(frame)) {
        await reader.cancel().catch(() => {});
        return latestMeta;
      }
      boundary = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
  if (buffer.trim() && consumeFrame(buffer)) return latestMeta;
  throw new AssistantFailure('provider_unavailable', true);
}

/** Model text is always rendered as text. Only validated metadata creates links. */
export function renderAssistantText(container: HTMLElement, text: string): void {
  container.textContent = text;
}

function button(className: string, label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  return element;
}

function formatExpiry(value: string, locale: AssistantLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

function safePagePath(): string | undefined {
  const path = window.location.pathname;
  return SOURCE_PATH_RE.test(path) ? path : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

class AssistantSurface {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly transcript: HTMLDivElement;
  private readonly status: HTMLParagraphElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly stopButton: HTMLButtonElement;
  private readonly chartSelect: HTMLSelectElement;
  private readonly chartAttach: HTMLButtonElement;
  private readonly starters: HTMLElement;
  private readonly startersList: HTMLDivElement;
  private readonly memory: HTMLDetailsElement;
  private readonly memorySummary: HTMLElement;
  private readonly memoryBody: HTMLDivElement;
  private readonly memoryStatus: HTMLParagraphElement;
  private readonly threadSelect: HTMLSelectElement;
  private readonly rememberButton: HTMLButtonElement;
  private readonly retryMemoryButton: HTMLButtonElement;
  private readonly privacy: HTMLParagraphElement;
  private activeRequest: AbortController | null = null;
  private charts: StoredChart[] = [];
  private selectedChartId = '';
  private preparedChart: PreparedAssistantChart | null = null;
  private chartConsented = false;
  private dismissConsent: (() => void) | null = null;
  private thread: AssistantMemoryThread;
  private accountOptIn = false;
  private signedIn = false;
  private accountUserId: string | null = null;
  private authEpoch = 0;
  private memoryRefreshEpoch = 0;
  private accountDerivedThread = false;
  private sessionBeforeAccountThread: AssistantMemoryThread | null = null;
  private accountThreadId: string | null = null;
  private accountExpiry: string | null = null;
  private rememberedThreads: AssistantMemoryThread[] = [];
  private pendingAccountSync = false;
  private previousOverflow = '';
  private opener: HTMLElement | null = null;
  private destroyed = false;
  private readonly cleanups: Array<() => void> = [];

  constructor(private locale: AssistantLocale, private readonly modal: boolean) {
    const copy = COPY[locale];
    this.thread = loadAssistantSession() ?? createAssistantSessionThread({ locale, title: 'Ask Zodiacs' });
    this.root = document.createElement('div');
    this.root.className = `zassistant ${modal ? 'zassistant--modal' : 'zassistant--embedded'}`;
    if (modal) this.root.hidden = true;
    this.panel = document.createElement('section');
    this.panel.className = 'zassistant__panel';
    if (modal) {
      this.panel.setAttribute('role', 'dialog');
      this.panel.setAttribute('aria-modal', 'true');
    } else {
      this.panel.setAttribute('aria-label', copy.title);
    }
    const header = document.createElement('header');
    header.className = 'zassistant__head';
    const headingGroup = document.createElement('div');
    headingGroup.className = 'zassistant__heading';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'zassistant__eyebrow mono';
    eyebrow.textContent = 'ZODIACS / GUIDE';
    const title = document.createElement('h2');
    title.id = modal ? 'zassistant-dialog-title' : 'zassistant-page-title';
    title.className = 'zassistant__title';
    title.textContent = copy.title;
    this.panel.setAttribute('aria-labelledby', title.id);
    headingGroup.append(eyebrow, title);
    header.append(headingGroup);
    if (modal) {
      const close = button('zassistant__close', '×');
      close.setAttribute('aria-label', copy.close);
      close.addEventListener('click', () => this.close());
      header.append(close);
    }
    const intro = document.createElement('p');
    intro.className = 'zassistant__intro';
    intro.textContent = copy.intro;
    this.starters = document.createElement('section');
    this.starters.className = 'zassistant__starters';
    const starterLabel = document.createElement('p');
    starterLabel.className = 'zassistant__section-label mono';
    starterLabel.textContent = copy.startersLabel;
    this.startersList = document.createElement('div');
    this.startersList.className = 'zassistant__starter-list';
    this.starters.append(starterLabel, this.startersList);

    const chartControls = document.createElement('section');
    chartControls.className = 'zassistant__chart-controls';
    const chartLabel = document.createElement('label');
    chartLabel.className = 'zassistant__chart-label';
    chartLabel.htmlFor = modal ? 'zassistant-dialog-chart' : 'zassistant-page-chart';
    chartLabel.textContent = copy.chartLabel;
    this.chartSelect = document.createElement('select');
    this.chartSelect.id = chartLabel.htmlFor;
    this.chartSelect.className = 'zassistant__chart-select';
    this.chartSelect.addEventListener('change', () => this.selectChart(this.chartSelect.value));
    this.chartAttach = button('zassistant__chart-chip', copy.chartAttach);
    this.chartAttach.setAttribute('aria-pressed', 'false');
    this.chartAttach.addEventListener('click', () => void this.toggleChartAttachment());
    chartControls.append(chartLabel, this.chartSelect, this.chartAttach);

    this.transcript = document.createElement('div');
    this.transcript.className = 'zassistant__log';
    this.transcript.setAttribute('role', 'log');
    this.transcript.setAttribute('aria-live', 'polite');
    this.transcript.setAttribute('aria-label', copy.log);
    this.transcript.setAttribute('aria-relevant', 'additions text');
    this.status = document.createElement('p');
    this.status.className = 'zassistant__status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.status.setAttribute('aria-atomic', 'true');

    const form = document.createElement('form');
    form.className = 'zassistant__form';
    form.addEventListener('submit', (event) => { event.preventDefault(); void this.submitQuestion(); });
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'zassistant__input';
    this.textarea.rows = 2;
    this.textarea.maxLength = MAX_INPUT;
    this.textarea.autocomplete = 'off';
    this.textarea.spellcheck = true;
    this.textarea.placeholder = copy.placeholder;
    this.textarea.setAttribute('aria-label', copy.input);
    this.textarea.addEventListener('input', () => { this.syncTextareaHeight(); this.syncControls(); });
    this.textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault(); form.requestSubmit();
      }
    });
    const formActions = document.createElement('div');
    formActions.className = 'zassistant__actions';
    const hint = document.createElement('span');
    hint.className = 'zassistant__hint mono';
    hint.textContent = copy.newline;
    this.sendButton = document.createElement('button');
    this.sendButton.type = 'submit';
    this.sendButton.className = 'zassistant__send';
    this.sendButton.textContent = copy.send;
    this.sendButton.disabled = true;
    this.stopButton = button('zassistant__stop', copy.stop);
    this.stopButton.hidden = true;
    this.stopButton.addEventListener('click', () => this.activeRequest?.abort());
    formActions.append(hint, this.sendButton, this.stopButton);
    form.append(this.textarea, formActions);

    this.memory = document.createElement('details');
    this.memory.className = 'zassistant__memory';
    this.memorySummary = document.createElement('summary');
    this.memorySummary.textContent = copy.memorySettings;
    this.memoryBody = document.createElement('div');
    this.memoryBody.className = 'zassistant__memory-body';
    this.rememberButton = button('zassistant__memory-primary', copy.remember);
    this.rememberButton.hidden = true;
    this.rememberButton.addEventListener('click', () => this.requestMemoryConsent());
    const sessionOnly = document.createElement('p');
    sessionOnly.className = 'zassistant__memory-note';
    sessionOnly.textContent = copy.memorySessionOnly;
    const threadLabel = document.createElement('label');
    threadLabel.className = 'zassistant__memory-label';
    threadLabel.textContent = copy.memoryThreads;
    this.threadSelect = document.createElement('select');
    this.threadSelect.className = 'zassistant__memory-select';
    threadLabel.append(this.threadSelect);
    const memoryActions = document.createElement('div');
    memoryActions.className = 'zassistant__memory-actions';
    const openThread = button('zassistant__memory-action', copy.memoryOpen);
    openThread.addEventListener('click', () => this.openRememberedThread());
    const deleteThread = button('zassistant__memory-action', copy.memoryDelete);
    deleteThread.addEventListener('click', () => void this.deleteRememberedThread());
    const deleteAll = button('zassistant__memory-action zassistant__memory-action--danger', copy.memoryDeleteAll);
    deleteAll.addEventListener('click', () => void this.deleteAllRemembered());
    const optOut = button('zassistant__memory-action zassistant__memory-action--danger', copy.memoryOptOut);
    optOut.addEventListener('click', () => void this.optOutMemory());
    const newSession = button('zassistant__memory-action', copy.clearSession);
    newSession.addEventListener('click', () => this.startNewSession());
    memoryActions.append(openThread, deleteThread, deleteAll, optOut, newSession);
    this.memoryStatus = document.createElement('p');
    this.memoryStatus.className = 'zassistant__memory-status';
    this.memoryStatus.setAttribute('role', 'status');
    this.retryMemoryButton = button('zassistant__memory-retry', copy.retry);
    this.retryMemoryButton.hidden = true;
    this.retryMemoryButton.addEventListener('click', () => void this.retryAccountSave());
    this.memoryBody.append(sessionOnly, this.rememberButton, threadLabel, memoryActions, this.memoryStatus, this.retryMemoryButton);
    this.memory.append(this.memorySummary, this.memoryBody);
    this.privacy = document.createElement('p');
    this.privacy.className = 'zassistant__privacy';
    this.privacy.textContent = copy.privacy;
    const privacyLink = document.createElement('a');
    privacyLink.href = locale === 'en' ? '/privacy/' : `/${locale}/privacy/`;
    privacyLink.textContent = ` ${copy.privacyLink}`;
    this.privacy.append(privacyLink);

    this.panel.append(header, intro, this.starters, chartControls, this.transcript, this.status, form, this.memory, this.privacy);
    this.root.append(this.panel);
    this.root.addEventListener('click', (event) => { if (this.modal && event.target === this.root) this.close(); });
    this.root.addEventListener('keydown', (event) => this.trapFocus(event));
    for (const turn of this.thread.turns) {
      this.appendMessage('user', turn.question);
      this.appendMessage('assistant', turn.answer);
    }
    this.refreshSavedCharts();
    this.renderStarters();
    this.syncControls();
    const profileListener = () => { if (!this.activeRequest) this.refreshSavedCharts(); };
    window.addEventListener('zodiacs:profile', profileListener);
    this.cleanups.push(() => window.removeEventListener('zodiacs:profile', profileListener));
    this.cleanups.push(onAssistantMemoryAuthChange((session) => {
      const nextUserId = session?.user.id ?? null;
      const accountChanged = this.accountUserId !== nextUserId;
      if (accountChanged) {
        this.authEpoch += 1;
        this.dismissConsent?.();
        this.restoreSessionAfterAccountThread();
        this.accountOptIn = false;
        this.accountThreadId = null;
        this.accountExpiry = null;
        this.rememberedThreads = [];
        this.pendingAccountSync = false;
        this.threadSelect.replaceChildren();
      }
      this.accountUserId = nextUserId;
      this.signedIn = Boolean(session);
      void this.refreshMemoryState();
    }));
    this.cleanups.push(onAssistantMemoryChange(() => { if (this.signedIn) void this.refreshMemoryState(false); }));
  }

  private copy(): Copy { return COPY[this.locale]; }

  show(from?: HTMLElement | null, prefill?: string): void {
    if (!this.modal) return;
    if (this.root.hidden) {
      this.opener = from ?? document.activeElement as HTMLElement | null;
      this.previousOverflow = document.documentElement.style.overflow;
    }
    this.root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    this.prefill(prefill);
    this.textarea.focus();
    track('assistant_open');
  }

  close(): void {
    if (!this.modal || this.root.hidden) return;
    this.activeRequest?.abort();
    this.dismissConsent?.();
    this.root.hidden = true;
    document.documentElement.style.overflow = this.previousOverflow;
    this.opener?.focus();
    this.opener = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.close();
    for (const cleanup of this.cleanups) cleanup();
    this.root.remove();
  }

  prefill(question?: string | null): void {
    const value = question?.trim().slice(0, MAX_INPUT);
    if (!value) return;
    this.textarea.value = value;
    this.syncTextareaHeight();
    this.syncControls();
    this.textarea.focus();
  }

  focusComposer(question?: string | null): void {
    this.prefill(question);
    this.root.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    this.textarea.focus({ preventScroll: true });
    track('assistant_open');
  }

  private authSnapshot(): AuthSnapshot {
    return { epoch: this.authEpoch, userId: this.accountUserId };
  }

  private isCurrentAuth(snapshot: AuthSnapshot): boolean {
    return !this.destroyed
      && snapshot.epoch === this.authEpoch
      && snapshot.userId === this.accountUserId;
  }

  private isCurrentAccountThread(snapshot: AuthSnapshot, threadId: string): boolean {
    return this.isCurrentAuth(snapshot) && this.thread.id === threadId;
  }

  private memoryLimitMessage(error: unknown): string | null {
    const code = assistantMemoryLimitCode(error);
    if (code === 'thread_limit') return this.copy().memoryThreadLimit;
    if (code === 'thread_turn_limit') return this.copy().memoryThreadTurnLimit;
    if (code === 'total_turn_limit') return this.copy().memoryTotalTurnLimit;
    return null;
  }

  private renderStarters(): void {
    this.startersList.replaceChildren();
    const selected = this.charts.find((chart) => chart.id === this.selectedChartId);
    const prompts = selected
      ? selected.birth.timeKnown ? this.copy().chartStarters : this.copy().chartStartersNoTime
      : this.copy().noChartStarters;
    for (const prompt of prompts) {
      const starter = button('zassistant__starter', prompt);
      starter.addEventListener('click', () => this.prefill(prompt));
      this.startersList.append(starter);
    }
  }

  private refreshSavedCharts(): void {
    this.dismissConsent?.();
    const prior = this.selectedChartId;
    this.charts = readSavedCharts();
    this.chartSelect.replaceChildren();
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = this.charts.length ? this.copy().chartChoose : this.copy().chartNone;
    this.chartSelect.append(blank);
    for (const chart of this.charts) {
      const option = document.createElement('option');
      option.value = chart.id;
      option.textContent = chart.name;
      this.chartSelect.append(option);
    }
    this.selectedChartId = this.charts.some((chart) => chart.id === prior) ? prior : '';
    this.chartSelect.value = this.selectedChartId;
    this.preparedChart = null;
    this.chartConsented = false;
    this.renderStarters();
    this.syncControls();
  }

  private selectChart(id: string): void {
    this.dismissConsent?.();
    this.selectedChartId = this.charts.some((chart) => chart.id === id) ? id : '';
    this.preparedChart = null;
    this.chartConsented = false;
    this.renderStarters();
    this.syncControls();
  }

  private async prepareSelectedChart(): Promise<PreparedAssistantChart | null> {
    if (this.preparedChart) return this.preparedChart;
    const chart = this.charts.find((candidate) => candidate.id === this.selectedChartId);
    if (!chart) return null;
    this.setStatus(this.copy().chartReading);
    this.preparedChart = await prepareChartForAssistant(chart);
    if (!this.preparedChart) this.setStatus(this.copy().chartUnavailable);
    return this.preparedChart;
  }

  private async toggleChartAttachment(): Promise<void> {
    if (this.chartConsented) {
      this.chartConsented = false;
      this.syncControls();
      return;
    }
    if (!this.selectedChartId) return;
    const prepared = await this.prepareSelectedChart();
    if (!prepared) return;
    this.chartConsented = await this.requestChartConsent(prepared);
    this.syncControls();
  }

  private requestChartConsent(prepared: PreparedAssistantChart): Promise<boolean> {
    return new Promise((resolve) => {
      const copy = this.copy();
      const card = document.createElement('section');
      card.className = 'zassistant__consent';
      const title = document.createElement('h3');
      title.textContent = copy.consentTitle;
      const body = document.createElement('p');
      body.textContent = copy.consentBody;
      const readable = document.createElement('pre');
      readable.className = 'zassistant__placement-preview';
      readable.textContent = prepared.placementPreview;
      const exactLabel = document.createElement('p');
      exactLabel.className = 'zassistant__consent-label mono';
      exactLabel.textContent = copy.consentExact;
      const exact = document.createElement('pre');
      exact.className = 'zassistant__consent-preview';
      exact.textContent = JSON.stringify(prepared.payload, null, 2);
      const actions = document.createElement('div');
      actions.className = 'zassistant__consent-actions';
      const confirm = button('zassistant__consent-confirm', copy.consentConfirm);
      const cancel = button('zassistant__consent-cancel', copy.consentCancel);
      let settled = false;
      const settle = (granted: boolean) => {
        if (settled) return;
        settled = true;
        card.remove();
        this.dismissConsent = null;
        this.chartAttach.focus({ preventScroll: true });
        resolve(granted);
      };
      this.dismissConsent = () => settle(false);
      confirm.addEventListener('click', () => settle(true));
      cancel.addEventListener('click', () => settle(false));
      actions.append(confirm, cancel);
      card.append(title, body, readable, exactLabel, exact, actions);
      this.transcript.append(card);
      this.scrollTranscript();
      confirm.focus();
    });
  }

  private appendMessage(role: AssistantMessage['role'], content: string): { article: HTMLElement; body: HTMLParagraphElement } {
    const article = document.createElement('article');
    article.className = `zassistant__message zassistant__message--${role}`;
    const label = document.createElement('span');
    label.className = 'zassistant__speaker mono';
    label.textContent = role === 'user' ? this.copy().user : this.copy().assistant;
    const body = document.createElement('p');
    body.className = 'zassistant__message-body';
    body.textContent = content;
    article.append(label, body);
    this.transcript.append(article);
    this.scrollTranscript();
    return { article, body };
  }

  private renderGuideMeta(article: HTMLElement, meta: AssistantGuideMeta | null): void {
    article.querySelector('.zassistant__guide-meta')?.remove();
    const fallback = this.fallbackFollowUps(meta?.capabilities);
    const followUps = meta?.followUps.length ? meta.followUps : fallback;
    if (!meta?.receipts.length && !followUps.length) return;
    const wrap = document.createElement('footer');
    wrap.className = 'zassistant__guide-meta';
    if (meta?.receipts.length) {
      const evidence = document.createElement('section');
      evidence.className = 'zassistant__receipts';
      const label = document.createElement('h3');
      label.textContent = this.copy().evidence;
      evidence.append(label);
      for (const receipt of meta.receipts) {
        const item = document.createElement('div');
        item.className = 'zassistant__receipt';
        const receiptLabel = document.createElement('span');
        receiptLabel.textContent = receipt.label;
        item.append(receiptLabel);
        for (const source of receipt.sources) {
          const link = document.createElement('a');
          link.href = source.path;
          link.textContent = source.heading ? `${source.title} — ${source.heading}` : source.title;
          link.className = 'zassistant__source';
          item.append(link);
        }
        evidence.append(item);
      }
      wrap.append(evidence);
    }
    if (followUps.length) {
      const next = document.createElement('section');
      next.className = 'zassistant__follow-ups';
      const label = document.createElement('h3');
      label.textContent = this.copy().nextQuestions;
      next.append(label);
      for (const followUp of followUps.slice(0, 2)) {
        const prompt = button('zassistant__follow-up', followUp.question);
        prompt.addEventListener('click', () => this.prefill(followUp.question));
        next.append(prompt);
      }
      wrap.append(next);
    }
    article.append(wrap);
  }

  private fallbackFollowUps(capabilities?: AssistantCapabilities): GuideFollowUp[] {
    const selected = this.charts.find((chart) => chart.id === this.selectedChartId);
    const source = selected
      ? selected.birth.timeKnown ? this.copy().chartStarters : this.copy().chartStartersNoTime
      : this.copy().noChartStarters;
    return source
      .filter((question) => !/right now|ahora|agora|maintenant|adesso/i.test(question) || capabilities?.transits !== false)
      .slice(0, 2)
      .map((question) => ({ question, requires: selected ? 'chart' : 'none', factIds: [], sourceIds: [] }));
  }

  private requestMessages(question: string): AssistantMessage[] {
    const turns = this.thread.turns.slice(-MAX_PRIOR_TURNS);
    return [
      ...turns.flatMap((turn): AssistantMessage[] => [
        { role: 'user', content: turn.question },
        { role: 'assistant', content: turn.answer },
      ]),
      { role: 'user', content: question },
    ];
  }

  private async submitQuestion(): Promise<void> {
    if (this.activeRequest) return;
    const question = this.textarea.value.trim();
    if (!question) return this.setStatus(this.copy().empty);
    const requestMessages = this.requestMessages(question);
    const userMessage = this.appendMessage('user', question);
    this.textarea.value = '';
    this.syncTextareaHeight();
    const assistantMessage = this.appendMessage('assistant', '');
    assistantMessage.article.setAttribute('aria-busy', 'true');
    this.activeRequest = new AbortController();
    this.setBusy(true);
    let answer = '';
    let guideMeta: AssistantGuideMeta | null = null;
    try {
      const chart = this.chartConsented ? await this.prepareSelectedChart() : null;
      this.setStatus(this.copy().thinking);
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: 2,
          locale: this.locale,
          ...(safePagePath() ? { pagePath: safePagePath() } : {}),
          messages: requestMessages,
          ...(chart ? { chart: chart.payload } : {}),
        }),
        signal: this.activeRequest.signal,
      });
      if (!response.ok) throw new AssistantFailure(await this.failureCode(response), response.status >= 500);
      guideMeta = await consumeAssistantStream(
        response,
        (delta) => { answer += delta; assistantMessage.body.textContent = answer; this.scrollTranscript(); },
        (meta) => { guideMeta = meta; },
        (stage) => {
          if (stage === 'thinking') this.setStatus(this.copy().thinking);
          if (stage === 'safety_routing') this.setStatus(this.copy().safetyRouting);
        },
      );
      if (!answer.trim()) throw new AssistantFailure('provider_unavailable', true);
      renderAssistantText(assistantMessage.body, answer);
      this.renderGuideMeta(assistantMessage.article, guideMeta);
      assistantMessage.article.removeAttribute('aria-busy');
      this.persistCompletedTurn(question, answer);
      this.setStatus(this.copy().complete);
      track('assistant_reply');
    } catch (error) {
      assistantMessage.article.removeAttribute('aria-busy');
      if (!answer) {
        assistantMessage.article.remove();
        userMessage.article.remove();
        this.textarea.value = question;
        this.syncTextareaHeight();
      } else {
        assistantMessage.article.classList.add('is-partial');
      }
      if (isAbortError(error)) this.setStatus(this.copy().stopped);
      else this.setStatus(this.friendlyFailure(error instanceof AssistantFailure ? error.code : 'provider_unavailable'));
    } finally {
      this.activeRequest = null;
      this.setBusy(false);
      if (!this.destroyed && (!this.modal || !this.root.hidden)) this.textarea.focus();
    }
  }

  private persistCompletedTurn(question: string, answer: string): void {
    const turn: AssistantVisibleTurn = { id: crypto.randomUUID(), question, answer, completedAt: new Date().toISOString() };
    if (!this.thread.turns.length) this.thread = { ...this.thread, title: question.slice(0, 120).trim() };
    const chartId = this.chartConsented && UUID_RE.test(this.selectedChartId)
      ? this.selectedChartId
      : this.thread.chartId;
    this.thread = appendAssistantCompletedTurn({ ...this.thread, chartId }, turn);
    // A server-loaded account thread must not leak into the tab's anonymous
    // session cache. It remains in memory until sign-out/account change and is
    // persisted only through its owner-scoped account RPC.
    const sessionSaved = this.accountDerivedThread || saveAssistantSession(this.thread);
    if (!sessionSaved) {
      this.memoryStatus.textContent = this.copy().memoryFailed;
      this.retryMemoryButton.hidden = false;
    }
    if (!this.accountOptIn) return;
    void this.persistAccountTurn(turn);
  }

  private async persistAccountTurn(turn: AssistantVisibleTurn): Promise<void> {
    const auth = this.authSnapshot();
    const threadId = this.thread.id;
    if (!auth.userId || !this.accountOptIn) return;
    try {
      if (!this.accountThreadId) {
        const imported = await this.withStorageTimeout(enableAssistantMemoryAndImportSession(this.thread));
        if (!imported) throw new Error('unavailable');
        if (!this.isCurrentAccountThread(auth, threadId)) return;
        this.accountThreadId = imported.threadId;
        this.accountExpiry = imported.expiresAt;
      } else {
        const outcome = await this.withStorageTimeout(saveAssistantCompletedTurn(this.accountThreadId, turn));
        if (outcome === 'unavailable') throw new Error(outcome);
        if (!this.isCurrentAccountThread(auth, threadId)) return;
      }
      if (!this.pendingAccountSync) {
        this.retryMemoryButton.hidden = true;
        await this.refreshMemoryState(false);
      }
    } catch (error) {
      if (!this.isCurrentAccountThread(auth, threadId)) return;
      const limitMessage = this.memoryLimitMessage(error);
      if (limitMessage) {
        this.pendingAccountSync = false;
        this.memoryStatus.textContent = limitMessage;
        this.retryMemoryButton.hidden = true;
        this.memory.open = true;
        return;
      }
      // The session thread already contains every completed visible turn.
      // Retry the idempotent full-thread import so consecutive failed saves
      // cannot overwrite one another in a single pending slot.
      this.pendingAccountSync = true;
      this.memoryStatus.textContent = this.copy().memoryFailed;
      this.retryMemoryButton.hidden = false;
    }
  }

  private async withStorageTimeout<T>(operation: Promise<T>, timeoutMs = 10_000): Promise<T> {
    let timer = 0;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timer = window.setTimeout(() => reject(new Error('assistant memory timeout')), timeoutMs);
        }),
      ]);
    } finally {
      window.clearTimeout(timer);
    }
  }

  private requestMemoryConsent(): void {
    if (!this.signedIn || this.accountOptIn || this.dismissConsent) return;
    const card = document.createElement('section');
    card.className = 'zassistant__consent zassistant__consent--memory';
    const title = document.createElement('h3');
    title.textContent = this.copy().rememberConfirmTitle;
    const body = document.createElement('p');
    body.textContent = this.copy().rememberConfirmBody;
    const actions = document.createElement('div');
    actions.className = 'zassistant__consent-actions';
    const confirm = button('zassistant__consent-confirm', this.copy().rememberConfirm);
    const cancel = button('zassistant__consent-cancel', this.copy().consentCancel);
    const dismiss = () => { card.remove(); this.dismissConsent = null; };
    this.dismissConsent = dismiss;
    cancel.addEventListener('click', dismiss);
    confirm.addEventListener('click', async () => {
      const auth = this.authSnapshot();
      const threadId = this.thread.id;
      confirm.disabled = true;
      try {
        const result = await enableAssistantMemoryAndImportSession(this.thread);
        if (!result) throw new Error('unavailable');
        if (!this.isCurrentAccountThread(auth, threadId)) return;
        this.accountOptIn = true;
        this.accountThreadId = result.threadId;
        this.accountExpiry = result.expiresAt;
        dismiss();
        await this.refreshMemoryState(false);
      } catch (error) {
        if (!this.isCurrentAccountThread(auth, threadId)) return;
        const limitMessage = this.memoryLimitMessage(error);
        if (limitMessage) {
          dismiss();
          this.memoryStatus.textContent = limitMessage;
          this.retryMemoryButton.hidden = true;
          this.memory.open = true;
          return;
        }
        confirm.disabled = false;
        this.memoryStatus.textContent = this.copy().memoryFailed;
        this.memory.open = true;
      }
    });
    actions.append(confirm, cancel);
    card.append(title, body, actions);
    this.transcript.append(card);
    this.scrollTranscript();
    confirm.focus();
  }

  private async refreshMemoryState(readOptIn = true): Promise<void> {
    const auth = this.authSnapshot();
    const refreshEpoch = ++this.memoryRefreshEpoch;
    const isCurrent = () => this.isCurrentAuth(auth) && refreshEpoch === this.memoryRefreshEpoch;
    if (!isCurrent()) return;
    const copy = this.copy();
    if (!this.signedIn || !auth.userId) {
      this.accountOptIn = false;
      this.accountThreadId = null;
      this.accountExpiry = null;
      this.rememberedThreads = [];
      this.rememberButton.hidden = true;
      this.threadSelect.parentElement!.hidden = true;
      this.memoryBody.querySelector<HTMLElement>('.zassistant__memory-actions')!.hidden = true;
      this.threadSelect.replaceChildren();
      this.memoryStatus.textContent = copy.memorySignedOut;
      return;
    }
    try {
      const accountOptIn = readOptIn ? await getAssistantMemoryOptIn() : this.accountOptIn;
      if (!isCurrent()) return;
      const rememberedThreads = accountOptIn ? await listAssistantThreads() : [];
      if (!isCurrent()) return;
      let current = rememberedThreads.find((thread) => thread.id === this.thread.id);
      this.accountOptIn = accountOptIn;
      this.rememberedThreads = rememberedThreads;
      if (!current && this.accountThreadId === this.thread.id) {
        if (this.accountDerivedThread) {
          // RLS hides expired rows immediately, and another device can delete
          // a thread while it is open. Drop that account-derived transcript and
          // return to the tab's untouched anonymous session.
          this.restoreSessionAfterAccountThread();
          current = rememberedThreads.find((thread) => thread.id === this.thread.id);
        } else {
          // A local session whose account row disappeared may be imported again
          // on its next completed turn while memory remains opted in.
          this.accountThreadId = null;
          this.accountExpiry = null;
        }
      }
      if (current) {
        this.accountThreadId = current.id;
        this.accountExpiry = current.expiresAt;
      }
      this.rememberButton.hidden = this.accountOptIn;
      this.threadSelect.parentElement!.hidden = !this.accountOptIn;
      this.memoryBody.querySelector<HTMLElement>('.zassistant__memory-actions')!.hidden = !this.accountOptIn;
      this.threadSelect.replaceChildren();
      for (const remembered of this.rememberedThreads) {
        const option = document.createElement('option');
        option.value = remembered.id;
        option.textContent = `${remembered.title} · ${formatExpiry(remembered.expiresAt!, this.locale)}`;
        option.selected = remembered.id === this.accountThreadId;
        this.threadSelect.append(option);
      }
      this.memoryStatus.textContent = this.accountOptIn
        ? this.accountExpiry ? `${copy.memorySavedUntil} ${formatExpiry(this.accountExpiry, this.locale)}.` : copy.memoryEmpty
        : copy.memorySessionOnly;
    } catch {
      if (isCurrent()) this.memoryStatus.textContent = copy.memoryFailed;
    }
  }

  private openRememberedThread(): void {
    const selected = this.rememberedThreads.find((thread) => thread.id === this.threadSelect.value);
    if (!selected) return;
    if (!this.accountDerivedThread) this.sessionBeforeAccountThread = this.thread;
    this.accountDerivedThread = true;
    this.thread = { ...selected, expiresAt: null };
    this.accountThreadId = selected.id;
    this.accountExpiry = selected.expiresAt;
    this.transcript.replaceChildren();
    for (const turn of this.thread.turns) {
      this.appendMessage('user', turn.question);
      this.appendMessage('assistant', turn.answer);
    }
    this.setStatus();
    this.memoryStatus.textContent = `${this.copy().memorySavedUntil} ${formatExpiry(selected.expiresAt!, this.locale)}.`;
  }

  private async deleteRememberedThread(): Promise<void> {
    const id = this.threadSelect.value;
    if (!id) return;
    const auth = this.authSnapshot();
    try {
      await deleteAssistantThread(id);
      if (!this.isCurrentAuth(auth)) return;
      if (this.accountThreadId === id) {
        this.restoreSessionAfterAccountThread();
        this.accountThreadId = null;
        this.accountExpiry = null;
      }
      this.memoryStatus.textContent = this.copy().memoryDeleted;
      await this.refreshMemoryState(false);
    } catch { if (this.isCurrentAuth(auth)) this.memoryStatus.textContent = this.copy().memoryFailed; }
  }

  private async deleteAllRemembered(): Promise<void> {
    const auth = this.authSnapshot();
    try {
      await deleteAllAssistantThreads();
      if (!this.isCurrentAuth(auth)) return;
      this.restoreSessionAfterAccountThread();
      this.accountThreadId = null;
      this.accountExpiry = null;
      this.memoryStatus.textContent = this.copy().memoryDeleted;
      await this.refreshMemoryState(false);
    } catch { if (this.isCurrentAuth(auth)) this.memoryStatus.textContent = this.copy().memoryFailed; }
  }

  private async optOutMemory(): Promise<void> {
    const auth = this.authSnapshot();
    try {
      if (!await setAssistantMemoryOptIn(false)) throw new Error('unavailable');
      if (!this.isCurrentAuth(auth)) return;
      this.restoreSessionAfterAccountThread();
      this.accountOptIn = false;
      this.accountThreadId = null;
      this.accountExpiry = null;
      await this.refreshMemoryState(false);
    } catch { if (this.isCurrentAuth(auth)) this.memoryStatus.textContent = this.copy().memoryFailed; }
  }

  private startNewSession(): void {
    clearAssistantSession();
    this.thread = createAssistantSessionThread({ locale: this.locale, title: 'Ask Zodiacs' });
    this.accountDerivedThread = false;
    this.sessionBeforeAccountThread = null;
    saveAssistantSession(this.thread);
    this.accountThreadId = null;
    this.accountExpiry = null;
    this.transcript.replaceChildren();
    this.setStatus();
    this.textarea.focus();
  }

  private restoreSessionAfterAccountThread(): void {
    if (!this.accountDerivedThread) return;
    this.thread = this.sessionBeforeAccountThread
      ?? loadAssistantSession()
      ?? createAssistantSessionThread({ locale: this.locale, title: 'Ask Zodiacs' });
    this.accountDerivedThread = false;
    this.sessionBeforeAccountThread = null;
    this.accountThreadId = null;
    this.accountExpiry = null;
    this.transcript.replaceChildren();
    for (const turn of this.thread.turns) {
      this.appendMessage('user', turn.question);
      this.appendMessage('assistant', turn.answer);
    }
    this.setStatus();
  }

  private async retryAccountSave(): Promise<void> {
    // A remembered server thread never belongs in anonymous sessionStorage,
    // including the retry path after a transient account-save failure.
    if (!this.accountDerivedThread && !saveAssistantSession(this.thread)) {
      this.memoryStatus.textContent = this.copy().memoryFailed;
      return;
    }
    if (this.pendingAccountSync && this.accountOptIn) {
      const auth = this.authSnapshot();
      const threadId = this.thread.id;
      try {
        const imported = await this.withStorageTimeout(importAssistantSession(this.thread));
        if (!imported) throw new Error('unavailable');
        if (!this.isCurrentAccountThread(auth, threadId)) return;
        this.accountThreadId = imported.threadId;
        this.accountExpiry = imported.expiresAt;
        this.pendingAccountSync = false;
      } catch (error) {
        if (!this.isCurrentAccountThread(auth, threadId)) return;
        const limitMessage = this.memoryLimitMessage(error);
        if (limitMessage) {
          this.pendingAccountSync = false;
          this.retryMemoryButton.hidden = true;
          this.memoryStatus.textContent = limitMessage;
        } else {
          this.memoryStatus.textContent = this.copy().memoryFailed;
        }
        return;
      }
    }
    this.retryMemoryButton.hidden = true;
    this.memoryStatus.textContent = this.accountExpiry
      ? `${this.copy().memorySavedUntil} ${formatExpiry(this.accountExpiry, this.locale)}.`
      : this.copy().memorySessionOnly;
  }

  private async failureCode(response: Response): Promise<string> {
    try {
      const data = await response.json() as { error?: unknown };
      if (typeof data.error === 'string') return data.error;
    } catch { /* stable status fallback below */ }
    if (response.status === 429) return 'visitor_limit';
    if (response.status === 400) return 'invalid_request';
    return 'provider_unavailable';
  }

  private friendlyFailure(code: string): string {
    const copy = this.copy();
    const aliases: Record<string, keyof Copy> = {
      maintenance: 'maintenance', disabled: 'maintenance',
      quota_unavailable: 'quotaUnavailable', visitor_limit: 'visitorLimit', limit: 'visitorLimit',
      service_budget: 'serviceBudget', provider_unavailable: 'providerUnavailable', unavailable: 'providerUnavailable',
      invalid_request: 'invalidRequest', invalid: 'invalidRequest', safety_routing: 'safetyRouting',
    };
    const key = aliases[code] ?? 'providerUnavailable';
    return copy[key] as string;
  }

  private setStatus(message = ''): void { this.status.textContent = message; }
  private setBusy(busy: boolean): void {
    this.panel.setAttribute('aria-busy', String(busy));
    this.stopButton.hidden = !busy;
    this.syncControls();
  }
  private syncControls(): void {
    const busy = Boolean(this.activeRequest);
    this.sendButton.disabled = busy || !this.textarea.value.trim();
    this.chartSelect.disabled = busy || !this.charts.length;
    this.chartAttach.disabled = busy || !this.selectedChartId;
    this.chartAttach.setAttribute('aria-pressed', String(this.chartConsented));
    this.chartAttach.classList.toggle('is-active', this.chartConsented);
    this.chartAttach.textContent = this.chartConsented ? this.copy().chartAttached : this.copy().chartAttach;
  }
  private syncTextareaHeight(): void {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 152)}px`;
  }
  private scrollTranscript(): void {
    requestAnimationFrame(() => { this.transcript.scrollTop = this.transcript.scrollHeight; });
  }
  private trapFocus(event: KeyboardEvent): void {
    if (!this.modal || event.key !== 'Tab') return;
    const controls = [...this.root.querySelectorAll<HTMLElement>('button:not([hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, a[href]')]
      .filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}

let modalSurface: AssistantSurface | null = null;
let modalLocale: AssistantLocale | null = null;
const embeddedSurfaces = new WeakMap<HTMLElement, AssistantSurface>();
let activeEmbeddedSurface: AssistantSurface | null = null;

/** Open the quick-access dialog. Safe to call repeatedly. */
export async function openAssistant(requestedLocale?: string, from?: HTMLElement | null): Promise<void> {
  await ensureStylesheet();
  const locale = normalizeLocale(requestedLocale);
  const prefill = from?.dataset.assistantPrefill ?? new URL(window.location.href).searchParams.get('q') ?? undefined;
  if (activeEmbeddedSurface) {
    activeEmbeddedSurface.focusComposer(prefill);
    return;
  }
  if (!modalSurface || modalLocale !== locale) {
    modalSurface?.destroy();
    modalSurface = new AssistantSurface(locale, true);
    modalLocale = locale;
    document.body.append(modalSurface.root);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modalSurface && !modalSurface.root.hidden) {
        event.preventDefault(); event.stopPropagation(); modalSurface.close();
      }
    }, true);
  }
  modalSurface.show(from, prefill);
}

/** Mount the complete page experience into a stable host. */
export async function mountAssistant(target: HTMLElement, requestedLocale?: string): Promise<void> {
  await ensureStylesheet();
  if (embeddedSurfaces.has(target)) return;
  const surface = new AssistantSurface(normalizeLocale(requestedLocale), false);
  embeddedSurfaces.set(target, surface);
  activeEmbeddedSurface = surface;
  target.replaceChildren(surface.root);
  const query = new URL(window.location.href).searchParams.get('q');
  if (query) surface.prefill(query);
}
