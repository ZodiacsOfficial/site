import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const visibleText = (source) => source
  .replace(/\{\s*['"]\s+['"]\s*\}/gu, ' ')
  .replace(/<[^>]*>/gu, '')
  .replace(/\s+/gu, ' ')
  .trim();

const policyLinks = [
  'https://vercel.com/legal/privacy-notice',
  'https://developers.jup.ag/docs/legal/privacy-policy',
  'https://docs.raydium.io/resources/license',
  'https://v2.raydium.io/docs/disclaimer/',
];

const privacyParagraphs = new Map([
  [
    'src/pages/privacy/index.astro',
    {
      date: "const updated = '10 August 2026';",
      text: 'Registry Pro provider comparison. Only after you press “Compare quotes,” your browser sends a same-origin request to Zodiacs.org. Zodiacs.org and Vercel receive the selected Registry sign, buy or sell side, exact input amount, selected Raydium slippage guard, and ordinary request metadata such as IP address, time, and browser information; Vercel also uses the source IP for the short abuse-prevention rate limit. Our server derives the official token identifiers and sends the exact pair and amount to Jupiter’s Swap V2 Meta-Aggregator and Raydium, plus the selected guard to Raydium only. These providers receive requests from our server, not directly from your browser: the application does not forward your visitor IP, user agent, referrer, wallet address, birth or chart data, Aura results, or assistant text. The returned values are short-lived, non-executable comparisons; no wallet is connected, and no transaction, signature, provider request handle, or executable order reaches or is usable by the page. The server removes any provider request handle before responding and never calls an execution endpoint. The application does not save the comparison to an account or analytics, but Vercel, Jupiter, Raydium, and their infrastructure may retain operational or security logs under practices we do not control.',
    },
  ],
  [
    'src/pages/es/privacy/index.astro',
    {
      date: "const updated = '10 de agosto de 2026';",
      text: 'Comparación de proveedores en Registry Pro. Solo después de pulsar «Comparar cotizaciones», el navegador envía una solicitud del mismo origen a Zodiacs.org. Zodiacs.org y Vercel reciben el signo del Registro seleccionado, el lado de compra o venta, el importe exacto de entrada, el límite de deslizamiento de Raydium elegido y metadatos ordinarios de la solicitud, como la dirección IP, la hora y la información del navegador; Vercel usa además la IP de origen para el breve límite contra abusos. Nuestro servidor deriva los identificadores oficiales de los tokens y envía el par y el importe exacto al Meta-Agregador Swap V2 de Jupiter y a Raydium, y el límite elegido solo a Raydium. Los proveedores reciben la solicitud de nuestro servidor, no directamente de tu navegador: la aplicación no reenvía tu IP, agente de usuario, página de origen, dirección de billetera, datos de nacimiento o de carta, resultados de Aura ni texto del asistente. Los valores son comparaciones breves y no ejecutables; no se conecta una billetera y ninguna transacción, firma, identificador de solicitud del proveedor u orden ejecutable llega a la página ni puede usarse en ella. El servidor elimina cualquier identificador de solicitud del proveedor antes de responder y nunca llama a un endpoint de ejecución. La aplicación no guarda la comparación en una cuenta ni en la analítica; Vercel, Jupiter, Raydium y su infraestructura pueden conservar registros operativos o de seguridad según prácticas que no controlamos.',
    },
  ],
  [
    'src/pages/fr/privacy/index.astro',
    {
      date: "const updated = '10 août 2026';",
      text: 'Comparaison de fournisseurs dans Registry Pro. Ce n’est qu’après l’activation de « Comparer les cotations » que le navigateur envoie une requête de même origine à Zodiacs.org. Zodiacs.org et Vercel reçoivent le signe du Registre choisi, le côté achat ou vente, le montant d’entrée exact, la limite de glissement Raydium choisie et les métadonnées ordinaires de la requête, telles que l’adresse IP, l’heure et les informations du navigateur ; Vercel utilise aussi l’IP source pour la courte limitation anti-abus. Notre serveur déduit les identifiants officiels des jetons et envoie la paire et le montant exact au méta-agrégateur Swap V2 de Jupiter et à Raydium, ainsi que la limite choisie à Raydium uniquement. Les fournisseurs reçoivent une requête de notre serveur, pas directement du navigateur : l’application ne leur transmet ni l’IP du visiteur, ni l’agent utilisateur, ni le référent, ni l’adresse de portefeuille, ni les données de naissance ou de thème, ni les résultats Aura, ni le texte de l’assistant. Les valeurs sont des comparaisons brèves et non exécutables ; aucun portefeuille n’est connecté, et aucune transaction, signature, identifiant de requête du fournisseur ou ordre exécutable n’atteint la page ni ne peut y être utilisé. Le serveur retire tout identifiant de requête du fournisseur avant de répondre et n’appelle jamais de point de terminaison d’exécution. L’application n’enregistre pas la comparaison dans un compte ou l’analytique ; Vercel, Jupiter, Raydium et leur infrastructure peuvent conserver des journaux opérationnels ou de sécurité selon des pratiques que nous ne contrôlons pas.',
    },
  ],
  [
    'src/pages/it/privacy/index.astro',
    {
      date: "const updated = '10 agosto 2026';",
      text: 'Confronto tra fornitori in Registry Pro. Solo dopo aver selezionato «Confronta le quotazioni», il browser invia una richiesta same-origin a Zodiacs.org. Zodiacs.org e Vercel ricevono il segno del Registro selezionato, il lato acquisto o vendita, l’importo esatto in entrata, il limite di slippage Raydium scelto e i normali metadati della richiesta, come indirizzo IP, ora e informazioni del browser; Vercel usa inoltre l’IP di origine per il breve limite antiabuso. Il nostro server ricava gli identificativi ufficiali dei token e invia la coppia e l’importo esatto al Meta-Aggregatore Swap V2 di Jupiter e a Raydium, e il limite scelto solo a Raydium. I fornitori ricevono la richiesta dal nostro server, non direttamente dal browser: l’applicazione non inoltra l’IP del visitatore, lo user agent, il referrer, l’indirizzo del wallet, dati di nascita o del tema, risultati Aura o testo dell’assistente. I valori sono confronti di breve durata e non eseguibili; non viene collegato alcun wallet e nessuna transazione, firma, identificativo della richiesta del fornitore od ordine eseguibile raggiunge la pagina o può essere usato dalla pagina. Il server rimuove qualsiasi identificativo della richiesta del fornitore prima di rispondere e non chiama mai un endpoint di esecuzione. L’applicazione non salva il confronto in un account o nell’analitica; Vercel, Jupiter, Raydium e la loro infrastruttura possono conservare log operativi o di sicurezza secondo pratiche che non controlliamo.',
    },
  ],
  [
    'src/pages/pt/privacy/index.astro',
    {
      date: "const updated = '10 de agosto de 2026';",
      text: 'Comparação de provedores no Registry Pro. Só depois de selecionar «Comparar cotações» o navegador envia um pedido da mesma origem ao Zodiacs.org. O Zodiacs.org e a Vercel recebem o signo do Registo selecionado, o lado de compra ou venda, o montante exato de entrada, o limite de slippage da Raydium escolhido e metadados comuns do pedido, como endereço IP, hora e informações do navegador; a Vercel também usa o IP de origem para o breve limite contra abusos. O nosso servidor deriva os identificadores oficiais dos tokens e envia o par e o montante exato ao Meta-Agregador Swap V2 da Jupiter e à Raydium, e o limite escolhido apenas à Raydium. Os provedores recebem o pedido do nosso servidor, não diretamente do navegador: a aplicação não encaminha o IP do visitante, agente do utilizador, página de origem, endereço da carteira, dados de nascimento ou do mapa, resultados do Aura nem texto do assistente. Os valores são comparações breves e não executáveis; nenhuma carteira é ligada e nenhuma transação, assinatura, identificador do pedido do provedor ou ordem executável chega à página ou pode ser usada por ela. O servidor remove qualquer identificador do pedido do provedor antes de responder e nunca chama um endpoint de execução. A aplicação não guarda a comparação numa conta nem na analítica; Vercel, Jupiter, Raydium e a sua infraestrutura podem conservar registos operacionais ou de segurança segundo práticas que não controlamos.',
    },
  ],
  [
    'src/pages/ru/privacy/index.astro',
    {
      date: "const updated = '10 августа 2026 года';",
      text: 'Сравнение поставщиков в Registry Pro. Только после нажатия «Сравнить котировки» браузер отправляет запрос того же источника на Zodiacs.org. Zodiacs.org и Vercel получают выбранный знак Реестра, сторону покупки или продажи, точную входную сумму, выбранный предел проскальзывания Raydium и обычные метаданные запроса, например IP-адрес, время и сведения о браузере; Vercel также использует исходный IP-адрес для краткосрочного ограничения от злоупотреблений. Наш сервер определяет официальные идентификаторы токенов и отправляет пару и точную сумму в Meta-Aggregator Swap V2 Jupiter и Raydium, а выбранный предел — только в Raydium. Поставщики получают запрос от нашего сервера, а не напрямую из браузера: приложение не пересылает IP-адрес посетителя, user agent, referrer, публичный адрес кошелька, данные рождения или карты, результаты Aura либо текст ассистента. Возвращаемые значения — краткосрочные, неисполнимые сравнения; кошелёк не подключается, и транзакция, подпись, идентификатор запроса поставщика или исполнимый ордер не передаются на страницу и не могут быть использованы ею. Сервер удаляет любой идентификатор запроса поставщика перед ответом и никогда не вызывает API исполнения. Приложение не сохраняет сравнение в аккаунте или аналитике; Vercel, Jupiter, Raydium и их инфраструктура могут хранить операционные журналы или журналы безопасности по правилам, которые мы не контролируем.',
    },
  ],
]);

describe('Registry Pro public disclosures', () => {
  it('publishes the complete reviewed engineering draft in every Privacy locale', async () => {
    for (const [path, disclosure] of privacyParagraphs) {
      const source = await read(path);
      expect(source, path).toContain(disclosure.date);
      expect(visibleText(source), path).toContain(disclosure.text);
      for (const link of policyLinks) expect(source, `${path}: ${link}`).toContain(link);
    }
  });

  it('keeps the direct browser market-data disclosure beside Registry Pro', async () => {
    for (const path of privacyParagraphs.keys()) {
      const source = await read(path);
      expect(source, path).toMatch(/Dex ?Screener/u);
      expect(source, path).toContain('GeckoTerminal');
    }
  });

  it('publishes the non-executable comparison boundary in Terms', async () => {
    const source = await read('src/pages/terms/index.astro');
    expect(source).toContain("const updated = '10 August 2026';");
    expect(visibleText(source)).toContain(
      'Registry Pro may display a user-requested, server-mediated comparison of short-lived, non-executable quotes from Raydium and the Jupiter Swap V2 Meta-Aggregator. It is not an order, offer, execution service, recommendation, or promise of best execution. The providers use different routing and slippage methods; figures may expire or change before any separate transaction and may be incomplete, unavailable, or wrong. Zodiacs.org does not connect a wallet, receive a wallet address, build, sign, submit, or settle a transaction, route an order, or receive compensation for the comparison. Any later trade is separate and governed by the chosen venue, wallet, network, and applicable eligibility restrictions.',
    );
  });

  it('dates every changed public policy route from the final sitemap override', async () => {
    const source = await read('src/pages/sitemap.xml.ts');
    const marker = '// Registry Pro disclosure publication.';
    const override = source.slice(source.lastIndexOf(marker));
    for (const route of [
      '/privacy/', '/es/privacy/', '/fr/privacy/', '/it/privacy/',
      '/pt/privacy/', '/ru/privacy/', '/terms/',
    ]) {
      expect(override, route).toContain(`'${route}'`);
    }
    expect(override).toContain(".map((loc) => [loc, '2026-08-10'] as const)");
  });
});
