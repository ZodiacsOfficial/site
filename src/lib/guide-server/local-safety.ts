/**
 * Pure, server-only Guide safety backstop.
 *
 * This module deliberately has no provider, logging, analytics, or telemetry
 * dependency. Its public functions return only a coarse category: never a
 * matched phrase, offset, rule identifier, or copy of user/model content.
 */

export const GUIDE_LOCAL_SAFETY_CATEGORIES = [
  'allowed',
  'crisis',
  'medical',
  'legal',
  'financial',
  'violence',
  'coercion',
  'sexual',
  'other_high_stakes',
] as const;

export type GuideLocalSafetyCategory = typeof GUIDE_LOCAL_SAFETY_CATEGORIES[number];

const ASTROLOGY = /\b(?:astrolog\w*|chart|horoscope|zodiac|transit|retrograde|mercury|venus|mars|saturn|jupiter|moon\s+sign|rising\s+sign)\b/u;
const AFFIRMATIVE_FOLLOW_THROUGH = /\b(?:yes|absolutely|definitely|do it|go ahead|start by|first,|the best (?:time|way)|the ideal (?:time|way)|today|tomorrow|this week)\b/u;
const CONTRADICTORY_AFFIRMATIVE_FOLLOW_THROUGH = /\b(?:yes|absolutely|definitely|do it|go ahead|start by|first,|the best (?:time|way)|the ideal (?:time|way))\b/u;
const RESPONSIBLE_BOUNDARY = /\b(?:can(?:not|'t)|won't|unable to|not able to)\s+(?:help|advise|diagnose|recommend|predict|provide)|\b(?:licensed|qualified)\s+(?:clinician|doctor|lawyer|professional)|\b(?:emergency services|crisis line|trusted person|legal aid)\b/u;

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[‘’]/gu, "'")
    .toLocaleLowerCase('en-US')
    .replace(/\s+/gu, ' ')
    .trim();
}

interface TextSpan { start: number; end: number }

function textSpans(text: string, pattern: RegExp): TextSpan[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...text.matchAll(new RegExp(pattern.source, flags))].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function spansAreNear(left: TextSpan, right: TextSpan, distance: number): boolean {
  return left.start <= right.end + distance && right.start <= left.end + distance;
}

function near(text: string, left: RegExp, right: RegExp, distance = 180): boolean {
  const leftSpans = textSpans(text, left);
  const rightSpans = textSpans(text, right);
  return leftSpans.some((leftSpan) => (
    rightSpans.some((rightSpan) => spansAreNear(leftSpan, rightSpan, distance))
  ));
}

function isCrisisEducation(text: string): boolean {
  return /\b(?:definition|meaning|article|research|prevention|warning signs|public health)\b.{0,90}\b(?:suicide|self-harm)\b/u.test(text)
    || /\b(?:how (?:can|do) i|ways? to)\s+(?:help|support|respond to)\s+(?:a |my )?(?:friend|person|someone|student|patient)\b/u.test(text)
    || /\b(?:suicide|self-harm)\s+(?:prevention|awareness|resources?|training)\b/u.test(text);
}

function crisis(text: string): boolean {
  const selfHarmAct = /(?:(?:kill|hurt)\s+myself|self[ -]?harm|end my life|take my own life|commit suicide|suicide|overdose)/u;
  const plannedSelfHarm = /\bi(?:(?:'ve| have)\s+(?:been\s+)?(?:planned|planning|intended|intending)|(?:'m| am)\s+(?:planning|intending)|\s+(?:plan|planned|planning|intend|intended|intending))\s+(?:(?:to|on)\s+)?(?:(?:kill|hurt)(?:ing)?\s+myself|self[ -]?harm|end(?:ing)?\s+my life|tak(?:e|ing)\s+my own life|commit(?:ting)?\s+suicide|suicide|overdos(?:e|ing))\b/u.test(text)
    || /\bi(?:'ve| have)?\s*made\s+(?:a\s+)?plan\s+to\s+(?:(?:kill|hurt)\s+myself|self[ -]?harm|end\s+my life|take\s+my own life|commit\s+suicide|overdose)\b/u.test(text);
  const directFirstPersonIntent = /\bi(?:'ve| have)?\s*(?:want|need|plan|intend|decided|have decided)\s+(?:to|on)\s+(?:(?:kill|hurt)\s+myself|self[ -]?harm|end my life|take my own life|commit suicide|overdose)\b/u.test(text)
    || /\bi\s+will\s+(?:(?:kill|hurt)\s+myself|self[ -]?harm|end my life|take my own life|commit suicide|overdose)\b/u.test(text);
  const imminent = /\b(?:right now|today|tonight|now|soon|imminently)\b/u.test(text);
  const imminentReflexiveSelfHarm = imminent && (
    /\bi(?:'m| am)\s+(?:going|gonna|about|planning)\s+(?:(?:to|on)\s+)?(?:shoot|stab|poison|hang|strangle|drown|cut)\s+myself\b/u.test(text)
      || /\bi\s+(?:will|might|may|could|want|need|plan|intend)\s+(?:(?:to|on)\s+)?(?:shoot|stab|poison|hang|strangle|drown|cut)\s+myself\b/u.test(text)
      || /\bi(?:'m| am)\s+(?:thinking\s+about|considering)\s+(?:shooting|stabbing|poisoning|hanging|strangling|drowning|cutting)\s+myself\b/u.test(text)
  );
  const imminentDeathIntent = imminent && (
    /\bi\s+(?:want|need|plan|intend|decided)\s+(?:to|on)\s+(?:die|die by suicide)\b/u.test(text)
      || /\bi(?:'m| am)\s+(?:gonna|going to|planning(?: to)?)\s+(?:(?:kill|hurt)\s+myself|die by suicide|end my life|take my own life|commit suicide|suicide|overdose)\b/u.test(text)
  );
  const actionable = directFirstPersonIntent
    || plannedSelfHarm
    || imminentReflexiveSelfHarm
    || imminentDeathIntent
    || /\bi(?:'m| am)\s+(?:gonna|going|planning|about)\s+to\s+(?:(?:kill|hurt)\s+myself|self[ -]?harm|end my life|take my own life|commit suicide|overdose)\b/u.test(text)
    || /\bi(?:'m| am)\s+planning\s+(?:a\s+)?(?:suicide|self[ -]?harm|overdose)\b/u.test(text)
    || /\bi\s+have\s+(?:a\s+)?plan\s+to\s+(?:(?:kill|hurt)\s+myself|self[ -]?harm|end my life|take my own life|commit suicide|overdose)\b/u.test(text)
    || /\bi(?:'m| am)\s+suicidal\b.{0,50}\b(?:right now|today|tonight|now|soon|might|may|will|could|plan|intend|decid)\w*\b/u.test(text)
    || /\bi(?:'m| am)\s+thinking\s+(?:about|of)\s+(?:killing|hurting)\s+myself\b/u.test(text)
    || /\bi(?:'m| am)\s+thinking\s+(?:about|of)\s+(?:ending my life|suicide|self[ -]?harm)\b/u.test(text)
    || /\bi(?:'m| am)\s+considering\s+(?:suicide|killing myself|hurting myself|ending my life|self[ -]?harm)\b.{0,40}\b(?:tonight|today|now|soon)\b/u.test(text)
    || /\bi\s+have\s+(?:a\s+)?(?:suicide|self[ -]?harm)\s+plan\b/u.test(text)
    || /\bi\s+(?:plan|intend)\s+on\s+(?:killing myself|hurting myself|ending my life|suicide|self[ -]?harm|overdosing)\b/u.test(text)
    || /\bi\s+(?:might|may|could)\s+(?:kill|hurt)\s+myself\b.{0,40}\b(?:tonight|today|now|soon)\b/u.test(text)
    || (/\b(?:should i|how (?:do|can) i|best way to)\b/u.test(text) && selfHarmAct.test(text))
    || /\bi\s+(?:just\s+)?(?:took|swallowed)\s+(?:too many|a lot of|dozens of|[1-9][0-9]+)\s+(?:pills|tablets|capsules)\b/u.test(text)
    || /\bi(?:'ve| have)?\s*overdosed\b/u.test(text)
    // Spanish.
    || /(?<!\bno )\b(?:quiero\s+(?:matarme|morir)|me\s+quiero\s+morir|voy\s+a\s+suicidarme|como\s+(?:puedo\s+)?suicidarme|acabar\s+con\s+mi\s+vida)\b/u.test(text)
    // Portuguese (diacritics are removed by normalize()).
    || /(?<!\bnao )\b(?:quero\s+(?:me\s+matar|morrer)|vou\s+(?:me\s+)?suicidar|como\s+(?:posso\s+)?me\s+suicidar|acabar\s+com\s+(?:a\s+)?minha\s+vida)\b/u.test(text)
    // French.
    || /\b(?:je\s+veux\s+(?:me\s+tuer|mourir)|je\s+vais\s+me\s+suicider|comment\s+(?:puis-je\s+)?me\s+suicider|mettre\s+fin\s+a\s+mes\s+jours)\b/u.test(text)
    // Italian.
    || /(?<!\bnon )\b(?:voglio\s+(?:uccidermi|morire)|sto\s+per\s+suicidarmi|come\s+(?:posso\s+)?suicidarmi|porre\s+fine\s+alla\s+mia\s+vita)\b/u.test(text);
  if (actionable) return true;
  const firstPersonDisclosure = /\b(?:i cannot go on|there is no reason for me to live|i would be better off dead)\b/u.test(text);
  if (firstPersonDisclosure) return true;
  return !isCrisisEducation(text) && /\b(?:i feel hopeless|life is not worth living)\b/u.test(text);
}

function sexual(text: string): boolean {
  const minor = /\b(?:minors?(?!\s+aspects?\b)|kids?|underage|child(?:ren)?|preteens?|teens?|teenagers?|(?:1[0-7]|[0-9])[ -]?year[ -]?olds?|twelve[ -]?year[ -]?olds?|thirteen[ -]?year[ -]?olds?|fourteen[ -]?year[ -]?olds?|fifteen[ -]?year[ -]?olds?|sixteen[ -]?year[ -]?olds?|seventeen[ -]?year[ -]?olds?)\b/u;
  const sexualContent = /\b(?:sex|sexual|erotic|nudes?|porn|explicit images?|intimate images?|seduc\w*|groom\w*)\b/u;
  const educationTerms = /\b(?:sex|sexual health|consent)\s+education(?:al)?\b/gu;
  const riskText = text.replace(educationTerms, 'education');
  const exploitativeArtifact = /\b(?:(?:erotic|sexual|sexually explicit|pornographic|explicit)\s+(?:stor(?:y|ies)|content|scenes?|roleplays?|narratives?|descriptions?|images?|pictures?|videos?|materials?)|nudes?|porn|explicit images?|intimate images?)\b/u;
  const requestMarker = /\b(?:writ(?:e|ing)|compos(?:e|ing)|draft(?:ing)?|creat(?:e|ing)|mak(?:e|ing)|generat(?:e|ing)|produc(?:e|ing)|narrat(?:e|ing)|simulat(?:e|ing)|roleplay(?:ing)?|detail(?:ing)?|describe(?!\s+why)|tell\s+me(?!\s+why)|show|send|give\s+me|provide\s+me\s+with|i\s+(?:want|would like))\b/u;
  const generationOperation = /\b(?:writ(?:e|ing|ten)|compos(?:e|ing|ed)|draft(?:ing|ed)?|creat(?:e|ing|ed)|mak(?:e|ing)|made|generat(?:e|ing|ed)|produc(?:e|ing|ed)|narrat(?:e|ing|ed)|simulat(?:e|ing|ed)|roleplay(?:ing|ed)?|detail(?:ing|ed)?|describ(?:e|ing|ed))\b/u;
  const safeArtifact = /\b(?:(?:(?:prevention|safeguarding|awareness|educational?|reporting)\s+)?(?:guides?|resources?|reports?|articles?|training)|educational?\s+materials?)\b/u;
  const safeAction = /\b(?:(?:i\s+(?:want|would like)\s+to|how\s+(?:do|can)\s+i|help\s+me(?:\s+to)?|please|can\s+you)\s+(?:report|remove|delete|block|take down|flag|prevent|protect|safeguard|stop|understand|learn|explain)|(?:understand|explain|describe|tell\s+me)\s+why)\b/u;
  const protectiveResult = /\b(?:reported|removed|deleted|blocked|taken down|flagged)\b/u;

  interface RequestSpan extends TextSpan { kind: 'desire' | 'generation' }
  const requestSpans: RequestSpan[] = [...riskText.matchAll(new RegExp(requestMarker.source, 'gu'))]
    .map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
      kind: /^i\s+(?:want|would like)$/u.test(match[0]) ? 'desire' : 'generation',
    }));
  const artifactSpans = textSpans(riskText, exploitativeArtifact);
  const minorSpans = textSpans(riskText, minor);
  const safeArtifactSpans = textSpans(riskText, safeArtifact);
  const safeActionSpans = textSpans(riskText, safeAction);
  const protectiveResultSpans = textSpans(riskText, protectiveResult);
  const generationOperationSpans = textSpans(riskText, generationOperation);
  const minorNearSexual = near(riskText, minor, sexualContent, 180);

  const nearbyArtifacts = artifactSpans.filter((artifact) => (
    minorSpans.some((subject) => spansAreNear(artifact, subject, 180))
  ));
  let safelyOwnedArtifacts = 0;
  for (const artifact of nearbyArtifacts) {
    const request = requestSpans.filter((candidate) => (
      candidate.start <= artifact.start
        && artifact.start - candidate.end <= 180
        && !/[.!?;]/u.test(riskText.slice(candidate.end, artifact.start))
    )).at(-1);
    if (!request) continue;

    const directlyProtectiveAction = safeActionSpans.some((action) => (
      action.start <= request.start && request.start < action.end && action.end <= artifact.start
    ));
    const topicalSafeArtifact = safeArtifactSpans.filter((target) => (
      target.start >= request.end && target.end <= artifact.start
    )).at(-1);
    const safeArtifactOwnsTarget = topicalSafeArtifact !== undefined && (() => {
      const connector = riskText.slice(topicalSafeArtifact.end, artifact.start);
      return /^\s*(?:about|on|regarding|concerning)\b/u.test(connector)
        && !/\b(?:and|plus|followed\s+by|alongside|as\s+well\s+as|then)\b/u.test(connector);
    })();
    const directProtectiveResult = request.kind === 'desire' && (() => {
      const result = protectiveResultSpans.find((candidate) => (
        candidate.start >= artifact.end
          && candidate.start - artifact.end <= 140
          && !/[.!?;]/u.test(riskText.slice(artifact.end, candidate.start))
      ));
      if (!result) return false;
      return !generationOperationSpans.some((operation) => (
        operation.start >= request.end && operation.start <= result.end
      ));
    })();

    if (directlyProtectiveAction || safeArtifactOwnsTarget || directProtectiveResult) {
      safelyOwnedArtifacts += 1;
      continue;
    }
    return true;
  }

  const exploitativeInstruction = /\b(?:how\s+(?:do|can)\s+i|here\s+is\s+how|explain\s+how|tell\s+me\s+how|help\s+me(?:\s+to)?|teach\s+me(?:\s+to)?)\b[^.!?;]{0,140}\b(?:have\s+sex|groom|seduce|obtain\s+(?:nudes?|explicit images?)|get\s+(?:nudes?|explicit images?))\b/u;
  const exploitativeDepiction = /\b(?:simulate|roleplay|detail|describe(?!\s+why))\b[^.!?;]{0,140}\b(?:sex|sexual activity|groom|seduce)\b/u;
  if (minorNearSexual
    && (exploitativeInstruction.test(riskText) || exploitativeDepiction.test(riskText))) return true;
  if (nearbyArtifacts.length > 0 && safelyOwnedArtifacts === nearbyArtifacts.length) return false;
  if (safelyOwnedArtifacts > 0) return true;

  const protectiveIntent = /\b(?:report|remove|delete|block|take down|flag|prevent|protect|safeguard|stop)\b.{0,140}\b(?:abuse|exploitation|sex|sexual|nudes?|porn|explicit images?|intimate images?|groom\w*)\b/u.test(riskText)
    || /\b(?:abuse|exploitation|sex|sexual|nudes?|porn|explicit images?|intimate images?|groom\w*)\b.{0,140}\b(?:reported|removed|deleted|blocked|taken down|flagged|prevented)\b/u.test(riskText)
    || /\b(?:prevention|safeguarding|awareness|educational?)\s+(?:guide|resource|report|article|materials?|training)\b/u.test(riskText)
    || /\b(?:guide|resource|report|article|materials?|training)\b.{0,100}\b(?:prevention|safeguarding|awareness|education|abuse|exploitation)\b/u.test(riskText)
    || /\b(?:what is|define|understand|explain|describe|tell\s+me)\s+why\b.{0,160}\b(?:illegal|harmful|unsafe|wrong|exploitative|abusive)\b/u.test(riskText)
    || /\beducation\b/u.test(riskText)
    || /\b(?:explain|teach|discuss|talk about)\b.{0,80}\b(?:sex|sexual health|consent|puberty)\b.{0,80}\b(?:to|with)\s+(?:my|a|the)\s+(?:child|teen(?:ager)?|(?:1[0-7]|[0-9])[ -]?year[ -]?old)\b/u.test(riskText);
  if (minorNearSexual && protectiveIntent) return false;
  return minorNearSexual
    || /\b(?:sex|sexual content|nudes?|porn|explicit images?|intimate images?)\b.{0,40}\b(?:with|of|from|involving)\s+(?:a\s+)?minor\b/u.test(text)
    || near(text, sexualContent, /\b(?:without consent|nonconsensual|non-consensual|unconscious|drugged|forced)\b/u, 120)
    || /\b(?:child porn(?:ography)?|revenge porn|rape instructions?|how to rape)\b/u.test(text);
}

function violence(text: string): boolean {
  return /\b(?:how (?:do|can|should) i|help me(?:\s+plan)?(?:\s+how)?\s+to|teach me(?: how)? to|steps? to|best way to)\s+(?:quietly\s+|secretly\s+)?(?:kill|murder|hurt|poison|stab|shoot|attack|assault)\s+(?:him|her|them|someone|a person|my\s+\w+)\b/u.test(text)
    || /\b(?:how (?:do|can) i|instructions? (?:for|to)|steps? to|help me(?:\s+plan)?(?:\s+how)?\s+to|teach me(?: how)? to)\s+(?:make|build|plant|detonate)\s+(?:a\s+)?(?:bomb|explosive)\b/u.test(text)
    || /\b(?:you should|i recommend(?: that you)?|go ahead and)\s+(?:kill|murder|hurt|poison|stab|shoot|attack|assault)\b/u.test(text)
    || /\b(?:aim|stab|shoot|poison)\s+(?:for|at|in)\s+(?:the\s+)?(?:head|heart|neck|chest|food|drink)\b/u.test(text);
}

function coercion(text: string): boolean {
  return /\b(?:how (?:do|can|should) i|help me|teach me(?: how)? to|best way to)\s+(?:secretly\s+)?(?:manipulate|stalk|blackmail|gaslight|control|track)\s+(?:him|her|them|someone|a person|my\s+\w+)\b/u.test(text)
    || /\b(?:make|keep|get)\s+(?:him|her|them|someone|a person)\s+(?:obsessed with|dependent on|afraid of|unable to leave|love)\s+me\b/u.test(text)
    || /\b(?:track|monitor|record|follow|access)\s+(?:him|her|them|someone|their\s+(?:phone|location|messages?))\s+without\s+(?:their\s+)?(?:consent|knowledge|knowing)\b/u.test(text)
    || /\b(?:bypass|ignore|override)\s+(?:their\s+)?(?:consent|boundary|boundaries|refusal)\b/u.test(text)
    || /\b(?:you should|i recommend(?: that you)?|go ahead and)\s+(?:manipulate|stalk|blackmail|gaslight|control)\b/u.test(text);
}

function medical(text: string): boolean {
  const chartDiagnosis = /\b(?:(?:i|you)\s+(?:have|might have)\s+cancer(?!\s+(?:rising|sun|moon|ascendant|sign|placement))|cancer\s+(?:diagnosis|disease|illness|tumou?r)|diabetes|bipolar|schizophren\w*|depress\w*|adhd|autis\w*|pregnan\w*|fertil\w*|infertil\w*|disease|disorder|condition)\b/u;
  return /\b(?:diagnose|diagnosis for)\s+(?:me|my\b|these\b|this\b)/u.test(text)
    || /\bprescribe\s+(?:me\s+)?(?:a\s+)?(?:dose|dosage|medication|medicine|drug|treatment)\b/u.test(text)
    || /\bshould i\s+(?:take|stop|skip|change|increase|decrease|double)\s+(?:my\s+)?(?:medication|medicine|dose|dosage|prescription|antidepressant|insulin|lithium)\b/u.test(text)
    || /\b(?:tell me|recommend|what)\s+(?:which\s+)?(?:medication|medicine|drug|dose|dosage|treatment)\s+(?:i should|should i|for my)\b/u.test(text)
    || /\b(?:you should|i recommend(?: that you)?)\s+(?:take|stop|skip|change|increase|decrease|double)\s+(?:your\s+)?(?:medication|medicine|dose|dosage|prescription|antidepressant|insulin|lithium)\b/u.test(text)
    || /\b(?:take|use)\s+[1-9][0-9]*(?:\.[0-9]+)?\s*(?:mg|milligrams?|ml)\b/u.test(text)
    || /\b(?:your|this)\s+(?:birth\s+|natal\s+)?chart\s+(?:shows|proves|confirms|means|diagnoses)\b.{0,100}\b(?:you\s+have\s+(?:cancer|diabetes|a\s+disease|a\s+disorder|a\s+condition)|you\s+are\s+(?:pregnan\w*|fertil\w*|infertil\w*|bipolar|depress\w*))\b/u.test(text)
    || (near(text, ASTROLOGY, chartDiagnosis) && /\b(?:diagnos\w*|proves?|confirms?|guarantees?|will definitely|certain(?:ly)?|destined)\b/u.test(text))
    || /\b(?:diagnose|diagnosis for)\s+(?:me|my symptoms?|this rash|this pain)\b/u.test(text)
    || /\byou\s+(?:have|are suffering from)\s+(?:cancer|diabetes|bipolar disorder|schizophrenia|depression|adhd|autism)\b/u.test(text);
}

function legal(text: string): boolean {
  return /\bshould i\s+(?:plead|confess|sue|settle|sign\s+(?:the|this|my|a)\s+(?:contract|agreement|waiver|lease|deed)|testify|appeal|file for|hide evidence|destroy evidence)\b/u.test(text)
    || /\bwill i\s+(?:win|lose|avoid|beat)\s+(?:the\s+|my\s+)?(?:lawsuit|case|trial|custody battle|charge|charges|deportation)\b/u.test(text)
    || /\b(?:you should|i recommend(?: that you)?)\s+(?:plead|confess|sue|settle|sign\s+(?:the|this|your|a)\s+(?:contract|agreement|waiver|lease|deed)|testify|appeal|hide evidence|destroy evidence)\b/u.test(text)
    || /\b(?:give|provide|tell)\s+me\s+(?:a\s+)?legal strategy\b/u.test(text)
    || /\b(?:predict (?:my|the) legal outcome|how (?:do|can) i evade (?:the )?(?:police|court|law))\b/u.test(text)
    || (near(text, ASTROLOGY, /\b(?:lawsuit|court|trial|custody|guilty|innocent|legal outcome)\b/u)
      && /\b(?:guarantees?|will definitely|certain(?:ly)?|destined|proves?|confirms?)\b/u.test(text));
}

function financial(text: string): boolean {
  const asset = /\b(?:token|stock|share|crypto|coin|asset|portfolio|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/u;
  const explicitMarketAsset = /\b(?:token|stock|shares?|crypto|coin|asset|portfolio|fund|etf|bond|option|investment|market)\b/u.test(text);
  const zodiacMarketAsset = /\b(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/u.test(text)
    && /\b(?:now|today|tomorrow|price|market|token|portfolio|investment|return|profit)\b/u.test(text);
  const bareZodiacTradeDecision = /\b(?:should (?:i|we)|you should|i recommend(?: that you)?)\s+(?:buy|sell|trade|invest in|hold|short|bet on|stake)\s+(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)(?:[?.!]|$)/u.test(text);
  const hasMarketAsset = explicitMarketAsset || zodiacMarketAsset || bareZodiacTradeDecision;
  return /\b(?:buy|sell|trade|invest in|short|bet on)\s+(?:this|the|that|an?)\s+(?:token|stock|share|crypto|coin|asset)\b.{0,90}\b(?:now|today|tomorrow|entire savings|all (?:my|your) money)\b/u.test(text)
    || (hasMarketAsset && /\bshould (?:i|we)\s+(?:buy|sell|trade|invest|hold|short|bet|stake)\b/u.test(text))
    || /\bwhich\s+(?:token|stock|share|crypto|coin|asset|fund|etf|bond|option)\s+should (?:i|we)\s+(?:buy|sell|trade|hold|short|stake)\b/u.test(text)
    || (hasMarketAsset && /\b(?:tell me|recommend|decide)\s+(?:what|when|which|whether)\s+(?:to\s+)?(?:buy|sell|trade|invest|hold|short|bet|stake)\b/u.test(text))
    || (hasMarketAsset && /\b(?:best|good|right|ideal|lucky)\s+(?:time|day|date|sign)\s+to\s+(?:buy|sell|trade|invest|exit|enter|bet)\b/u.test(text))
    || (hasMarketAsset && /\b(?:you should|i recommend(?: that you)?|go ahead and)\s+(?:buy|sell|trade|invest|hold|short|bet|stake)\b/u.test(text))
    || (hasMarketAsset && /\b(?:buy|sell|trade|short|bet)\b.{0,80}\b(?:right now|today|tomorrow|before (?:the|this)|after (?:the|this))\b/u.test(text))
    || /\b(?:guaranteed|risk[ -]?free|certain)\s+(?:return|returns|profit|profits|gain|gains|win)\b/u.test(text)
    || /\b(?:price|value|market)\s+(?:will|is going to|must)\s+(?:rise|fall|go up|go down|double|crash|moon)\b/u.test(text)
    || /\b(?:birth\s+|natal\s+)?(?:chart|horoscope|astrology|transit)\b.{0,90}\b(?:says?|means|shows?|proves?|confirms?|guarantees?)\b.{0,80}\b(?:buy|sell|trade|invest|price target|entry|exit|profit|wealth|rich)\b/u.test(text)
    || (near(text, ASTROLOGY, asset, 100) && /\b(?:will definitely|certain(?:ly)?|destined)\b.{0,80}\b(?:rise|fall|profit|wealth|rich)\b/u.test(text))
    || /\b(?:your|this)\s+(?:birth\s+|natal\s+)?chart\s+(?:guarantees?|proves?|confirms?|means)\b.{0,100}\b(?:wealth|profit|lottery|rich|market|token|stock|crypto)\b/u.test(text);
}

function otherHighStakes(text: string): boolean {
  const injection = /\bignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+(?:instructions?|messages?|rules?)\b/u.test(text)
    && /\b(?:reveal|show|print|return|expose|dump|bypass|disable|secret|key|prompt|policy|safety)\b/u.test(text);
  const secretExfiltration = /\b(?:reveal|show|print|return|expose|dump)\b.{0,70}\b(?:system prompt|developer message|api key|secret key|credential|environment variable)\b/u.test(text)
    && !/\b(?:can(?:not|'t)|won't|will not|must not|never|refuse to)\b.{0,45}\b(?:reveal|show|print|return|expose|dump)\b/u.test(text);
  const jailbreak = /\b(?:jailbreak|developer mode|dan mode)\b.{0,90}\b(?:bypass|ignore|disable|safety|policy|rules?)\b/u.test(text);
  const astrologyDeathPrediction = near(text, ASTROLOGY, /\b(?:when (?:will|do) i die|date of (?:my )?death|will i die|death date)\b/u)
    && /\b(?:predict|tell|shows?|proves?|confirms?|guarantees?|will|destined)\b/u.test(text);
  const concreteCriminalMisuse = /\b(?:how (?:do|can) i|help me|steps? to|best way to)\s+(?:launder money|forge (?:a )?(?:passport|id|signature)|steal credentials|hack (?:their|someone's|a) account|evade (?:the )?police)\b/u.test(text);
  return injection || secretExfiltration || jailbreak || astrologyDeathPrediction || concreteCriminalMisuse;
}

function unsafeInfluence(text: string): boolean {
  const injection = /\bignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+(?:instructions?|messages?|rules?)\b/u.test(text)
    && /\b(?:reveal|show|print|return|expose|dump|bypass|disable|secret|key|prompt|policy|safety)\b/u.test(text);
  const secretExfiltration = /\b(?:reveal|show|print|return|expose|dump)\b.{0,70}\b(?:system prompt|developer message|api key|secret key|credential|environment variable)\b/u.test(text)
    && !/\b(?:can(?:not|'t)|won't|will not|must not|never|refuse to)\b.{0,45}\b(?:reveal|show|print|return|expose|dump)\b/u.test(text);
  const jailbreak = /\b(?:jailbreak|developer mode|dan mode)\b.{0,90}\b(?:bypass|ignore|disable|safety|policy|rules?)\b/u.test(text);
  const embeddedUnsafeInstruction = /\b(?:system|developer|assistant)\s*(?:message|instruction)?\s*[:=]\s*.{0,120}\b(?:kill|poison|stalk|blackmail|bypass consent|buy|sell|take [1-9][0-9]*\s*mg)\b/u.test(text);
  return injection || secretExfiltration || jailbreak || embeddedUnsafeInstruction;
}

function classifyText(text: string): GuideLocalSafetyCategory {
  if (crisis(text)) return 'crisis';
  if (sexual(text)) return 'sexual';
  if (violence(text)) return 'violence';
  if (coercion(text)) return 'coercion';
  if (medical(text)) return 'medical';
  if (legal(text)) return 'legal';
  if (financial(text)) return 'financial';
  if (otherHighStakes(text)) return 'other_high_stakes';
  return 'allowed';
}

/** Classify the current user turn independently of transcript or context. */
export function classifyGuideCurrentTurnSafety(currentUserMessage: string): GuideLocalSafetyCategory {
  if (typeof currentUserMessage !== 'string') return 'other_high_stakes';
  return classifyText(normalize(currentUserMessage));
}

/**
 * Classify the current turn, plus the preceding model-visible material only for
 * prompt injection or embedded unsafe influence. Historical crisis/high-stakes
 * disclosures never poison a later benign turn.
 */
export function classifyGuideLocalInputSafety(
  currentUserMessage: string,
  priorModelVisibleInput = '',
): GuideLocalSafetyCategory {
  if (typeof currentUserMessage !== 'string' || typeof priorModelVisibleInput !== 'string') {
    return 'other_high_stakes';
  }
  const current = classifyGuideCurrentTurnSafety(currentUserMessage);
  if (current !== 'allowed') return current;
  return unsafeInfluence(normalize(priorModelVisibleInput)) ? 'other_high_stakes' : 'allowed';
}

/**
 * Classify a buffered candidate response. The current user trigger is used only
 * to catch terse unsafe follow-through (for example, "Yes. Do it now."). A
 * responsible refusal or referral is not reclassified merely because the
 * triggering request was unsafe.
 */
export function classifyGuideLocalOutputSafety(
  candidateOutput: string,
  triggerContext: string,
): GuideLocalSafetyCategory {
  if (typeof candidateOutput !== 'string' || typeof triggerContext !== 'string') {
    return 'other_high_stakes';
  }
  const output = normalize(candidateOutput);
  const direct = classifyText(output);
  if (direct !== 'allowed') return direct;

  const boundarySpans = textSpans(output, RESPONSIBLE_BOUNDARY);
  if (boundarySpans.length > 0) {
    const contradictorySpans = textSpans(output, CONTRADICTORY_AFFIRMATIVE_FOLLOW_THROUGH);
    const contradictionAfterBoundary = contradictorySpans.some((affirmative) => (
      boundarySpans.some((boundary) => affirmative.start >= boundary.end)
    ));
    if (!contradictionAfterBoundary) return 'allowed';
    return classifyText(normalize(triggerContext));
  }

  if (!AFFIRMATIVE_FOLLOW_THROUGH.test(output)) return 'allowed';
  return classifyText(normalize(triggerContext));
}
