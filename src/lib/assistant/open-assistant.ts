/**
 * Site-wide Guide drawer. Signed-out conversation state lives only in this
 * browser tab. Saved-chart birth inputs are used locally when houses need
 * recomputing; cloud requests contain placement lines, never birth details.
 */
import './assistant.css';
import { houseOf, wholeSignCusps } from '../engine/houses';
import { normalizeCatalogLocale as normalizeSiteLocale, type CatalogLocale as Locale } from '../i18n/core';
import { PROFILE_KEY } from '../profile/schema';
import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import {
  ACCOUNT_V2_LOCAL_OWNER_KEY,
  ACCOUNT_V2_STORAGE_PREFIX,
  isAccountV2Id,
} from '../account-v2/storage-identity';
import { degreeInSign, signForLongitude } from '../signs';

export type AssistantLocale = Locale;

type GuideAuthor = 'user' | 'guide';

interface GuideGeneration {
  modelId: string;
  promptVersion: string;
  policyVersion: string;
  protocolSchema: 'zodiacs.guide.conversation.draft.v1';
  generatedAt: string;
}

interface GuideMessage {
  messageId: string;
  turnId: string;
  sequence: number;
  author: GuideAuthor;
  content: string;
  contextRevision: number;
  createdAt: string;
  generation: GuideGeneration | null;
}

interface StoredBody {
  body: string;
  lon: number;
  retrograde: boolean;
}

interface StoredChart {
  id: string;
  name: string;
  accountRevision: number;
  updatedAt: string;
  birth: {
    date: string;
    time: string | null;
    timeKnown: boolean;
    place: { lat: number; lon: number; tz: string } | null;
  };
  summary: {
    houseSystem: 'whole' | 'placidus';
    bodies: StoredBody[];
    angles: { asc: number; mc: number } | null;
  };
}

interface GuideSession {
  version: 1;
  authBoundary: string;
  localDate: string;
  timeZone: string;
  conversationId: string;
  localOwnerId: string;
  dailySessionId: string;
  disclosureId: string;
  consentPolicyVersion: string;
  cloudConsentGranted: boolean;
  revision: number;
  contextRevision: number;
  contextEpoch: number;
  nextSequence: number;
  modelHistoryStartSequence: number;
  lastPageSourceId: string | null;
  removedPageSourceIds: string[];
  messages: GuideMessage[];
}

interface PageInfo {
  catalogId: PageCatalogId;
  sourceId: string;
  title: string;
  facts: string;
}

interface GuideContextSource {
  sourceId: string;
  kind: 'owner_chart' | 'site_page';
  sourceRevision: number;
  title: string;
  facts: string;
  subject: {
    boundary: 'root_user' | 'public_reference';
    subjectId: string;
    subjectName: string | null;
    subjectIsUser: boolean;
  };
  containsThirdPartyData: false;
  persistence: 'local_only';
  contentDigest: string;
}

interface Copy {
  title: string;
  open: string;
  close: string;
  clear: string;
  clearAction: string;
  clearConfirm: string;
  clearConfirmStatus: string;
  intro: string;
  invite: string;
  inviteAction: string;
  dismissInvite: string;
  log: string;
  input: string;
  placeholder: string;
  send: string;
  stop: string;
  retry: string;
  newline: string;
  context: string;
  pageSource: string;
  addPage: string;
  removeSource: string;
  chartOn: string;
  chartOff: string;
  chartReading: string;
  thinking: string;
  stopped: string;
  complete: string;
  empty: string;
  unavailable: string;
  disabled: string;
  rateLimited: string;
  user: string;
  assistant: string;
  privacy: string;
  privacyLearnMore: string;
  preparing: string;
  cloudTitle: string;
  cloudBody: string;
  cloudConfirm: string;
  cloudCancel: string;
  consentTitle: string;
  consentBody: string;
  consentConfirm: string;
  consentCancel: string;
  sources: string;
  contextUpdated: string;
}

interface StarterCopy {
  label: string;
  default: readonly [string, string, string];
  sign: readonly [string, string, string];
  birthChart: readonly [string, string, string];
  tools: readonly [string, string, string];
  astrofolio: readonly [string, string, string];
}

const COPY: Record<AssistantLocale, Copy> = {
  en: {
    title: 'Guide', open: 'Open Guide', close: 'Close Guide', clear: "Clear today's conversation",
    clearAction: 'Clear', clearConfirm: 'Clear?', clearConfirmStatus: 'Select Clear again to erase this conversation.',
    intro: 'Ask about this page, astrology, your birth chart, or published Astrofolio facts.',
    invite: 'I can help with this page, astrology, your birth chart, or Astrofolio.',
    inviteAction: 'Ask Guide', dismissInvite: 'Dismiss Guide welcome', log: 'Guide conversation',
    input: 'Your question', placeholder: 'What would you like help with?', send: 'Send', stop: 'Stop', retry: 'Retry',
    newline: 'Shift + Enter for a new line', context: 'Visible sources', pageSource: 'Using',
    addPage: 'Use this page', removeSource: 'Remove source', chartOn: 'Using my chart', chartOff: 'Use my chart',
    chartReading: 'Reading the placements in your saved chart…', thinking: 'Guide is thinking…',
    stopped: 'Stopped.', complete: 'Answer complete.', empty: 'Write a question first.',
    unavailable: 'Guide is temporarily unavailable. Please try again later.',
    disabled: 'Guide is resting right now. The rest of Zodiacs.org still works.',
    rateLimited: 'Guide is busy or has reached a fair-use limit. Wait a minute; if it continues, come back tomorrow.',
    user: 'You', assistant: 'Guide',
    privacy: 'This conversation stays in this browser session and is not synced to your Zodiacs account. Questions, visible sources, and draft replies are processed by OpenAI. Guide can be wrong.',
    privacyLearnMore: 'Privacy details', preparing: 'Preparing Guide…',
    cloudTitle: 'Before Guide answers',
    cloudBody: 'Guide sends your question, recent Guide messages, and the visible sources above to OpenAI for an input safety check and to generate a draft reply. It then sends that generated draft reply back to OpenAI for a second safety check before showing it. This web Guide conversation stays only in this browser session, is not synced to your account, and is not stored as text by Zodiacs.org. Under standard API controls, OpenAI may retain abuse-monitoring data for up to 30 days. Continue for this Guide day?',
    cloudConfirm: 'Continue with Guide', cloudCancel: 'Not now', consentTitle: 'Before your chart is attached',
    consentBody: 'This is the one chart you explicitly marked as your own. The exact placement lines below will be sent to OpenAI with your question. Zodiacs.org does not attach its saved name, birth date, time, place, or coordinates, and does not store the signed-out conversation.',
    consentConfirm: 'Attach my chart', consentCancel: 'Keep it private', sources: 'From this site:',
    contextUpdated: 'Source removed. Earlier messages remain visible, but Guide will not use them in future answers.',
  },
  es: {
    title: 'Guide', open: 'Abrir Guide', close: 'Cerrar Guide', clear: 'Borrar la conversación de hoy',
    clearAction: 'Borrar', clearConfirm: '¿Borrar?', clearConfirmStatus: 'Selecciona Borrar otra vez para eliminar esta conversación.',
    intro: 'Pregunta sobre esta página, astrología, tu carta natal o datos publicados de Astrofolio.',
    invite: 'Puedo ayudarte con esta página, astrología, tu carta natal o Astrofolio.',
    inviteAction: 'Preguntar a Guide', dismissInvite: 'Cerrar la bienvenida de Guide', log: 'Conversación con Guide',
    input: 'Tu pregunta', placeholder: '¿En qué te puedo ayudar?', send: 'Enviar', stop: 'Detener', retry: 'Reintentar',
    newline: 'Mayús + Intro para una línea nueva', context: 'Fuentes visibles', pageSource: 'En uso',
    addPage: 'Usar esta página', removeSource: 'Quitar fuente', chartOn: 'Usando mi carta', chartOff: 'Usar mi carta',
    chartReading: 'Leyendo las posiciones de tu carta guardada…', thinking: 'Guide está pensando…',
    stopped: 'Detenido.', complete: 'Respuesta completa.', empty: 'Escribe una pregunta primero.',
    unavailable: 'Guide no está disponible temporalmente. Inténtalo de nuevo más tarde.',
    disabled: 'Guide está descansando ahora. El resto de Zodiacs.org sigue funcionando.',
    rateLimited: 'Guide está ocupado o alcanzó un límite de uso justo. Espera un minuto; si continúa, vuelve mañana.', user: 'Tú', assistant: 'Guide',
    privacy: 'Esta conversación permanece en esta sesión del navegador y no se sincroniza con tu cuenta de Zodiacs. OpenAI procesa las preguntas, las fuentes visibles y los borradores de respuesta. Guide puede equivocarse.',
    privacyLearnMore: 'Detalles de privacidad', preparing: 'Preparando Guide…',
    cloudTitle: 'Antes de que Guide responda',
    cloudBody: 'Guide envía tu pregunta, los mensajes recientes y las fuentes visibles a OpenAI para una revisión de seguridad de la entrada y para generar un borrador de respuesta. Después envía ese borrador de respuesta generado de nuevo a OpenAI para una segunda revisión de seguridad antes de mostrártelo. Esta conversación web permanece solo en esta sesión del navegador, no se sincroniza con tu cuenta y Zodiacs.org no almacena su texto. Con los controles estándar de la API, OpenAI puede conservar datos de control de abusos hasta 30 días. ¿Continuar durante este día de Guide?',
    cloudConfirm: 'Continuar con Guide', cloudCancel: 'Ahora no', consentTitle: 'Antes de adjuntar tu carta',
    consentBody: 'Esta es la única carta que marcaste explícitamente como tuya. Las posiciones exactas que aparecen abajo se enviarán a OpenAI con tu pregunta. Zodiacs.org no adjunta tu nombre, fecha, hora, lugar de nacimiento ni coordenadas guardados, y no guarda la conversación.',
    consentConfirm: 'Adjuntar mi carta', consentCancel: 'Mantenerla privada', sources: 'De este sitio:',
    contextUpdated: 'Fuente eliminada. Los mensajes anteriores siguen visibles, pero Guide no los usará en respuestas futuras.',
  },
  pt: {
    title: 'Guide', open: 'Abrir Guide', close: 'Fechar Guide', clear: 'Limpar a conversa de hoje',
    clearAction: 'Limpar', clearConfirm: 'Limpar?', clearConfirmStatus: 'Selecione Limpar novamente para apagar esta conversa.',
    intro: 'Pergunte sobre esta página, astrologia, seu mapa natal ou fatos publicados do Astrofolio.',
    invite: 'Posso ajudar com esta página, astrologia, seu mapa natal ou Astrofolio.',
    inviteAction: 'Perguntar ao Guide', dismissInvite: 'Fechar boas-vindas do Guide', log: 'Conversa com o Guide',
    input: 'Sua pergunta', placeholder: 'Como posso ajudar?', send: 'Enviar', stop: 'Parar', retry: 'Tentar de novo',
    newline: 'Shift + Enter para uma nova linha', context: 'Fontes visíveis', pageSource: 'Em uso',
    addPage: 'Usar esta página', removeSource: 'Remover fonte', chartOn: 'Usando meu mapa', chartOff: 'Usar meu mapa',
    chartReading: 'Lendo as posições do seu mapa salvo…', thinking: 'Guide está pensando…',
    stopped: 'Interrompido.', complete: 'Resposta concluída.', empty: 'Escreva uma pergunta primeiro.',
    unavailable: 'O Guide está temporariamente indisponível. Tente novamente mais tarde.',
    disabled: 'O Guide está descansando agora. O restante do Zodiacs.org continua funcionando.',
    rateLimited: 'O Guide está ocupado ou atingiu um limite de uso justo. Espere um minuto; se continuar, volte amanhã.', user: 'Você', assistant: 'Guide',
    privacy: 'Esta conversa fica nesta sessão do navegador e não é sincronizada com sua conta Zodiacs. Perguntas, fontes visíveis e rascunhos de resposta são processados pela OpenAI. O Guide pode errar.',
    privacyLearnMore: 'Detalhes de privacidade', preparing: 'Preparando o Guide…',
    cloudTitle: 'Antes de o Guide responder',
    cloudBody: 'O Guide envia sua pergunta, as mensagens recentes e as fontes visíveis à OpenAI para uma verificação de segurança da entrada e para gerar um rascunho de resposta. Depois, envia esse rascunho de resposta gerado de volta à OpenAI para uma segunda verificação de segurança antes de mostrá-lo. Esta conversa do Guide na web fica apenas nesta sessão do navegador, não é sincronizada com sua conta e não é armazenada como texto pelo Zodiacs.org. Nos controles padrão da API, a OpenAI pode reter dados de monitoramento de abuso por até 30 dias. Continuar neste dia do Guide?',
    cloudConfirm: 'Continuar com o Guide', cloudCancel: 'Agora não', consentTitle: 'Antes de anexar seu mapa',
    consentBody: 'Este é o único mapa que você marcou explicitamente como seu. As posições exatas abaixo serão enviadas à OpenAI com sua pergunta. O Zodiacs.org não anexa nome, data, hora, local de nascimento nem coordenadas salvos e não armazena a conversa.',
    consentConfirm: 'Anexar meu mapa', consentCancel: 'Manter privado', sources: 'Deste site:',
    contextUpdated: 'Fonte removida. As mensagens anteriores continuam visíveis, mas o Guide não as usará nas próximas respostas.',
  },
  fr: {
    title: 'Guide', open: 'Ouvrir Guide', close: 'Fermer Guide', clear: 'Effacer la conversation du jour',
    clearAction: 'Effacer', clearConfirm: 'Effacer ?', clearConfirmStatus: 'Sélectionne encore Effacer pour supprimer cette conversation.',
    intro: 'Pose une question sur cette page, l’astrologie, ton thème natal ou les faits publiés d’Astrofolio.',
    invite: 'Je peux aider avec cette page, l’astrologie, ton thème natal ou Astrofolio.',
    inviteAction: 'Demander à Guide', dismissInvite: 'Fermer l’accueil de Guide', log: 'Conversation avec Guide',
    input: 'Ta question', placeholder: 'Comment puis-je aider ?', send: 'Envoyer', stop: 'Arrêter', retry: 'Réessayer',
    newline: 'Maj + Entrée pour aller à la ligne', context: 'Sources visibles', pageSource: 'Utilisée',
    addPage: 'Utiliser cette page', removeSource: 'Retirer la source', chartOn: 'Avec mon thème', chartOff: 'Utiliser mon thème',
    chartReading: 'Lecture des positions de ton thème enregistré…', thinking: 'Guide réfléchit…',
    stopped: 'Interrompu.', complete: 'Réponse terminée.', empty: 'Écris d’abord une question.',
    unavailable: 'Guide est temporairement indisponible. Réessaie plus tard.',
    disabled: 'Guide se repose pour le moment. Le reste de Zodiacs.org fonctionne toujours.',
    rateLimited: 'Guide est occupé ou a atteint une limite d’utilisation équitable. Attends une minute ; si cela continue, reviens demain.', user: 'Toi', assistant: 'Guide',
    privacy: 'Cette conversation reste dans cette session du navigateur et n’est pas synchronisée avec ton compte Zodiacs. OpenAI traite les questions, les sources visibles et les brouillons de réponse. Guide peut se tromper.',
    privacyLearnMore: 'Détails de confidentialité', preparing: 'Préparation de Guide…',
    cloudTitle: 'Avant la réponse de Guide',
    cloudBody: 'Guide envoie ta question, les messages récents et les sources visibles à OpenAI pour un contrôle de sécurité de l’entrée et pour produire un brouillon de réponse. Guide renvoie ensuite ce brouillon de réponse généré à OpenAI pour un second contrôle de sécurité avant de te l’afficher. Cette conversation Guide web reste uniquement dans cette session du navigateur, n’est pas synchronisée avec ton compte et n’est pas stockée sous forme de texte par Zodiacs.org. Avec les contrôles API standard, OpenAI peut garder des données de surveillance des abus jusqu’à 30 jours. Continuer pour cette journée Guide ?',
    cloudConfirm: 'Continuer avec Guide', cloudCancel: 'Pas maintenant', consentTitle: 'Avant de joindre ton thème',
    consentBody: 'C’est le seul thème que tu as explicitement indiqué comme étant le tien. Les positions exactes ci-dessous seront envoyées à OpenAI avec ta question. Zodiacs.org ne joint aucun nom, date, heure, lieu de naissance ou coordonnée enregistrés et ne conserve pas la conversation.',
    consentConfirm: 'Joindre mon thème', consentCancel: 'Le garder privé', sources: 'Depuis ce site :',
    contextUpdated: 'Source retirée. Les anciens messages restent visibles, mais Guide ne les utilisera plus dans ses réponses.',
  },
  it: {
    title: 'Guide', open: 'Apri Guide', close: 'Chiudi Guide', clear: 'Cancella la conversazione di oggi',
    clearAction: 'Cancella', clearConfirm: 'Cancellare?', clearConfirmStatus: 'Seleziona di nuovo Cancella per eliminare questa conversazione.',
    intro: 'Chiedi di questa pagina, astrologia, il tuo tema natale o fatti pubblicati di Astrofolio.',
    invite: 'Posso aiutarti con questa pagina, astrologia, il tuo tema natale o Astrofolio.',
    inviteAction: 'Chiedi a Guide', dismissInvite: 'Chiudi il benvenuto di Guide', log: 'Conversazione con Guide',
    input: 'La tua domanda', placeholder: 'Come posso aiutarti?', send: 'Invia', stop: 'Interrompi', retry: 'Riprova',
    newline: 'Maiusc + Invio per andare a capo', context: 'Fonti visibili', pageSource: 'In uso',
    addPage: 'Usa questa pagina', removeSource: 'Rimuovi fonte', chartOn: 'Con il mio tema', chartOff: 'Usa il mio tema',
    chartReading: 'Lettura delle posizioni nel tuo tema salvato…', thinking: 'Guide sta pensando…',
    stopped: 'Interrotto.', complete: 'Risposta completata.', empty: 'Prima scrivi una domanda.',
    unavailable: 'Guide non è disponibile temporaneamente. Riprova più tardi.',
    disabled: 'Guide sta riposando. Il resto di Zodiacs.org continua a funzionare.',
    rateLimited: 'Guide è occupato o ha raggiunto un limite di utilizzo equo. Aspetta un minuto; se continua, torna domani.', user: 'Tu', assistant: 'Guide',
    privacy: 'Questa conversazione resta nella sessione del browser e non viene sincronizzata con il tuo account Zodiacs. OpenAI elabora domande, fonti visibili e bozze di risposta. Guide può sbagliare.',
    privacyLearnMore: 'Dettagli sulla privacy', preparing: 'Preparazione di Guide…',
    cloudTitle: 'Prima che Guide risponda',
    cloudBody: 'Guide invia la tua domanda, i messaggi recenti e le fonti visibili a OpenAI per un controllo di sicurezza dell’input e per generare una bozza di risposta. Poi invia di nuovo a OpenAI la bozza di risposta generata per un secondo controllo di sicurezza prima di mostrartela. Questa conversazione web con Guide resta soltanto in questa sessione del browser, non viene sincronizzata con il tuo account e non viene archiviata come testo da Zodiacs.org. Con i controlli API standard, OpenAI può conservare dati di monitoraggio degli abusi fino a 30 giorni. Continuare per questa giornata Guide?',
    cloudConfirm: 'Continua con Guide', cloudCancel: 'Non ora', consentTitle: 'Prima di allegare il tuo tema',
    consentBody: 'Questo è l’unico tema che hai indicato esplicitamente come tuo. Le posizioni esatte qui sotto saranno inviate a OpenAI con la tua domanda. Zodiacs.org non allega nome, data, ora, luogo di nascita o coordinate salvati e non conserva la conversazione.',
    consentConfirm: 'Allega il mio tema', consentCancel: 'Tienilo privato', sources: 'Da questo sito:',
    contextUpdated: 'Fonte rimossa. I messaggi precedenti restano visibili, ma Guide non li userà nelle risposte future.',
  },
  ru: {
    title: 'Guide', open: 'Открыть Guide', close: 'Закрыть Guide', clear: 'Очистить сегодняшний разговор',
    clearAction: 'Очистить', clearConfirm: 'Очистить?', clearConfirmStatus: 'Нажмите «Очистить» ещё раз, чтобы удалить этот разговор.',
    intro: 'Спросите об этой странице, астрологии, вашей натальной карте или опубликованных материалах Astrofolio.',
    invite: 'Я могу помочь с этой страницей, астрологией, вашей натальной картой или Astrofolio.',
    inviteAction: 'Спросить Guide', dismissInvite: 'Закрыть приветствие Guide', log: 'Разговор с Guide',
    input: 'Ваш вопрос', placeholder: 'Чем вам помочь?', send: 'Отправить', stop: 'Остановить', retry: 'Повторить',
    newline: 'Shift + Enter для новой строки', context: 'Видимые источники', pageSource: 'Используется',
    addPage: 'Использовать эту страницу', removeSource: 'Удалить источник', chartOn: 'Используется моя карта', chartOff: 'Использовать мою карту',
    chartReading: 'Читаю положения в вашей сохранённой карте…', thinking: 'Guide думает…',
    stopped: 'Остановлено.', complete: 'Ответ готов.', empty: 'Сначала напишите вопрос.',
    unavailable: 'Guide временно недоступен. Повторите попытку позже.',
    disabled: 'Guide сейчас отдыхает. Остальная часть Zodiacs.org продолжает работать.',
    rateLimited: 'Guide занят или достиг лимита добросовестного использования. Подождите минуту; если это продолжается, вернитесь завтра.',
    user: 'Вы', assistant: 'Guide',
    privacy: 'Этот разговор остаётся в этой сессии браузера и не синхронизируется с вашей учётной записью Zodiacs. OpenAI обрабатывает вопросы, видимые источники и черновики ответов. Guide может ошибаться.',
    privacyLearnMore: 'Подробнее о конфиденциальности', preparing: 'Подготавливаем Guide…',
    cloudTitle: 'Перед ответом Guide',
    cloudBody: 'Guide отправляет ваш вопрос, недавние сообщения Guide и видимые выше источники в OpenAI для проверки безопасности входных данных и создания черновика ответа. Затем Guide снова отправляет созданный черновик ответа в OpenAI для второй проверки безопасности, прежде чем показать его. Эта веб-беседа Guide остаётся только в этой сессии браузера, не синхронизируется с вашей учётной записью и не хранится Zodiacs.org в виде текста. При стандартных настройках API OpenAI может хранить данные мониторинга злоупотреблений до 30 дней. Продолжить на этот день Guide?',
    cloudConfirm: 'Продолжить с Guide', cloudCancel: 'Не сейчас', consentTitle: 'Перед добавлением вашей карты',
    consentBody: 'Это единственная карта, которую вы явно отметили как свою. Точные строки положений ниже будут отправлены в OpenAI вместе с вашим вопросом. Zodiacs.org не добавляет сохранённые имя, дату, время, место рождения или координаты и не хранит разговор без входа в аккаунт.',
    consentConfirm: 'Добавить мою карту', consentCancel: 'Оставить приватной', sources: 'С этого сайта:',
    contextUpdated: 'Источник удалён. Предыдущие сообщения остаются видимыми, но Guide не будет использовать их в будущих ответах.',
  },
};

const STARTER_COPY: Record<AssistantLocale, StarterCopy> = {
  en: {
    label: 'Try asking',
    default: ['What can I do on Zodiacs.org?', 'How do I find my Sun, Moon, and rising signs?', 'Which astrology tool should I start with?'],
    sign: ['What does this zodiac sign represent?', 'How is this sign different as a Sun sign and rising sign?', 'What should I explore after this guide?'],
    birthChart: ['Explain what I can do on this page.', 'What changes without an exact birth time?', 'What are the Sun, Moon, and rising sign?'],
    tools: ['Which tool should I start with?', 'What changes without an exact birth time?', 'How do I compare two charts?'],
    astrofolio: ['What is Astrofolio?', 'How is it different from the Registry?', 'Where can I verify an official Zodiac token?'],
  },
  es: {
    label: 'Prueba a preguntar',
    default: ['¿Qué puedo hacer en Zodiacs.org?', '¿Cómo encuentro mis signos solar, lunar y ascendente?', '¿Con qué herramienta de astrología debería empezar?'],
    sign: ['¿Qué representa este signo del zodiaco?', '¿Cómo cambia este signo como signo solar o ascendente?', '¿Qué debería explorar después de esta guía?'],
    birthChart: ['Explícame qué puedo hacer en esta página.', '¿Qué cambia sin una hora de nacimiento exacta?', '¿Qué son el Sol, la Luna y el ascendente?'],
    tools: ['¿Con qué herramienta debería empezar?', '¿Qué cambia sin una hora de nacimiento exacta?', '¿Cómo comparo dos cartas?'],
    astrofolio: ['¿Qué es Astrofolio?', '¿En qué se diferencia del Registry?', '¿Dónde puedo verificar un token Zodiac oficial?'],
  },
  pt: {
    label: 'Experimente perguntar',
    default: ['O que posso fazer no Zodiacs.org?', 'Como encontro meus signos solar, lunar e ascendente?', 'Com qual ferramenta de astrologia devo começar?'],
    sign: ['O que este signo do zodíaco representa?', 'Como este signo muda como signo solar ou ascendente?', 'O que devo explorar depois deste guia?'],
    birthChart: ['Explique o que posso fazer nesta página.', 'O que muda sem um horário exato de nascimento?', 'O que são Sol, Lua e ascendente?'],
    tools: ['Com qual ferramenta devo começar?', 'O que muda sem um horário exato de nascimento?', 'Como comparo dois mapas?'],
    astrofolio: ['O que é Astrofolio?', 'Como ele difere do Registry?', 'Onde verifico um token Zodiac oficial?'],
  },
  fr: {
    label: 'Essaie de demander',
    default: ['Que puis-je faire sur Zodiacs.org ?', 'Comment trouver mes signes solaire, lunaire et ascendant ?', 'Par quel outil astrologique commencer ?'],
    sign: ['Que représente ce signe du zodiaque ?', 'Comment ce signe diffère-t-il comme signe solaire ou ascendant ?', 'Que devrais-je explorer après ce guide ?'],
    birthChart: ['Explique-moi ce que je peux faire sur cette page.', 'Que change l’absence d’heure de naissance exacte ?', 'Que sont le Soleil, la Lune et l’ascendant ?'],
    tools: ['Par quel outil commencer ?', 'Que change l’absence d’heure de naissance exacte ?', 'Comment comparer deux thèmes ?'],
    astrofolio: ['Qu’est-ce qu’Astrofolio ?', 'En quoi diffère-t-il du Registry ?', 'Où vérifier un jeton Zodiac officiel ?'],
  },
  it: {
    label: 'Prova a chiedere',
    default: ['Cosa posso fare su Zodiacs.org?', 'Come trovo i miei segni solare, lunare e ascendente?', 'Con quale strumento astrologico dovrei iniziare?'],
    sign: ['Cosa rappresenta questo segno zodiacale?', 'Come cambia questo segno come segno solare o ascendente?', 'Cosa dovrei esplorare dopo questa guida?'],
    birthChart: ['Spiegami cosa posso fare in questa pagina.', 'Cosa cambia senza un’ora di nascita esatta?', 'Cosa sono Sole, Luna e ascendente?'],
    tools: ['Con quale strumento dovrei iniziare?', 'Cosa cambia senza un’ora di nascita esatta?', 'Come confronto due temi?'],
    astrofolio: ['Cos’è Astrofolio?', 'In cosa differisce dal Registry?', 'Dove posso verificare un token Zodiac ufficiale?'],
  },
  ru: {
    label: 'Можно спросить',
    default: ['Что можно делать на Zodiacs.org?', 'Как узнать свои солнечный, лунный и восходящий знаки?', 'С какого астрологического инструмента начать?'],
    sign: ['Что означает этот знак зодиака?', 'Чем этот знак отличается как солнечный и восходящий?', 'Что изучить после этого руководства?'],
    birthChart: ['Объясните, что можно делать на этой странице.', 'Что меняется без точного времени рождения?', 'Что такое Солнце, Луна и восходящий знак?'],
    tools: ['С какого инструмента начать?', 'Что меняется без точного времени рождения?', 'Как сравнить две натальные карты?'],
    astrofolio: ['Что такое Astrofolio?', 'Чем он отличается от Registry?', 'Где проверить официальный токен Zodiac?'],
  },
};

const MAX_INPUT = 2_400;
const MAX_MESSAGES = 12;
const MAX_CHART_CONTEXT = 3_500;
const SESSION_KEY = 'zodiacs.guide.daily-session.v1';
const AUTH_BOUNDARY_KEY = 'zodiacs.guide.auth-boundary.v1';
const INVITE_KEY = 'zodiacs.guide.welcome-seen.v1';
const CONSENT_POLICY_VERSION = 'guide-cloud-processing-2026-08-14.2';
const STYLESHEET_HREF = '/assets/assistant-drawer.css';
const GUIDE_AVATAR_SRC = '/assets/guide-avatar.webp';
const STREAM_SCHEMA = 'zodiacs.guide.stream-event.draft.v1';
const MOBILE_GUIDE_QUERY = '(max-width: 560px), (max-height: 620px) and (pointer: coarse)';
const GUIDE_LINK_PATHS = new Set([
  '/',
  '/ask/',
  '/birth-chart/',
  '/moon-sign/',
  '/methodology/',
  '/transits/',
  '/compatibility/',
  '/learn/',
  '/horoscopes/',
  '/profile/',
  '/registry/',
  '/terminal/',
  '/sdk/',
  '/astrofolio/',
  '/tools/',
  '/aries/',
  '/taurus/',
  '/gemini/',
  '/cancer/',
  '/leo/',
  '/virgo/',
  '/libra/',
  '/scorpio/',
  '/sagittarius/',
  '/capricorn/',
  '/aquarius/',
  '/pisces/',
  '/disclosure/',
]);
let stylesheetPromise: Promise<void> | null = null;

let root: HTMLDivElement | null = null;
let panel: HTMLDivElement | null = null;
let title: HTMLHeadingElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let clearButton: HTMLButtonElement | null = null;
let intro: HTMLParagraphElement | null = null;
let sourcesRegion: HTMLDivElement | null = null;
let pageSourceChip: HTMLDivElement | null = null;
let pageSourceText: HTMLSpanElement | null = null;
let pageSourceRemove: HTMLButtonElement | null = null;
let pageSourceAdd: HTMLButtonElement | null = null;
let transcript: HTMLDivElement | null = null;
let starters: HTMLDivElement | null = null;
let status: HTMLParagraphElement | null = null;
let form: HTMLFormElement | null = null;
let textarea: HTMLTextAreaElement | null = null;
let sendButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let retryButton: HTMLButtonElement | null = null;
let chartButton: HTMLButtonElement | null = null;
let newlineHint: HTMLSpanElement | null = null;
let privacy: HTMLParagraphElement | null = null;
let launcher: HTMLButtonElement | null = null;
let invite: HTMLElement | null = null;
let opener: HTMLElement | null = null;
let activeRequest: AbortController | null = null;
let previousOverflow = '';
let locale: AssistantLocale = 'en';
let session: GuideSession | null = null;
let currentPage: PageInfo | null = null;
let savedChart: StoredChart | null = null;
let chartEnabled = false;
let chartConsented = false;
let chartSourceId: string | null = null;
let chartSummaryPromise: Promise<string | null> | null = null;
let profileAccessGeneration = 0;
let interactionPending = false;
let hasUserOpened = false;
let inviteSeenInMemory = false;
let pendingRetry: PendingTurn | null = null;
let authFencePromise: Promise<void> | null = null;
let authFenceCleanup: (() => void) | null = null;
let authFenceVersion = 0;
let authReady = false;
let openGeneration = 0;
let clearArmed = false;
let clearConfirmationTimer = 0;
let backgroundSnapshot: Array<{ node: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];

interface PendingTurn {
  body: Record<string, unknown>;
  question: string;
  requestHistory: GuideMessage[];
  userMessage: GuideMessage;
  turnId: string;
  attemptId: string;
  userArticle: HTMLElement;
  assistantArticle: HTMLElement;
  assistantBody: HTMLParagraphElement;
  chartAuthority: StoredChart | null;
}

class AssistantFailure extends Error {
  constructor(public code: string, public retryable = false, public accepted = false) {
    super(code);
  }
}

const currentCopy = () => COPY[locale];

function createGuideAvatar(className: string, size: number): HTMLImageElement {
  const image = document.createElement('img');
  image.className = `zguide-avatar ${className}`;
  image.src = GUIDE_AVATAR_SRC;
  image.alt = '';
  image.width = size;
  image.height = size;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.draggable = false;
  image.setAttribute('aria-hidden', 'true');
  image.setAttribute('fetchpriority', 'low');
  return image;
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

function normalizeLocale(value?: string): AssistantLocale {
  return normalizeSiteLocale(value ?? document.documentElement.lang);
}

function track(name: string): void {
  (window as unknown as { zodiacsAnalytics?: { track?: (event: string) => void } })
    .zodiacsAnalytics?.track?.(name);
}

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function localDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

export function guideDayAnchorMatches(
  storedDate: string,
  storedTimeZone: string,
  currentDate: string,
  currentTimeZone: string,
): boolean {
  return storedDate === currentDate && storedTimeZone === currentTimeZone;
}

function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function safeSessionSet(key: string, value: string): boolean {
  try { sessionStorage.setItem(key, value); return true; } catch { return false; }
}

function rememberedAuthBoundary(): string {
  const value = safeSessionGet(AUTH_BOUNDARY_KEY);
  return value && /^(?:signed_out|account:[0-9a-f-]{36}|blocked:[0-9a-f-]{36})$/u.test(value)
    ? value
    : 'signed_out';
}

function isGuideMessage(value: unknown): value is GuideMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Partial<GuideMessage>;
  return typeof message.messageId === 'string'
    && typeof message.turnId === 'string'
    && Number.isSafeInteger(message.sequence)
    && (message.author === 'user' || message.author === 'guide')
    && typeof message.content === 'string'
    && typeof message.contextRevision === 'number'
    && typeof message.createdAt === 'string';
}

function createSession(): GuideSession {
  return {
    version: 1,
    authBoundary: rememberedAuthBoundary(),
    localDate: localDate(),
    timeZone: localTimeZone(),
    conversationId: uuid(),
    localOwnerId: uuid(),
    dailySessionId: uuid(),
    disclosureId: uuid(),
    consentPolicyVersion: CONSENT_POLICY_VERSION,
    cloudConsentGranted: false,
    revision: 0,
    contextRevision: 0,
    contextEpoch: 0,
    nextSequence: 1,
    modelHistoryStartSequence: 1,
    lastPageSourceId: null,
    removedPageSourceIds: [],
    messages: [],
  };
}

function parseSession(raw: string | null): GuideSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<GuideSession>;
    if (value.version !== 1 || value.authBoundary !== rememberedAuthBoundary()
      || value.localDate !== localDate() || value.timeZone !== localTimeZone()
      || typeof value.conversationId !== 'string' || typeof value.localOwnerId !== 'string'
      || typeof value.dailySessionId !== 'string' || typeof value.disclosureId !== 'string'
      || !Number.isSafeInteger(value.revision) || !Number.isSafeInteger(value.contextRevision)
      || !Number.isSafeInteger(value.contextEpoch) || !Number.isSafeInteger(value.nextSequence)
      || !Number.isSafeInteger(value.modelHistoryStartSequence) || !Array.isArray(value.messages)
      || !value.messages.every(isGuideMessage) || !Array.isArray(value.removedPageSourceIds)) return null;
    return {
      ...value,
      consentPolicyVersion: CONSENT_POLICY_VERSION,
      cloudConsentGranted: value.consentPolicyVersion === CONSENT_POLICY_VERSION
        && value.cloudConsentGranted === true,
      messages: value.messages.slice(-MAX_MESSAGES),
      removedPageSourceIds: value.removedPageSourceIds.filter((id): id is string => typeof id === 'string').slice(-20),
    } as GuideSession;
  } catch {
    return null;
  }
}

function saveSession(): void {
  if (!session) return;
  let serialized = JSON.stringify(session);
  while (new TextEncoder().encode(serialized).byteLength > 48_000 && session.messages.length > 2) {
    session.messages = session.messages.slice(2);
    serialized = JSON.stringify(session);
  }
  safeSessionSet(SESSION_KEY, serialized);
}

function getSession(): GuideSession {
  session ??= parseSession(safeSessionGet(SESSION_KEY)) ?? createSession();
  saveSession();
  return session;
}

const PAGE_CATALOG = {
  home: { title: 'Zodiacs.org home', facts: 'The current page is the Zodiacs.org home and starting point for its astrology references and tools.' },
  guide: { title: 'Guide', facts: 'The current page is the canonical Guide home at /ask/.' },
  'birth-chart': { title: 'Birth chart', facts: 'The current page is part of the Zodiacs.org birth-chart calculator.' },
  tools: { title: 'Astrology tools', facts: 'The current page is the Zodiacs.org directory of free astrology tools.' },
  'moon-sign': { title: 'Moon sign', facts: 'The current page is the canonical Zodiacs.org Moon-sign calculator and explanation at /moon-sign/.' },
  'astrology-method': { title: 'Astrology method', facts: 'The current page explains how Zodiacs.org separates astronomical calculation from astrological interpretation.' },
  transits: { title: 'Transits', facts: 'The current page is part of the Zodiacs.org current-sky and transit tools.' },
  compatibility: { title: 'Compatibility', facts: 'The current page is part of the Zodiacs.org chart-comparison and compatibility guides.' },
  learn: { title: 'Learn astrology', facts: 'The current page is part of the Zodiacs.org Learn astrology reference.' },
  horoscopes: { title: 'Horoscopes and Today', facts: 'The current page is part of the dated Zodiacs.org horoscope or Today editions.' },
  account: { title: 'Optional Zodiacs account', facts: 'The current page is part of the optional Zodiacs account and saved-chart area.' },
  registry: { title: 'Zodiacs Registry', facts: 'The current page is part of the read-only Zodiacs Registry.' },
  terminal: { title: 'Zodiac Terminal', facts: 'The current page is part of the Zodiacs.org market-and-research interface.' },
  astrofolio: { title: 'Astrofolio', facts: 'The current page is the Zodiacs.org Astrofolio collection and its public acquisition guide.' },
  sdk: { title: 'Zodiacs SDK', facts: 'The current page is part of the public Zodiacs SDK documentation.' },
  disclosure: { title: 'Ownership and market disclosure', facts: 'The current page is the dated Zodiacs.org ownership and market disclosure.' },
  'sign-aries': { title: 'Aries sign guide', facts: 'The current page is the canonical Zodiacs.org Aries sign guide.' },
  'sign-taurus': { title: 'Taurus sign guide', facts: 'The current page is the canonical Zodiacs.org Taurus sign guide.' },
  'sign-gemini': { title: 'Gemini sign guide', facts: 'The current page is the canonical Zodiacs.org Gemini sign guide.' },
  'sign-cancer': { title: 'Cancer sign guide', facts: 'The current page is the canonical Zodiacs.org Cancer sign guide.' },
  'sign-leo': { title: 'Leo sign guide', facts: 'The current page is the canonical Zodiacs.org Leo sign guide.' },
  'sign-virgo': { title: 'Virgo sign guide', facts: 'The current page is the canonical Zodiacs.org Virgo sign guide.' },
  'sign-libra': { title: 'Libra sign guide', facts: 'The current page is the canonical Zodiacs.org Libra sign guide.' },
  'sign-scorpio': { title: 'Scorpio sign guide', facts: 'The current page is the canonical Zodiacs.org Scorpio sign guide.' },
  'sign-sagittarius': { title: 'Sagittarius sign guide', facts: 'The current page is the canonical Zodiacs.org Sagittarius sign guide.' },
  'sign-capricorn': { title: 'Capricorn sign guide', facts: 'The current page is the canonical Zodiacs.org Capricorn sign guide.' },
  'sign-aquarius': { title: 'Aquarius sign guide', facts: 'The current page is the canonical Zodiacs.org Aquarius sign guide.' },
  'sign-pisces': { title: 'Pisces sign guide', facts: 'The current page is the canonical Zodiacs.org Pisces sign guide.' },
} as const;

type PageCatalogId = keyof typeof PAGE_CATALOG;

const RUSSIAN_PAGE_TITLES: Partial<Record<PageCatalogId, string>> = {
  home: 'Главная Zodiacs.org',
  guide: 'Guide',
  'birth-chart': 'Натальная карта',
  tools: 'Астрологические инструменты',
  'moon-sign': 'Лунный знак',
  'astrology-method': 'Метод астрологии',
  transits: 'Транзиты',
  compatibility: 'Совместимость',
  learn: 'Изучение астрологии',
  horoscopes: 'Гороскопы и Сегодня',
  account: 'Необязательная учётная запись Zodiacs',
  registry: 'Реестр Zodiacs',
  terminal: 'Терминал Zodiac',
  astrofolio: 'Astrofolio',
  sdk: 'Zodiacs SDK',
  disclosure: 'Раскрытие информации о владении и рынке',
  'sign-aries': 'Руководство по знаку Овен',
  'sign-taurus': 'Руководство по знаку Телец',
  'sign-gemini': 'Руководство по знаку Близнецы',
  'sign-cancer': 'Руководство по знаку Рак',
  'sign-leo': 'Руководство по знаку Лев',
  'sign-virgo': 'Руководство по знаку Дева',
  'sign-libra': 'Руководство по знаку Весы',
  'sign-scorpio': 'Руководство по знаку Скорпион',
  'sign-sagittarius': 'Руководство по знаку Стрелец',
  'sign-capricorn': 'Руководство по знаку Козерог',
  'sign-aquarius': 'Руководство по знаку Водолей',
  'sign-pisces': 'Руководство по знаку Рыбы',
};

function localizedPageTitle(id: PageCatalogId): string {
  return locale === 'ru' ? RUSSIAN_PAGE_TITLES[id] ?? PAGE_CATALOG[id].title : PAGE_CATALOG[id].title;
}

export function approvedPageId(pathname: string): PageCatalogId | null {
  const path = pathname.replace(/^\/(?:es|pt|fr|it|ru)(?=\/|$)/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/ask/' || path === '/ask') return 'guide';
  const sign = path.match(/^\/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\/?$/u)?.[1];
  if (sign) return `sign-${sign}` as PageCatalogId;
  if (/^\/tools(?:\/|$)/.test(path)) return 'tools';
  if (/^\/astrofolio(?:\/|$)/.test(path)) return 'astrofolio';
  if (/^\/moon-sign(?:\/|$)/.test(path)) return 'moon-sign';
  if (/^\/(?:birth-chart|rising-sign|solar-return|saturn-return|baby-zodiac)(?:\/|$)/.test(path)) return 'birth-chart';
  if (/^\/methodology(?:\/|$)/.test(path)) return 'astrology-method';
  if (/^\/(?:transits|events|moon-phase|full-moon-calendar|full-moon|new-moon|eclipses|retrogrades|mercury-retrograde|mars-retrograde|venus-retrograde)(?:\/|$)/.test(path)) return 'transits';
  if (/^\/compatibility(?:\/|$)/.test(path)) return 'compatibility';
  if (/^\/learn(?:\/|$)/.test(path)) return 'learn';
  if (/^\/(?:horoscopes|today)(?:\/|$)/.test(path)) return 'horoscopes';
  if (/^\/(?:profile|account)(?:\/|$)/.test(path)) return 'account';
  if (/^\/registry(?:\/|$)/.test(path)) return 'registry';
  if (/^\/terminal(?:\/|$)/.test(path)) return 'terminal';
  if (/^\/sdk(?:\/|$)/.test(path)) return 'sdk';
  if (/^\/disclosure(?:\/|$)/.test(path)) return 'disclosure';
  return null;
}

function pageInfo(): PageInfo | null {
  // Only the pathname selects a fixed public catalog entry. Queries,
  // referrers, DOM text, and document titles are never read into context.
  const id = approvedPageId(location.pathname);
  if (!id) return null;
  const approved = PAGE_CATALOG[id];
  return { catalogId: id, sourceId: `page:${id}`, title: localizedPageTitle(id), facts: approved.facts };
}

function clearPendingRetry(): void {
  pendingRetry = null;
  if (retryButton) retryButton.hidden = true;
}

function invalidateContext(cutOffHistory: boolean, renewCloudConsent = false): void {
  const state = getSession();
  state.revision += 1;
  state.contextRevision += 1;
  state.contextEpoch += 1;
  if (cutOffHistory) state.modelHistoryStartSequence = state.nextSequence;
  if (renewCloudConsent) state.cloudConsentGranted = false;
  clearPendingRetry();
  saveSession();
}

function syncPageBoundary(): void {
  currentPage = pageInfo();
  const state = getSession();
  if (!currentPage) {
    if (state.lastPageSourceId !== null) {
      state.lastPageSourceId = null;
      invalidateContext(true);
    }
    syncSourceControls();
    return;
  }
  if (state.lastPageSourceId === null) {
    state.lastPageSourceId = currentPage.sourceId;
    invalidateContext(false);
  } else if (state.lastPageSourceId !== currentPage.sourceId) {
    state.lastPageSourceId = currentPage.sourceId;
    invalidateContext(true, true);
  }
  syncSourceControls();
}

function pageSourceEnabled(): boolean {
  const state = getSession();
  return Boolean(currentPage && !state.removedPageSourceIds.includes(currentPage.sourceId));
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

async function sha256Hex(value: string): Promise<string> {
  if (!crypto.subtle) throw new AssistantFailure('unavailable');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function localSource(candidate: Omit<GuideContextSource, 'contentDigest'>): Promise<GuideContextSource> {
  const contentDigest = await sha256Hex(canonicalJson({
    domain: 'zodiacs.guide.source-content.draft.v1',
    kind: candidate.kind,
    sourceId: candidate.sourceId,
    sourceRevision: candidate.sourceRevision,
    title: candidate.title,
    facts: candidate.facts,
    subject: candidate.subject,
    containsThirdPartyData: candidate.containsThirdPartyData,
  }));
  return { ...candidate, contentDigest };
}

function sourceScope(source: GuideContextSource | null) {
  return source === null ? null : {
    kind: source.kind,
    sourceId: source.sourceId,
    sourceRevision: source.sourceRevision,
    contentDigest: source.contentDigest,
    subject: {
      boundary: source.subject.boundary,
      subjectId: source.subject.subjectId,
      subjectIsUser: source.subject.subjectIsUser,
    },
  };
}

async function contextScopeDigest(
  history: GuideMessage[],
  ownerChart: GuideContextSource | null,
  attachments: GuideContextSource[],
): Promise<string> {
  const state = getSession();
  const historyProjection = await Promise.all(history.map(async (message) => ({
    sequence: message.sequence,
    messageId: message.messageId,
    author: message.author,
    contentDigest: await sha256Hex(message.content),
  })));
  return sha256Hex(canonicalJson({
    domain: 'zodiacs.guide.context-scope.draft.v1',
    conversationId: state.conversationId,
    contextEpoch: state.contextEpoch,
    modelHistoryStartSequence: state.modelHistoryStartSequence,
    history: historyProjection,
    base: [
      { slot: 'owner_chart', state: ownerChart ? 'active' : 'unavailable', source: sourceScope(ownerChart) },
      { slot: 'today_sky', state: 'unavailable', source: null },
    ],
    attachments: attachments.map(sourceScope),
  }));
}

function finiteLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
}

function parseStoredChart(value: unknown): StoredChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const rawBirth = candidate.birth;
  const rawSummary = candidate.summary;
  if (!rawBirth || typeof rawBirth !== 'object' || Array.isArray(rawBirth)) return null;
  if (!rawSummary || typeof rawSummary !== 'object' || Array.isArray(rawSummary)) return null;
  const birth = rawBirth as Record<string, unknown>;
  const summary = rawSummary as Record<string, unknown>;
  const bodies = Array.isArray(summary.bodies) ? summary.bodies.flatMap((body): StoredBody[] => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
    const record = body as Record<string, unknown>;
    if (typeof record.body !== 'string' || !record.body.trim() || !finiteLongitude(record.lon)) return [];
    return [{ body: record.body.trim(), lon: record.lon, retrograde: record.retrograde === true }];
  }) : [];
  if (!bodies.length) return null;
  let angles: StoredChart['summary']['angles'] = null;
  if (summary.angles && typeof summary.angles === 'object' && !Array.isArray(summary.angles)) {
    const value = summary.angles as Record<string, unknown>;
    if (finiteLongitude(value.asc) && finiteLongitude(value.mc)) angles = { asc: value.asc, mc: value.mc };
  }
  let place: StoredChart['birth']['place'] = null;
  if (birth.place && typeof birth.place === 'object' && !Array.isArray(birth.place)) {
    const value = birth.place as Record<string, unknown>;
    if (typeof value.lat === 'number' && Number.isFinite(value.lat)
      && typeof value.lon === 'number' && Number.isFinite(value.lon)
      && typeof value.tz === 'string' && value.tz.trim()) {
      place = { lat: value.lat, lon: value.lon, tz: value.tz };
    }
  }
  return {
    id: typeof candidate.id === 'string' ? candidate.id : '',
    name: typeof candidate.name === 'string' ? candidate.name : '',
    accountRevision: -1,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
    birth: {
      date: typeof birth.date === 'string' ? birth.date : '',
      time: typeof birth.time === 'string' ? birth.time : null,
      timeKnown: birth.timeKnown === true,
      place,
    },
    summary: { houseSystem: summary.houseSystem === 'placidus' ? 'placidus' : 'whole', bodies, angles },
  };
}

function parseLocalOwner(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const owner = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(owner).length === 2 && owner.version === 1 && isAccountV2Id(owner.accountId)
      ? owner.accountId
      : null;
  } catch { return null; }
}

/** Resolve only the one chart explicitly selected under account-v2's self attestation. */
export function selectedSelfChartFromJson(
  profileRaw: string | null,
  ownerRaw: string | null,
  metadataRaw: string | null,
): StoredChart | null {
  if (!profileRaw || !metadataRaw) return null;
  const accountId = parseLocalOwner(ownerRaw);
  if (!accountId) return null;
  try {
    const profile = JSON.parse(profileRaw) as { version?: unknown; charts?: unknown };
    const metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
    if (profile?.version !== 1 || !Array.isArray(profile.charts)
      || metadata.version !== 1 || metadata.accountId !== accountId
      || !Array.isArray(metadata.charts) || metadata.charts.length > 64) return null;
    const selected = metadata.charts.filter((entry): entry is Record<string, unknown> => (
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
      && isAccountV2Id((entry as Record<string, unknown>).chartId)
      && (entry as Record<string, unknown>).selectedForSync === true
      && Number.isSafeInteger((entry as Record<string, unknown>).serverRevision)
      && Number((entry as Record<string, unknown>).serverRevision) >= 0
    ));
    if (selected.length !== 1) return null;
    const selectedId = selected[0].chartId;
    const chart = profile.charts.map(parseStoredChart).find((candidate) => (
      candidate !== null && candidate.id === selectedId
      && isAccountV2Id(candidate.id) && candidate.name.trim().length > 0
    )) ?? null;
    return chart ? { ...chart, accountRevision: Number(selected[0].serverRevision) } : null;
  } catch { return null; }
}

function sameSelfChartAuthority(left: StoredChart | null, right: StoredChart | null): boolean {
  return left !== null && right !== null
    && left.id === right.id
    && left.updatedAt === right.updatedAt
    && left.accountRevision === right.accountRevision;
}

function readSelectedSelfChart(): StoredChart | null {
  if (!profileAccessAllowed()) return null;
  try {
    const ownerRaw = localStorage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY);
    const ownerId = parseLocalOwner(ownerRaw);
    if (!ownerId || getSession().authBoundary !== `account:${ownerId}`) return null;
    return selectedSelfChartFromJson(
      localStorage.getItem(PROFILE_KEY),
      ownerRaw,
      localStorage.getItem(`${ACCOUNT_V2_STORAGE_PREFIX}account.${ownerId}.v1`),
    );
  } catch { return null; }
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

/** Resolve a saved chart to placement lines without returning birth inputs. */
export async function placementSummaryForChart(chart: StoredChart): Promise<string | null> {
  let bodies = chart.summary.bodies;
  let angles = chart.birth.timeKnown ? chart.summary.angles : null;
  let cusps: number[] | null = null;
  if (chart.birth.timeKnown && angles && chart.summary.houseSystem === 'whole') cusps = wholeSignCusps(angles.asc);
  const canResolvePlacidus = chart.summary.houseSystem === 'placidus' && chart.birth.timeKnown
    && chart.birth.place !== null && /^\d{4}-\d{2}-\d{2}$/.test(chart.birth.date)
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
      cusps = validCusps(computed.houses?.cusps) ? computed.houses.cusps : null;
    } catch { cusps = null; }
  }
  const lines = bodies.map(({ body, lon, retrograde }) => {
    const house = cusps ? houseOf(lon, cusps) : null;
    return `${body}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}${retrograde ? ' · retrograde' : ''}`;
  });
  if (angles) {
    for (const [label, lon] of [['ASC', angles.asc], ['MC', angles.mc]] as const) {
      const house = cusps ? houseOf(lon, cusps) : null;
      lines.push(`${label}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}`);
    }
  }
  if (!lines.length) return null;
  return `Tropical chart placements:\n${lines.join('\n')}`.slice(0, MAX_CHART_CONTEXT);
}

export interface ParsedAssistantFrame {
  delta?: string;
  done?: boolean;
  error?: string;
  event?: Record<string, unknown>;
}

/** Parse one SSE frame without trusting or rendering server HTML. */
export function parseAssistantSseFrame(frame: string): ParsedAssistantFrame {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, '')).join('\n');
  if (!data) return {};
  if (data === '[DONE]') return { done: true };
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (typeof parsed.error === 'string') return { error: parsed.error };
    if (typeof parsed.t === 'string') return { delta: parsed.t };
    if (typeof parsed.type === 'string') return { event: parsed };
  } catch { return { error: 'temporarily_unavailable' }; }
  return {};
}

interface StreamResult {
  message: GuideMessage;
  conversationRevision: number;
}

async function consumeGuideStream(
  response: Response,
  pending: PendingTurn,
  onDelta: (delta: string) => void,
): Promise<StreamResult> {
  if (!response.body) throw new AssistantFailure('temporarily_unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let expectedSequence = 0;
  let acceptedRevision: number | null = null;
  let completed: StreamResult | null = null;
  const consumeFrame = (frame: string): boolean => {
    const parsed = parseAssistantSseFrame(frame);
    if (parsed.error) throw new AssistantFailure(parsed.error, false, acceptedRevision !== null);
    const event = parsed.event;
    if (!event) return false;
    if (event.schema !== STREAM_SCHEMA || event.conversationId !== getSession().conversationId
      || event.turnId !== pending.turnId || event.attemptId !== pending.attemptId
      || event.eventSequence !== expectedSequence) {
      throw new AssistantFailure('invalid_response', false, acceptedRevision !== null);
    }
    expectedSequence += 1;
    if (event.type === 'accepted') {
      if (acceptedRevision !== null || event.conversationRevision !== getSession().revision + 1) {
        throw new AssistantFailure('invalid_response', false, true);
      }
      acceptedRevision = event.conversationRevision as number;
      return false;
    }
    if (acceptedRevision === null) throw new AssistantFailure('invalid_response');
    if (event.type === 'delta' && typeof event.delta === 'string') {
      onDelta(event.delta);
      return false;
    }
    if (event.type === 'error' && typeof event.code === 'string') {
      throw new AssistantFailure(event.code, false, true);
    }
    if (event.type === 'cancelled') throw new AssistantFailure('cancelled', false, true);
    if (event.type === 'completed') {
      const message = event.message;
      if (!isGuideMessage(message) || message.author !== 'guide' || message.turnId !== pending.turnId
        || message.sequence !== pending.userMessage.sequence + 1
        || event.conversationRevision !== acceptedRevision + 1) {
        throw new AssistantFailure('invalid_response', false, true);
      }
      completed = { message, conversationRevision: event.conversationRevision as number };
      return true;
    }
    throw new AssistantFailure('invalid_response', false, true);
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
        return completed!;
      }
      boundary = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
  if (buffer.trim() && consumeFrame(buffer)) return completed!;
  throw new AssistantFailure('temporarily_unavailable', false, acceptedRevision !== null);
}

/** Legacy test helper retained while first-party callers move to Guide events. */
export async function consumeAssistantStream(response: Response, onDelta: (delta: string) => void): Promise<void> {
  if (!response.body) throw new AssistantFailure('temporarily_unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consume = (frame: string) => {
    const parsed = parseAssistantSseFrame(frame);
    if (parsed.error) throw new AssistantFailure(parsed.error);
    if (parsed.delta) onDelta(parsed.delta);
    return parsed.done === true;
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = buffer.match(/\r?\n\r?\n/);
    while (boundary?.index !== undefined) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      if (consume(frame)) { await reader.cancel().catch(() => {}); return; }
      boundary = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
  if (buffer.trim() && consume(buffer)) return;
  throw new AssistantFailure('temporarily_unavailable');
}

/** Model text is always inserted as text nodes; only same-site paths become links. */
export function renderAssistantText(container: HTMLElement, text: string): void {
  container.textContent = '';
  const pattern = /(^|[\s([])(\/(?!\/)[^\s<>"`]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[1].length;
    let path = match[2];
    while (/[.,!?;:)\]]$/.test(path)) path = path.slice(0, -1);
    if (!path || path.includes('\\') || path.includes('?')) continue;
    let valid = false;
    try {
      const url = new URL(path, location.origin);
      valid = url.origin === location.origin
        && url.search === ''
        && GUIDE_LINK_PATHS.has(`${url.pathname}${url.hash}`);
    } catch { valid = false; }
    if (!valid) continue;
    container.append(document.createTextNode(text.slice(cursor, start)));
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = path;
    anchor.className = 'zassistant__link';
    container.append(anchor);
    cursor = start + path.length;
  }
  container.append(document.createTextNode(text.slice(cursor)));
}

function scrollTranscript(): void {
  requestAnimationFrame(() => { if (transcript) transcript.scrollTop = transcript.scrollHeight; });
}

function mobileGuideMode(): boolean {
  return window.matchMedia(MOBILE_GUIDE_QUERY).matches;
}

function starterQuestions(): readonly [string, string, string] {
  const copy = STARTER_COPY[locale];
  const id = currentPage?.catalogId;
  if (id?.startsWith('sign-')) return copy.sign;
  if (id === 'birth-chart') return copy.birthChart;
  if (id === 'tools') return copy.tools;
  if (id === 'astrofolio') return copy.astrofolio;
  return copy.default;
}

function removeStarters(): void {
  starters?.closest('.zassistant__empty')?.remove();
  starters = null;
}

function renderStarters(): void {
  removeStarters();
  if (!authReady || !transcript || getSession().messages.length > 0) return;
  const empty = document.createElement('div');
  empty.className = 'zassistant__empty';
  const label = document.createElement('p');
  label.className = 'zassistant__empty-label mono';
  label.textContent = STARTER_COPY[locale].label;
  starters = document.createElement('div');
  starters.className = 'zassistant__starters';
  for (const prompt of starterQuestions()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zassistant__starter';
    button.textContent = prompt;
    button.addEventListener('click', () => {
      if (!authReady || !textarea || !form || activeRequest || interactionPending) return;
      textarea.value = prompt;
      syncTextareaHeight();
      syncSendState();
      form.requestSubmit();
    });
    starters.append(button);
  }
  empty.append(label, starters);
  transcript.append(empty);
}

function appendMessage(role: GuideAuthor, content: string): { article: HTMLElement; body: HTMLParagraphElement } {
  removeStarters();
  const article = document.createElement('article');
  article.className = `zassistant__message zassistant__message--${role === 'guide' ? 'assistant' : 'user'}`;
  const label = document.createElement('span');
  label.className = 'zassistant__speaker mono';
  if (role === 'guide') {
    label.append(
      createGuideAvatar('zassistant__message-avatar', 20),
      document.createTextNode(currentCopy().assistant),
    );
  } else {
    label.textContent = currentCopy().user;
  }
  const body = document.createElement('p');
  body.className = 'zassistant__message-body';
  body.textContent = content;
  article.append(label, body);
  transcript?.appendChild(article);
  if (intro) intro.hidden = true;
  syncClearButton();
  scrollTranscript();
  return { article, body };
}

function renderTranscript(): void {
  transcript?.replaceChildren();
  for (const message of getSession().messages) {
    const bubble = appendMessage(message.author, message.content);
    if (message.author === 'guide') {
      renderAssistantText(bubble.body, message.content);
      appendSourcesRow(bubble.body, message.content);
    }
  }
  const hasMessages = getSession().messages.length > 0;
  if (!hasMessages) renderStarters();
  if (intro) intro.hidden = hasMessages;
  syncClearButton();
}

function setStatus(message = ''): void { if (status) status.textContent = message; }

function syncTextareaHeight(): void {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
}

function syncSendState(): void {
  if (!sendButton || !textarea) return;
  sendButton.disabled = !authReady || Boolean(activeRequest) || interactionPending || !textarea.value.trim();
}

function cancelClearConfirmation(): void {
  clearArmed = false;
  if (clearConfirmationTimer) window.clearTimeout(clearConfirmationTimer);
  clearConfirmationTimer = 0;
  clearButton?.classList.remove('is-armed');
  if (clearButton) {
    clearButton.textContent = currentCopy().clearAction;
    clearButton.setAttribute('aria-label', currentCopy().clear);
  }
}

function syncClearButton(): void {
  if (!clearButton) return;
  const hasMessages = Boolean(transcript?.querySelector('.zassistant__message'))
    || (authReady && getSession().messages.length > 0);
  clearButton.hidden = !authReady || !hasMessages;
  clearButton.disabled = !authReady || Boolean(activeRequest) || interactionPending;
  if (!hasMessages) cancelClearConfirmation();
}

function syncChartButton(): void {
  if (!chartButton) return;
  chartButton.hidden = !savedChart;
  chartButton.disabled = Boolean(activeRequest) || interactionPending;
  chartButton.setAttribute('aria-pressed', String(chartEnabled));
  chartButton.classList.toggle('is-active', chartEnabled);
  chartButton.textContent = chartEnabled ? currentCopy().chartOn : currentCopy().chartOff;
}

function syncSourceControls(): void {
  if (!authReady) {
    if (pageSourceChip) pageSourceChip.hidden = true;
    if (pageSourceAdd) pageSourceAdd.hidden = true;
    if (chartButton) chartButton.hidden = true;
    return;
  }
  const enabled = pageSourceEnabled();
  if (pageSourceChip) pageSourceChip.hidden = !enabled;
  if (pageSourceText && currentPage) pageSourceText.textContent = `${currentCopy().pageSource}: ${currentPage.title}`;
  if (pageSourceRemove && currentPage) {
    pageSourceRemove.setAttribute('aria-label', `${currentCopy().removeSource}: ${currentPage.title}`);
  }
  if (pageSourceAdd) pageSourceAdd.hidden = !currentPage || enabled;
  if (pageSourceRemove) pageSourceRemove.disabled = Boolean(activeRequest) || interactionPending;
  if (pageSourceAdd) pageSourceAdd.disabled = Boolean(activeRequest) || interactionPending;
  syncChartButton();
  syncClearButton();
}

function setBusy(busy: boolean): void {
  activeRequest = busy ? activeRequest : null;
  panel?.setAttribute('aria-busy', String(busy));
  transcript?.setAttribute('aria-busy', String(busy));
  transcript?.setAttribute('aria-live', busy ? 'off' : 'polite');
  if (stopButton) stopButton.hidden = !busy;
  syncSendState();
  syncSourceControls();
}

function refreshSavedChart(): void {
  dismissPendingConsent?.();
  const next = readSelectedSelfChart();
  if (chartEnabled) invalidateContext(true);
  savedChart = next;
  chartEnabled = false;
  chartConsented = false;
  chartSourceId = null;
  chartSummaryPromise = null;
  syncSourceControls();
}

function friendlyFailure(code: string): string {
  if (code === 'rate_limited' || code === 'limit' || code === '429') return currentCopy().rateLimited;
  if (code === 'disabled') return currentCopy().disabled;
  if (code === 'cancelled') return currentCopy().stopped;
  return currentCopy().unavailable;
}

async function failure(response: Response): Promise<AssistantFailure> {
  try {
    const data = await response.json() as { code?: unknown; error?: unknown; retryable?: unknown };
    const code = typeof data.code === 'string' ? data.code
      : typeof data.error === 'string' ? data.error : String(response.status);
    return new AssistantFailure(code, data.retryable === true, false);
  } catch {
    return new AssistantFailure(response.status === 429 ? 'rate_limited' : 'temporarily_unavailable', response.status >= 500);
  }
}

function abortRequest(): void { activeRequest?.abort(); }

let dismissPendingConsent: (() => void) | null = null;
let dismissPendingCloudConsent: (() => void) | null = null;

function currentProfileAccessGeneration(generation: number): boolean {
  return generation === profileAccessGeneration;
}

function replaceWithFreshSession(): void {
  session = createSession();
  syncPageBoundary();
  saveSession();
}

function clearAssistantForProfileRevocation(): void {
  abortRequest();
  dismissPendingConsent?.();
  dismissPendingCloudConsent?.();
  dismissPendingConsent = null;
  dismissPendingCloudConsent = null;
  savedChart = null;
  chartSummaryPromise = null;
  chartConsented = false;
  chartEnabled = false;
  chartSourceId = null;
  pendingRetry = null;
  replaceWithFreshSession();
  if (authReady) renderTranscript();
  else transcript?.replaceChildren();
  if (intro) intro.hidden = false;
  if (textarea) { textarea.value = ''; syncTextareaHeight(); }
  if (retryButton) retryButton.hidden = true;
  setStatus();
  setBusy(false);
}

function rotateGuideDayIfNeeded(): boolean {
  const state = getSession();
  if (guideDayAnchorMatches(state.localDate, state.timeZone, localDate(), localTimeZone())) return false;
  profileAccessGeneration += 1;
  clearAssistantForProfileRevocation();
  return true;
}

function applyGuideAuthBoundary(next: string, invalidateEpoch: boolean): void {
  const state = getSession();
  const changed = state.authBoundary !== next;
  if (invalidateEpoch || changed) profileAccessGeneration += 1;
  if (!changed) return;
  safeSessionSet(AUTH_BOUNDARY_KEY, next);
  clearAssistantForProfileRevocation();
}

/** Resolve account identity only when Guide is opened; the generic welcome stays lightweight. */
async function ensureGuideAuthFence(): Promise<void> {
  authFencePromise ??= (async () => {
    const fenceVersion = authFenceVersion;
    try {
      const { getSupabaseClient } = await import('../supabase/client');
      if (fenceVersion !== authFenceVersion) return;
      const client = getSupabaseClient();
      if (!client) {
        applyGuideAuthBoundary('signed_out', false);
        return;
      }
      let authEventVersion = 0;
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (fenceVersion !== authFenceVersion) return;
        authEventVersion += 1;
        const accountId = nextSession?.user?.id;
        applyGuideAuthBoundary(
          isAccountV2Id(accountId) ? `account:${accountId}` : 'signed_out',
          false,
        );
      });
      if (fenceVersion !== authFenceVersion) {
        subscription.unsubscribe();
        return;
      }
      authFenceCleanup = () => subscription.unsubscribe();
      const snapshotVersion = authEventVersion;
      const { data, error } = await client.auth.getSession();
      if (fenceVersion !== authFenceVersion || snapshotVersion !== authEventVersion) return;
      if (error) {
        applyGuideAuthBoundary(`blocked:${uuid()}`, true);
        return;
      }
      const accountId = data.session?.user?.id;
      applyGuideAuthBoundary(
        isAccountV2Id(accountId) ? `account:${accountId}` : 'signed_out',
        false,
      );
    } catch {
      if (fenceVersion !== authFenceVersion) return;
      applyGuideAuthBoundary(`blocked:${uuid()}`, true);
    }
  })();
  await authFencePromise;
}

function suspendGuideForPageCache(): void {
  profileAccessGeneration += 1;
  openGeneration += 1;
  authReady = false;
  authFenceVersion += 1;
  authFenceCleanup?.();
  authFenceCleanup = null;
  authFencePromise = null;
  abortRequest();
  dismissPendingConsent?.();
  dismissPendingCloudConsent?.();
  dismissPendingConsent = null;
  dismissPendingCloudConsent = null;
  savedChart = null;
  chartSummaryPromise = null;
  chartConsented = false;
  chartEnabled = false;
  chartSourceId = null;
  clearPendingRetry();
  interactionPending = false;
  transcript?.replaceChildren();
  if (intro) intro.hidden = false;
  if (textarea) { textarea.value = ''; syncTextareaHeight(); }
  if (root) root.hidden = true;
  stopVisualViewportTracking();
  document.documentElement.style.overflow = previousOverflow;
  launcher?.removeAttribute('aria-expanded');
  restoreBackground();
  opener = null;
  setStatus();
  setBusy(false);
}

function restoreGuideAfterPageCache(event: PageTransitionEvent): void {
  if (!event.persisted) return;
  // The private drawer remains hidden until a fresh auth snapshot resolves.
  void ensureGuideAuthFence();
}

function onProfileAccessChange(): void {
  profileAccessGeneration += 1;
  if (profileAccessAllowed()) {
    if (hasUserOpened && authReady) refreshSavedChart();
    return;
  }
  clearAssistantForProfileRevocation();
}

function onProfileDataChange(): void {
  profileAccessGeneration += 1;
  clearPendingRetry();
  abortRequest();
  dismissPendingConsent?.();
  dismissPendingConsent = null;
  if (hasUserOpened && authReady) refreshSavedChart();
}

function onGuideStorageChange(event: StorageEvent): void {
  try {
    if (event.storageArea !== localStorage) return;
    if (event.key === null || event.key === PROFILE_KEY || event.key === ACCOUNT_V2_LOCAL_OWNER_KEY
      || event.key?.startsWith(`${ACCOUNT_V2_STORAGE_PREFIX}account.`)) onProfileDataChange();
  } catch {
    onProfileDataChange();
  }
}

function consentCard(
  headingText: string,
  bodyText: string,
  confirmText: string,
  cancelText: string,
  previewText?: string,
): { card: HTMLElement; promise: Promise<boolean>; dismiss: () => void } {
  const card = document.createElement('section');
  card.className = 'zassistant__consent';
  const heading = document.createElement('h3');
  heading.textContent = headingText;
  const body = document.createElement('p');
  body.textContent = bodyText;
  card.append(heading, body);
  if (previewText) {
    const preview = document.createElement('pre');
    preview.className = 'zassistant__consent-preview';
    preview.textContent = previewText;
    card.append(preview);
  }
  const actions = document.createElement('div');
  actions.className = 'zassistant__consent-actions';
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'zassistant__consent-confirm';
  confirm.textContent = confirmText;
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'zassistant__consent-cancel';
  cancel.textContent = cancelText;
  actions.append(confirm, cancel);
  card.append(actions);
  transcript?.append(card);
  scrollTranscript();
  let settle!: (value: boolean) => void;
  const promise = new Promise<boolean>((resolve) => { settle = resolve; });
  let settled = false;
  const finish = (value: boolean) => {
    if (settled) return;
    settled = true;
    card.remove();
    settle(value);
  };
  confirm.addEventListener('click', () => finish(true));
  cancel.addEventListener('click', () => finish(false));
  confirm.focus();
  return { card, promise, dismiss: () => finish(false) };
}

async function requestCloudConsent(): Promise<boolean> {
  const state = getSession();
  if (state.cloudConsentGranted && state.consentPolicyVersion === CONSENT_POLICY_VERSION) return true;
  const copy = currentCopy();
  const card = consentCard(copy.cloudTitle, copy.cloudBody, copy.cloudConfirm, copy.cloudCancel);
  dismissPendingCloudConsent = card.dismiss;
  const granted = await card.promise;
  if (dismissPendingCloudConsent === card.dismiss) dismissPendingCloudConsent = null;
  if (granted) {
    state.cloudConsentGranted = true;
    state.consentPolicyVersion = CONSENT_POLICY_VERSION;
    saveSession();
  }
  return granted;
}

async function requestChartConsent(expectedGeneration = profileAccessGeneration): Promise<boolean> {
  if (!currentProfileAccessGeneration(expectedGeneration) || !profileAccessAllowed()) return false;
  if (chartConsented && chartEnabled) return true;
  const chart = savedChart;
  if (!chart || !transcript) return false;
  chartSummaryPromise ??= placementSummaryForChart(chart);
  const summary = await chartSummaryPromise;
  if (!summary || !currentProfileAccessGeneration(expectedGeneration)
    || !profileAccessAllowed() || savedChart !== chart) return false;
  const copy = currentCopy();
  const localLabel = chart.name.trim().slice(0, 120);
  const preview = `${localLabel ? `Selected self chart (kept on this device): ${localLabel}\n\n` : ''}${summary}`;
  const card = consentCard(copy.consentTitle, copy.consentBody, copy.consentConfirm, copy.consentCancel, preview);
  dismissPendingConsent = card.dismiss;
  const granted = await card.promise;
  if (dismissPendingConsent === card.dismiss) dismissPendingConsent = null;
  const current = currentProfileAccessGeneration(expectedGeneration)
    && profileAccessAllowed() && savedChart === chart;
  if (current && granted) {
    chartConsented = true;
    chartEnabled = true;
    chartSourceId = uuid();
    invalidateContext(false);
  } else if (current) {
    chartConsented = false;
    chartEnabled = false;
  }
  syncSourceControls();
  return current && granted;
}

function appendSourcesRow(container: HTMLElement, text: string): void {
  const paths = [...new Set([...text.matchAll(/(?:^|[\s([])(\/(?!\/)[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?)/g)]
    .map((match) => match[1].endsWith('/') ? match[1] : `${match[1]}/`)
    .filter((path) => GUIDE_LINK_PATHS.has(path)))].slice(0, 4);
  if (!paths.length) return;
  const row = document.createElement('span');
  row.className = 'zassistant__sources';
  row.append(document.createTextNode(`${currentCopy().sources} `));
  paths.forEach((path, index) => {
    if (index) row.append(document.createTextNode(' · '));
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = path;
    row.append(anchor);
  });
  container.append(row);
}

function questionRequestsMyChart(question: string): boolean {
  const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /(?:\b(?:my (?:birth )?chart|mi carta(?: natal)?|meu mapa(?: natal)?|mon theme(?: natal)?|mio tema(?: natale)?)\b|м(?:оя|ою) (?:натальн(?:ая|ую) )?карт(?:а|у))/u.test(normalized);
}

async function buildTurnBody(
  question: string,
  ids: { turnId: string; operationId: string; attemptId: string; messageId: string },
  retryOfAttemptId: string | null,
  chartFacts?: string,
): Promise<{ body: Record<string, unknown>; history: GuideMessage[]; userMessage: GuideMessage }> {
  const state = getSession();
  const history = state.messages.filter((message) => message.sequence >= state.modelHistoryStartSequence).slice(-11);
  const attachments: GuideContextSource[] = [];
  if (currentPage && pageSourceEnabled()) {
    attachments.push(await localSource({
      sourceId: currentPage.sourceId,
      kind: 'site_page', sourceRevision: 1, title: currentPage.title, facts: currentPage.facts,
      subject: { boundary: 'public_reference', subjectId: currentPage.sourceId, subjectName: null, subjectIsUser: false },
      containsThirdPartyData: false, persistence: 'local_only',
    }));
  }
  const ownerChart = chartFacts && chartSourceId ? await localSource({
    sourceId: chartSourceId,
    kind: 'owner_chart', sourceRevision: 1, title: 'My chart', facts: chartFacts,
    subject: { boundary: 'root_user', subjectId: 'self', subjectName: 'You', subjectIsUser: true },
    containsThirdPartyData: false, persistence: 'local_only',
  }) : null;
  const digest = await contextScopeDigest(history, ownerChart, attachments);
  const now = new Date().toISOString();
  const userMessage: GuideMessage = {
    messageId: ids.messageId, turnId: ids.turnId, sequence: state.nextSequence,
    author: 'user', content: question, contextRevision: state.contextRevision,
    createdAt: now, generation: null,
  };
  return {
    history,
    userMessage,
    body: {
      schema: 'zodiacs.guide.ephemeral-turn.draft.v1',
      mode: 'ephemeral',
      conversationId: state.conversationId,
      turnId: ids.turnId,
      operationId: ids.operationId,
      attemptId: ids.attemptId,
      retryOfAttemptId,
      baseRevision: state.revision,
      contextEpoch: state.contextEpoch,
      clientAuthEpoch: 0,
      userMessage: { messageId: ids.messageId, content: question },
      consent: {
        purpose: 'guide_cloud_processing',
        policyVersion: CONSENT_POLICY_VERSION,
        consentRevision: 1,
        disclosureId: state.disclosureId,
        disclosedContextEpoch: state.contextEpoch,
        contextScopeDigest: digest,
      },
      ephemeralContext: {
        baseContext: {
          ownerChart: { slot: 'owner_chart', state: ownerChart ? 'active' : 'unavailable', source: ownerChart },
          todaySky: { slot: 'today_sky', state: 'unavailable', source: null },
        },
        attachments,
        history,
        modelHistoryStartSequence: state.modelHistoryStartSequence,
      },
    },
  };
}

async function runTurn(pending: PendingTurn): Promise<void> {
  // Consent, chart calculation, or a queued retry may have remained open over
  // local midnight or a time-zone change. Never send an old Guide-day body.
  if (rotateGuideDayIfNeeded()) {
    pending.userArticle.remove();
    pending.assistantArticle.remove();
    return;
  }
  if (pending.chartAuthority && !sameSelfChartAuthority(
    pending.chartAuthority,
    readSelectedSelfChart(),
  )) {
    pending.userArticle.remove();
    pending.assistantArticle.remove();
    refreshSavedChart();
    setStatus(currentCopy().contextUpdated);
    return;
  }
  const expectedGeneration = profileAccessGeneration;
  const request = new AbortController();
  activeRequest = request;
  pendingRetry = null;
  if (retryButton) retryButton.hidden = true;
  setBusy(true);
  pending.assistantArticle.setAttribute('aria-busy', 'true');
  if (!pending.assistantArticle.isConnected) transcript?.append(pending.assistantArticle);
  pending.assistantBody.textContent = '';
  pending.assistantArticle.classList.remove('is-partial', 'is-error');
  setStatus(currentCopy().thinking);
  let answer = '';
  const requestIsCurrent = () => currentProfileAccessGeneration(expectedGeneration) && activeRequest === request;
  const authorityTimer = pending.chartAuthority ? window.setInterval(() => {
    if (!sameSelfChartAuthority(pending.chartAuthority, readSelectedSelfChart())) onProfileDataChange();
  }, 250) : 0;
  try {
    const response = await fetch('/v1/guide/turn', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pending.body), signal: request.signal,
    });
    if (!requestIsCurrent()) { await response.body?.cancel().catch(() => {}); return; }
    if (!response.ok) throw await failure(response);
    const completed = await consumeGuideStream(response, pending, (delta) => {
      if (!requestIsCurrent()) return;
      answer += delta;
      pending.assistantBody.textContent = answer;
      scrollTranscript();
    });
    if (!requestIsCurrent()) return;
    if (!completed.message.content.trim() || (answer && answer !== completed.message.content)) {
      throw new AssistantFailure('invalid_response', false, true);
    }
    renderAssistantText(pending.assistantBody, completed.message.content);
    appendSourcesRow(pending.assistantBody, completed.message.content);
    pending.assistantArticle.removeAttribute('aria-busy');
    const state = getSession();
    state.messages = [...state.messages, pending.userMessage, completed.message].slice(-MAX_MESSAGES);
    state.nextSequence = completed.message.sequence + 1;
    state.revision = completed.conversationRevision;
    saveSession();
    setStatus(currentCopy().complete);
    track('guide_reply');
  } catch (error) {
    if (!requestIsCurrent()) return;
    pending.assistantArticle.removeAttribute('aria-busy');
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    const guideFailure = error instanceof AssistantFailure ? error : new AssistantFailure('temporarily_unavailable');
    if (!answer) pending.assistantArticle.remove();
    else pending.assistantArticle.classList.add('is-partial');
    setStatus(aborted ? currentCopy().stopped : friendlyFailure(guideFailure.code));
    if (!aborted && guideFailure.retryable && !guideFailure.accepted && !answer) {
      pendingRetry = pending;
      if (retryButton) retryButton.hidden = false;
    }
  } finally {
    if (authorityTimer) window.clearInterval(authorityTimer);
    if (activeRequest === request) setBusy(false);
    if (authReady && currentProfileAccessGeneration(expectedGeneration)
      && root && !root.hidden && !mobileGuideMode()) textarea?.focus();
  }
}

async function submitQuestion(): Promise<void> {
  if (!authReady || !textarea || activeRequest || interactionPending) return;
  if (rotateGuideDayIfNeeded()) return;
  const question = textarea.value.trim();
  if (!question) { setStatus(currentCopy().empty); return; }
  interactionPending = true;
  syncSendState();
  syncSourceControls();
  const expectedGeneration = profileAccessGeneration;
  try {
    if (!await requestCloudConsent()) return;
    if (rotateGuideDayIfNeeded()) return;
    if (!currentProfileAccessGeneration(expectedGeneration)) return;
    let chartFacts: string | undefined;
    let chartAuthority: StoredChart | null = null;
    const wantsChart = Boolean(savedChart) && (chartEnabled || questionRequestsMyChart(question));
    if (wantsChart && !chartEnabled) {
      setStatus(currentCopy().chartReading);
      await requestChartConsent(expectedGeneration);
    }
    if (rotateGuideDayIfNeeded()) return;
    if (!currentProfileAccessGeneration(expectedGeneration)) return;
    if (chartEnabled && savedChart) {
      const current = readSelectedSelfChart();
      if (!sameSelfChartAuthority(savedChart, current)) {
        refreshSavedChart();
        setStatus(currentCopy().contextUpdated);
        return;
      }
      chartSummaryPromise ??= placementSummaryForChart(savedChart);
      chartFacts = (await chartSummaryPromise) ?? undefined;
      const currentAfterSummary = readSelectedSelfChart();
      if (!chartFacts || !sameSelfChartAuthority(savedChart, currentAfterSummary)) {
        refreshSavedChart();
        setStatus(currentCopy().contextUpdated);
        return;
      }
      chartAuthority = currentAfterSummary;
    }
    if (rotateGuideDayIfNeeded()) return;
    if (!currentProfileAccessGeneration(expectedGeneration)) return;
    const ids = { turnId: uuid(), operationId: uuid(), attemptId: uuid(), messageId: uuid() };
    const built = await buildTurnBody(question, ids, null, chartFacts);
    const user = appendMessage('user', question);
    const guide = appendMessage('guide', '');
    textarea.value = '';
    syncTextareaHeight();
    const pending: PendingTurn = {
      body: built.body, question, requestHistory: built.history, userMessage: built.userMessage,
      turnId: ids.turnId, attemptId: ids.attemptId, userArticle: user.article,
      assistantArticle: guide.article, assistantBody: guide.body,
      chartAuthority,
    };
    interactionPending = false;
    await runTurn(pending);
  } catch (error) {
    setStatus(friendlyFailure(error instanceof AssistantFailure ? error.code : 'temporarily_unavailable'));
  } finally {
    interactionPending = false;
    syncSendState();
    syncSourceControls();
  }
}

async function retryTurn(): Promise<void> {
  if (!authReady) return;
  if (rotateGuideDayIfNeeded()) return;
  const prior = pendingRetry;
  if (!prior || activeRequest) return;
  const state = getSession();
  if (prior.body.contextEpoch !== state.contextEpoch || prior.body.baseRevision !== state.revision) {
    clearPendingRetry();
    setStatus(currentCopy().contextUpdated);
    return;
  }
  const nextAttemptId = uuid();
  const body = { ...prior.body, attemptId: nextAttemptId, retryOfAttemptId: prior.attemptId };
  await runTurn({ ...prior, body, attemptId: nextAttemptId });
}

function focusableControls(): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>('button:not([hidden]):not([disabled]), textarea:not([disabled]), a[href]')]
    .filter((element) => element.getClientRects().length > 0);
}

function dismissInvite(markSeen = true): void {
  invite?.remove();
  invite = null;
  if (markSeen) {
    inviteSeenInMemory = true;
    safeSessionSet(INVITE_KEY, '1');
  }
}

function syncVisualViewport(): void {
  if (!root || root.hidden) return;
  const height = window.visualViewport?.height ?? window.innerHeight;
  root.style.setProperty('--zassistant-viewport-height', `${Math.max(1, Math.round(height))}px`);
}

function startVisualViewportTracking(): void {
  syncVisualViewport();
  window.addEventListener('resize', syncVisualViewport);
  window.visualViewport?.addEventListener('resize', syncVisualViewport);
  window.visualViewport?.addEventListener('scroll', syncVisualViewport);
}

function stopVisualViewportTracking(): void {
  window.removeEventListener('resize', syncVisualViewport);
  window.visualViewport?.removeEventListener('resize', syncVisualViewport);
  window.visualViewport?.removeEventListener('scroll', syncVisualViewport);
  root?.style.removeProperty('--zassistant-viewport-height');
}

function isolateBackground(): void {
  if (!root || backgroundSnapshot.length) return;
  backgroundSnapshot = [...document.body.children]
    .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== root)
    .map((node) => ({ node, inert: node.inert, ariaHidden: node.getAttribute('aria-hidden') }));
  for (const { node } of backgroundSnapshot) {
    node.inert = true;
    node.setAttribute('aria-hidden', 'true');
  }
}

function restoreBackground(): void {
  for (const { node, inert, ariaHidden } of backgroundSnapshot) {
    node.inert = inert;
    if (ariaHidden === null) node.removeAttribute('aria-hidden');
    else node.setAttribute('aria-hidden', ariaHidden);
  }
  backgroundSnapshot = [];
}

function closeAssistant(): void {
  if (!root || root.hidden) return;
  openGeneration += 1;
  authReady = false;
  abortRequest();
  dismissPendingConsent?.();
  dismissPendingCloudConsent?.();
  cancelClearConfirmation();
  root.hidden = true;
  panel?.style.removeProperty('transform');
  stopVisualViewportTracking();
  document.documentElement.style.overflow = previousOverflow;
  launcher?.removeAttribute('aria-expanded');
  restoreBackground();
  opener?.focus();
  opener = null;
}

function clearConversation(): void {
  if (!authReady) return;
  abortRequest();
  const state = getSession();
  state.messages = [];
  state.nextSequence = 1;
  state.modelHistoryStartSequence = 1;
  state.revision += 1;
  state.contextRevision += 1;
  state.contextEpoch += 1;
  pendingRetry = null;
  saveSession();
  renderTranscript();
  setStatus();
  if (retryButton) retryButton.hidden = true;
}

function requestClearConversation(): void {
  if (!authReady || !clearButton || clearButton.hidden) return;
  if (!clearArmed) {
    clearArmed = true;
    clearButton!.textContent = currentCopy().clearConfirm;
    clearButton!.classList.add('is-armed');
    clearButton!.setAttribute('aria-label', currentCopy().clearConfirmStatus);
    setStatus(currentCopy().clearConfirmStatus);
    clearConfirmationTimer = window.setTimeout(() => {
      cancelClearConfirmation();
      setStatus();
    }, 4_000);
    return;
  }
  cancelClearConfirmation();
  clearConversation();
}

function applyCopy(): void {
  const copy = currentCopy();
  if (title) title.textContent = copy.title;
  launcher?.setAttribute('aria-label', copy.open);
  if (closeButton) closeButton.setAttribute('aria-label', copy.close);
  if (clearButton) {
    clearButton.setAttribute('aria-label', clearArmed ? copy.clearConfirmStatus : copy.clear);
    clearButton.textContent = clearArmed ? copy.clearConfirm : copy.clearAction;
  }
  if (intro) intro.textContent = copy.intro;
  if (sourcesRegion) sourcesRegion.setAttribute('aria-label', copy.context);
  if (pageSourceRemove) pageSourceRemove.setAttribute('aria-label', `${copy.removeSource}: ${copy.pageSource}`);
  if (pageSourceAdd) pageSourceAdd.textContent = `＋ ${copy.addPage}`;
  if (transcript) transcript.setAttribute('aria-label', copy.log);
  if (textarea) { textarea.setAttribute('aria-label', copy.input); textarea.placeholder = copy.placeholder; }
  if (sendButton) sendButton.textContent = copy.send;
  if (stopButton) stopButton.textContent = copy.stop;
  if (retryButton) retryButton.textContent = copy.retry;
  if (newlineHint) newlineHint.textContent = copy.newline;
  if (privacy) {
    const link = document.createElement('a');
    link.className = 'zassistant__privacy-link';
    link.href = locale === 'en' ? '/privacy/' : `/${locale}/privacy/`;
    link.textContent = copy.privacyLearnMore;
    privacy.replaceChildren(document.createTextNode(`${copy.privacy} `), link);
  }
  syncSourceControls();
}

function removePageSource(): void {
  if (!authReady || !currentPage || activeRequest || interactionPending) return;
  const state = getSession();
  if (!state.removedPageSourceIds.includes(currentPage.sourceId)) {
    state.removedPageSourceIds.push(currentPage.sourceId);
    state.removedPageSourceIds = state.removedPageSourceIds.slice(-20);
    invalidateContext(true);
  }
  syncSourceControls();
  setStatus(currentCopy().contextUpdated);
}

function addPageSource(): void {
  if (!authReady || !currentPage || activeRequest || interactionPending) return;
  const state = getSession();
  state.removedPageSourceIds = state.removedPageSourceIds.filter((id) => id !== currentPage!.sourceId);
  invalidateContext(false, true);
  syncSourceControls();
  setStatus(`${currentCopy().pageSource}: ${currentPage.title}`);
}

function toggleChart(): void {
  if (!authReady || activeRequest || interactionPending) return;
  if (chartEnabled) {
    chartEnabled = false;
    chartConsented = false;
    chartSourceId = null;
    invalidateContext(true);
    syncSourceControls();
    setStatus(currentCopy().contextUpdated);
    return;
  }
  interactionPending = true;
  syncSendState();
  syncSourceControls();
  const expectedGeneration = profileAccessGeneration;
  void requestChartConsent(expectedGeneration).finally(() => {
    interactionPending = false;
    syncSendState();
    syncSourceControls();
  });
}

function wireMobileSheetGesture(header: HTMLElement): void {
  let startY = 0;
  let lastY = 0;
  let startTime = 0;
  let dragging = false;
  const finish = (event: PointerEvent) => {
    if (!dragging || !panel) return;
    dragging = false;
    const distance = Math.max(0, lastY - startY);
    const velocity = distance / Math.max(1, performance.now() - startTime);
    try { header.releasePointerCapture(event.pointerId); } catch { /* capture can already be released */ }
    if (distance >= 96 || (distance >= 40 && velocity > 0.65)) {
      panel.style.removeProperty('transition');
      panel.style.removeProperty('transform');
      closeAssistant();
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.style.transition = reducedMotion ? 'none' : 'transform 160ms ease-out';
    panel.style.transform = 'translateY(0)';
    window.setTimeout(() => {
      panel?.style.removeProperty('transition');
      panel?.style.removeProperty('transform');
    }, reducedMotion ? 0 : 170);
  };
  header.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !mobileGuideMode()
      || event.target instanceof Element && event.target.closest('button')) return;
    dragging = true;
    startY = event.clientY;
    lastY = event.clientY;
    startTime = performance.now();
    panel?.style.setProperty('transition', 'none');
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointermove', (event) => {
    if (!dragging || !panel) return;
    lastY = event.clientY;
    const distance = Math.max(0, lastY - startY);
    panel.style.transform = `translateY(${distance}px)`;
  });
  header.addEventListener('pointerup', finish);
  header.addEventListener('pointercancel', finish);
}

function build(): void {
  root = document.createElement('div');
  root.className = 'zassistant';
  root.hidden = true;
  root.addEventListener('click', (event) => { if (event.target === root) closeAssistant(); });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = focusableControls();
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
      event.preventDefault(); last.focus();
    }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  panel = document.createElement('div');
  panel.className = 'zassistant__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'zassistant-title');
  const header = document.createElement('header');
  header.className = 'zassistant__head';
  const headerIdentity = document.createElement('div');
  headerIdentity.className = 'zassistant__identity';
  title = document.createElement('h2');
  title.id = 'zassistant-title';
  title.className = 'zassistant__title';
  title.tabIndex = -1;
  headerIdentity.append(createGuideAvatar('zassistant__avatar', 38), title);
  const headerActions = document.createElement('div');
  headerActions.className = 'zassistant__head-actions';
  clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'zassistant__clear';
  clearButton.hidden = true;
  clearButton.addEventListener('click', requestClearConversation);
  closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'zassistant__close';
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', closeAssistant);
  headerActions.append(clearButton, closeButton);
  header.append(headerIdentity, headerActions);
  wireMobileSheetGesture(header);
  intro = document.createElement('p');
  intro.className = 'zassistant__intro';
  sourcesRegion = document.createElement('div');
  sourcesRegion.className = 'zassistant__context';
  pageSourceChip = document.createElement('div');
  pageSourceChip.className = 'zassistant__source-chip';
  pageSourceText = document.createElement('span');
  pageSourceRemove = document.createElement('button');
  pageSourceRemove.type = 'button';
  pageSourceRemove.className = 'zassistant__source-remove';
  pageSourceRemove.textContent = '×';
  pageSourceRemove.addEventListener('click', removePageSource);
  pageSourceChip.append(pageSourceText, pageSourceRemove);
  pageSourceAdd = document.createElement('button');
  pageSourceAdd.type = 'button';
  pageSourceAdd.className = 'zassistant__source-add';
  pageSourceAdd.addEventListener('click', addPageSource);
  chartButton = document.createElement('button');
  chartButton.type = 'button';
  chartButton.className = 'zassistant__chart-chip';
  chartButton.hidden = true;
  chartButton.addEventListener('click', toggleChart);
  sourcesRegion.append(pageSourceChip, pageSourceAdd, chartButton);
  transcript = document.createElement('div');
  transcript.className = 'zassistant__log';
  transcript.setAttribute('role', 'log');
  transcript.setAttribute('aria-live', 'polite');
  transcript.setAttribute('aria-relevant', 'additions text');
  status = document.createElement('p');
  status.className = 'zassistant__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  form = document.createElement('form');
  form.className = 'zassistant__form';
  form.addEventListener('submit', (event) => { event.preventDefault(); void submitQuestion(); });
  textarea = document.createElement('textarea');
  textarea.className = 'zassistant__input';
  textarea.rows = 2;
  textarea.maxLength = MAX_INPUT;
  textarea.autocomplete = 'off';
  textarea.enterKeyHint = 'enter';
  textarea.spellcheck = true;
  textarea.addEventListener('input', () => { syncTextareaHeight(); syncSendState(); });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !mobileGuideMode()) {
      event.preventDefault(); form?.requestSubmit();
    }
  });
  const actions = document.createElement('div');
  actions.className = 'zassistant__actions';
  newlineHint = document.createElement('span');
  newlineHint.className = 'zassistant__hint mono';
  retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'zassistant__retry';
  retryButton.hidden = true;
  retryButton.addEventListener('click', () => void retryTurn());
  sendButton = document.createElement('button');
  sendButton.type = 'submit';
  sendButton.className = 'zassistant__send';
  sendButton.disabled = true;
  stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.className = 'zassistant__stop';
  stopButton.hidden = true;
  stopButton.addEventListener('click', abortRequest);
  actions.append(newlineHint, retryButton, sendButton, stopButton);
  form.append(textarea, actions);
  privacy = document.createElement('p');
  privacy.className = 'zassistant__privacy';
  panel.append(header, intro, sourcesRegion, transcript, status, form, privacy);
  root.append(panel);
  document.body.append(root);
  const shellLauncher = document.querySelector<HTMLButtonElement>('[data-guide-launcher]');
  if (shellLauncher) {
    // The privacy-neutral shell owns this listener and node. Adopting it keeps
    // the visible control stable and preserves focus restoration after the
    // drawer is loaded on demand.
    launcher = shellLauncher;
  } else {
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'zguide-launcher';
    launcher.dataset.guideLauncher = '';
    const launcherLabel = document.createElement('span');
    launcherLabel.textContent = 'Guide';
    launcher.append(createGuideAvatar('zguide-launcher__avatar', 32), launcherLabel);
    launcher.addEventListener('click', () => void openAssistant(undefined, launcher));
    document.body.append(launcher);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root && !root.hidden) {
      event.preventDefault(); event.stopPropagation(); closeAssistant();
    }
  }, true);
  window.addEventListener('zodiacs:profile', onProfileDataChange);
  window.addEventListener('zodiacs:profile-access', onProfileAccessChange);
  window.addEventListener('storage', onGuideStorageChange);
  window.addEventListener('pagehide', suspendGuideForPageCache);
  window.addEventListener('pageshow', restoreGuideAfterPageCache);
}

function showInvite(): void {
  if (invite || !root?.hidden || inviteSeenInMemory || safeSessionGet(INVITE_KEY) === '1') return;
  inviteSeenInMemory = true;
  safeSessionSet(INVITE_KEY, '1');
  const copy = currentCopy();
  invite = document.createElement('aside');
  invite.className = 'zguide-invite';
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'zguide-invite__dismiss';
  dismiss.setAttribute('aria-label', copy.dismissInvite);
  dismiss.textContent = '×';
  const identity = document.createElement('div');
  identity.className = 'zguide-invite__identity';
  const label = document.createElement('strong');
  label.textContent = 'Guide';
  identity.append(createGuideAvatar('zguide-invite__avatar', 44), label);
  const message = document.createElement('p');
  message.textContent = copy.invite;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'zguide-invite__action';
  action.textContent = copy.inviteAction;
  dismiss.addEventListener('click', () => dismissInvite());
  action.addEventListener('click', () => void openAssistant(undefined, action));
  invite.append(dismiss, identity, message, action);
  document.body.append(invite);
}

/** Mount the default-visible launcher and one quiet, non-modal welcome. */
export async function bootstrapGuide(requestedLocale?: string): Promise<void> {
  await ensureStylesheet();
  locale = normalizeLocale(requestedLocale);
  if (!root) build();
  applyCopy();
}

/** Open the Guide drawer. Safe to call repeatedly on the same page. */
export async function openAssistant(requestedLocale?: string, from?: HTMLElement | null): Promise<void> {
  const generation = ++openGeneration;
  authReady = false;
  const authFence = ensureGuideAuthFence();
  await bootstrapGuide(requestedLocale);
  dismissInvite();
  applyCopy();
  if (root!.hidden) {
    opener = from ?? (document.activeElement as HTMLElement | null);
    previousOverflow = document.documentElement.style.overflow;
  }
  savedChart = null;
  chartEnabled = false;
  chartConsented = false;
  chartSourceId = null;
  chartSummaryPromise = null;
  currentPage = null;
  transcript?.replaceChildren();
  starters = null;
  if (intro) intro.hidden = false;
  if (textarea) {
    textarea.value = '';
    textarea.disabled = true;
    syncTextareaHeight();
  }
  if (clearButton) clearButton.hidden = true;
  syncSourceControls();
  root!.hidden = false;
  launcher?.setAttribute('aria-expanded', 'true');
  document.documentElement.style.overflow = 'hidden';
  title?.focus({ preventScroll: true });
  isolateBackground();
  startVisualViewportTracking();
  panel?.setAttribute('aria-busy', 'true');
  setStatus(currentCopy().preparing);
  track('guide_open');

  await authFence;
  if (generation !== openGeneration || !root || root.hidden) return;
  rotateGuideDayIfNeeded();
  if (generation !== openGeneration || root.hidden) return;
  authReady = true;
  hasUserOpened = true;
  syncPageBoundary();
  refreshSavedChart();
  renderTranscript();
  if (textarea) textarea.disabled = false;
  panel?.setAttribute('aria-busy', 'false');
  applyCopy();
  setStatus();
  syncSendState();
  syncSourceControls();
  if (!mobileGuideMode()) textarea?.focus({ preventScroll: true });
}
