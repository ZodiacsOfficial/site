# C5 Spanish native-speaker review

Engineering checks can catch missing translations and schema drift, but they
cannot certify idiom. A native Spanish-speaking reviewer should read every
item below in the rendered page and mark it approved or add a correction.

Status: **human language signoff pending**.

## Scope guard

- [ ] Confirm this packet does not add a localized path or a new Spanish page.
- [ ] Confirm `/es/horoscopes/` remains the existing noindex English-content
  bridge and is not presented as a completed Spanish translation.
- [ ] Confirm the relationship/register vocabulary remains separate from the
  free astrology-tool vocabulary.
- [ ] Note that pre-existing long-form interpretations produced by the shared
  English `bigThree`, natal, Saturn-return, synastry and transit generators are
  not translated by this focused packet. C5 localizes the enumerated SSR,
  entity-label, date, inline-message and Today-by-sign paths; it does not claim
  full editorial translation of every computed result.

## Shared 12-sign guide frames

These templates render once for each of Aries, Tauro, Géminis, Cáncer, Leo,
Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario and Piscis.

- [ ] `{signo} suele mostrarse {temperamento}. Eso no significa que todas las personas de este signo actúen igual; significa que, cuando la carta le da fuerza, la vida se organiza alrededor de ese pulso. Su don es claro: {don}.`
- [ ] `En la amistad busca {amistad}. A veces la compatibilidad más sana no es la más intensa, sino la que deja al signo respirar sin tener que traducirse todo el día. Cuando {signo} se siente aceptado, su mejor cualidad aparece sin esfuerzo.`
- [ ] `{compatibilidad fluida}. Esa suele ser la química más fácil. {compatibilidad exigente}. Esos vínculos no tienen por qué ser una mala idea: simplemente piden más conciencia. En pareja, la carta completa importa mucho más que el Sol. La Luna, Venus, Marte, el ascendente y las casas muestran la historia real.`
- [ ] Heading: `{signo} en el trabajo, el dinero y el propósito`.
- [ ] `En el trabajo, {signo} destaca al {trabajo}. No siempre se trata de una profesión literal; puede ser una forma de abordar cualquier tarea. Donde otras personas ven un pendiente más, este signo ve una manera de ordenar su energía y demostrar lo que sabe hacer.`
- [ ] `Tu signo solar es solo una parte. Con el Sol en {signo}, aparece una {sol}. Con la Luna en {signo}, la historia se vuelve una {luna}. Con el ascendente en {signo}, el mundo suele encontrarse primero con una {ascendente}.`
- [ ] `El cuerpo también cuenta. A {signo} le ayudan estas prácticas: {cuidado corporal}. La astrología es más útil cuando baja a decisiones pequeñas: cómo descansas, cómo pides, cómo sales de un ciclo y qué eliges repetir.`
- [ ] `Significa que varios planetas o puntos importantes hablan el idioma de {signo}, un signo de {elemento y modalidad}. La guía toma esta regencia como referencia: {regencia}. Se nota en la personalidad, los vínculos y las decisiones, pero la casa y los aspectos dicen dónde se expresa.`

## Isolated guide corrections

- [ ] Cáncer: `Sí. Cáncer es agua cardinal: emoción que inicia el cuidado.`
- [ ] Virgo: `Su reto es permitir que algo sea suficientemente bueno. El mismo ojo que mejora proyectos puede volverse duro con la propia persona si no aprende a descansar.`
- [ ] Libra: `Libra empieza cerca del equinoccio de septiembre, cuando día y noche se equilibran. Su tema central es la relación: proporción, belleza, justicia y elección mutua.`
- [ ] Capricornio: `Capricornio ama con compromiso práctico. Puede tardar en abrirse, pero cuando lo hace suele pensar en el largo plazo, el cuidado real y las decisiones sostenibles.`
- [ ] Virgo work phrase: `analizar, curar, escribir, investigar, cuidar la salud, diseñar procesos y volver útil el conocimiento`.
- [ ] Libra work phrase: `negociar, diseñar, asesorar, escribir, defender la justicia y crear experiencias equilibradas`.
- [ ] Libra love phrase: `reciprocidad, conversación, belleza compartida y una relación donde la elección sea mutua`.
- [ ] Libra Sun phrase: `identidad que se descubre en el espejo de los demás: relación, gusto, justicia y elección consciente`.
- [ ] Escorpio purpose phrase: `aprender que el poder no es control, y que confiar también puede ser una fuerza`.
- [ ] Capricornio house phrase: `la zona donde tomas responsabilidad, creas estructura y aprendes el poder de la paciencia`.
- [ ] Capricornio work phrase: `dirigir, planificar, administrar, construir instituciones, cuidar la reputación y sostener metas largas`.
- [ ] Acuario purpose phrase: `aprender que ser diferente no exige estar solo, y que la comunidad también puede tener intimidad`.
- [ ] Piscis love phrase: `ternura, misterio, empatía, arte y una relación donde la sensibilidad no sea motivo de burla`.
- [ ] Piscis friendship phrase: `amistades suaves, creativas, espirituales o muy humanas, donde nadie tenga que fingir dureza`.

## Interactive UI strings

### General and dynamic messages

- [ ] `horóscopo en inglés`
- [ ] `Toca tu signo solar para la lectura de hoy — calculada a partir del cielo real, sin hora de nacimiento.`
- [ ] `o`
- [ ] `Guardada en tus cartas. Inicia sesión` + link `aquí` + `cuando quieras tenerlas en todos tus dispositivos.`
- [ ] `Sesión iniciada como {email}`
- [ ] `¿Eliminar "{name}" de este dispositivo?`
- [ ] `Comparar {a} y {b}`
- [ ] `Dos cartas guardadas ya pueden compararse: cada aspecto entre cartas, leído con claridad y calculado en este dispositivo.`
- [ ] `Solo con la fecha se ubican los años de tu retorno. La hora y el lugar afinan las fechas por unos días, pero nunca cambian el año.`
- [ ] `{ordinal} retorno`
- [ ] `Mercurio retrógrado`
- [ ] `Mercurio directo`
- [ ] `{planet} retrógrado`
- [ ] `Luna llena`
- [ ] `Luna nueva`
- [ ] `{event} esta noche`
- [ ] `{event} mañana`
- [ ] `{event} en {days} días`
- [ ] Accessibility label: `Condiciones actuales del cielo, calculadas en vivo`.
- [ ] Accessibility label: `Luna, {percent}% iluminada`.
- [ ] `Leer la combinación de {a} y {b}`
- [ ] `Invitar a alguien a comparar con {name}`
- [ ] `El enlace incluye los datos de nacimiento de {name} y abre esta página con ese lado completado; no se nos envía nada. Conviene tener su permiso si no eres tú.`
- [ ] `{date} · mediodía UTC`
- [ ] `retorno de {planet}`
- [ ] `{planet} natal`
- [ ] `{signo} forma parte de las Doce piezas del Registro.`
- [ ] Count labels: `carta guardada` / `cartas guardadas`.
- [ ] Count-state labels: `con sincronización activa` / `en este navegador`.

### Planet, aspect and Moon labels

- [ ] Planets: `Sol`, `Luna`, `Mercurio`, `Venus`, `Marte`, `Júpiter`, `Saturno`, `Urano`, `Neptuno`, `Plutón`, `Nodo Norte`, `Nodo Sur`.
- [ ] Aspects: `conjunción`, `sextil`, `cuadratura`, `trígono`, `oposición`.
- [ ] Moon phases: `Luna nueva`, `Luna creciente`, `Cuarto creciente`, `Gibosa creciente`, `Luna llena`, `Gibosa menguante`, `Cuarto menguante`, `Luna menguante`.

### Today-by-sign house themes

- [ ] House 1: `tu imagen, tus comienzos y la impresión que causas`.
- [ ] House 2: `el dinero, las posesiones y lo que te da estabilidad`.
- [ ] House 3: `los recados, los hermanos, los mensajes y tu entorno cercano`.
- [ ] House 4: `el hogar, la familia y la base privada de tu vida`.
- [ ] House 5: `el placer, el romance, la infancia y lo que creas por gusto`.
- [ ] House 6: `el trabajo en curso, los hábitos de salud y la carga diaria`.
- [ ] House 7: `la pareja y las personas que se sientan frente a ti`.
- [ ] House 8: `el dinero compartido, las deudas, la intimidad y lo que se fusiona`.
- [ ] House 9: `los viajes, el estudio, las creencias y la mirada de largo alcance`.
- [ ] House 10: `la carrera, la reputación y lo que ve el público`.
- [ ] House 11: `las amistades, los grupos y el futuro al que apuntas`.
- [ ] House 12: `el descanso, el retiro y lo que ocurre bajo la superficie`.

### Today-by-sign sentence frames

- [ ] Ordinals: `primera`, `segunda`, `tercera`, `cuarta`, `quinta`, `sexta`, `séptima`, `octava`, `novena`, `décima`, `undécima`, `duodécima`.
- [ ] Planet frames: `La Luna pasa hoy por`, `El Sol recorre`, `Mercurio activa`, `Venus aporta calidez a`, `Marte impulsa`, `Júpiter expande`, `Saturno pone a prueba`, `Urano altera`, `Neptuno difumina`, `Plutón transforma lentamente`.
- [ ] Body frame: `{planet frame} tu {ordinal} casa: {house theme}.`
- [ ] Standard ingress frame: `{planet} entra hoy en tu {ordinal} casa y pone el foco en {house theme}.`
- [ ] Saturn/Pluto ingress frame: `{planet} entra hoy en tu {ordinal} casa y pone el foco a largo plazo en {house theme}.`
- [ ] New-Moon frame: `Luna nueva en tu {ordinal} casa: abre un punto de partida en {house theme}.`
- [ ] Full-Moon frame: `Luna llena en tu {ordinal} casa: marca una culminación en {house theme}.`
- [ ] Retrograde station frame: `{planet} estaciona retrógrado en tu {ordinal} casa: pone en revisión {house theme}.`
- [ ] Direct station frame: `{planet} estaciona directo en tu {ordinal} casa: vuelve a poner en movimiento {house theme}.`
- [ ] Aspect frame: `{planet A} en {aspect} con {planet B} alcanza hoy su punto exacto: es un aspecto de alcance general y el recibo muestra la hora.`
- [ ] Empty-state headline: `Un cielo tranquilo hoy.`

## Page FAQ and schema-visible strings

This list covers every new or edited natural-language Spanish string in the
page/schema portion of C5. Schema.org type names, currency codes and operating
system enum values are machine vocabulary and are not language-review items.

### Shared schema and breadcrumb labels

- [ ] `Zodiacs.org en español`
- [ ] `Signos del zodiaco`
- [ ] `Herramientas`
- [ ] `Calculadora de carta natal`

### `/es/baby-zodiac/`

- [ ] Schema name: `Zodiaco del bebé: ¿qué signo tendrá?`
- [ ] Schema/meta description: `Ingresa una fecha probable de parto para ver el signo solar casi seguro, los signos lunares posibles de la semana y qué información no puede saberse hasta conocer el minuto del nacimiento.`
- [ ] FAQ heading: `Preguntas sobre el zodiaco del bebé`.
- [ ] Q: `¿Qué signo del zodiaco tendrá mi bebé?` A: `Ingresa la fecha probable de parto. El signo del Sol en esa fecha es casi seguro, porque el Sol permanece cerca de un mes en cada signo. Las excepciones honestas están en los límites: una fecha cercana al cambio de signo o un nacimiento un par de semanas antes o después puede cambiar la respuesta. La herramienta calcula ambos casos en lugar de adivinarlos.`
- [ ] Q: `¿Puedo saber el signo lunar antes del nacimiento?` A: `Solo como una lista corta. La Luna cambia de signo cada dos o tres días, así que la semana probable de parto suele abarcar dos o tres signos lunares. La herramienta muestra los intervalos de esa semana con sus fechas; el día y la hora del nacimiento determinan cuál corresponde.`
- [ ] Q: `¿Y el ascendente?` A: `No se puede predecir. El ascendente cambia aproximadamente cada dos horas durante todo el día, por lo que depende por completo del minuto y el lugar del nacimiento. Por eso el certificado de nacimiento es importante para la astrología.`
- [ ] Q: `¿Un planeta retrógrado al nacer significa algo malo?` A: `No. Los retrógrados son normales: Mercurio está retrógrado aproximadamente una quinta parte del tiempo, y todo el mundo nace con algún planeta en algún estado. En una carta natal, un planeta retrógrado suele interpretarse como una energía más interior de lo habitual; es un matiz, no un defecto.`
- [ ] Q: `¿Cuándo debo calcular la carta real?` A: `Cuando tengas la hora de nacimiento por escrito. La fecha, la hora exacta y el lugar permiten calcular la carta completa: la Luna fijada en su signo, el ascendente, las casas y los aspectos. La calculadora lo hace en tu dispositivo y tarda unos veinte segundos.`

### `/es/birth-chart/`

- [ ] Schema name: `Calculadora gratuita de carta natal`.
- [ ] Feature list: `Sol, Luna, ascendente, planetas de Mercurio a Plutón, Nodo verdadero, casas por signo entero y Placidus, aspectos`.
- [ ] FAQ heading: `Preguntas sobre la carta natal`.
- [ ] Q: `¿Qué es una carta natal?` A: `Una carta natal, o carta astral, es un mapa de la posición de cada planeta —vista desde la Tierra— en el momento y lugar exactos en que naciste. Registra tu Sol, Luna y ascendente, además de las posiciones de Mercurio a Plutón en las doce casas.`
- [ ] Q: `¿Necesito saber mi hora exacta de nacimiento?` A: `Para calcular el ascendente y las casas, sí: el ascendente cambia aproximadamente cada dos horas. Si no sabes la hora, calculamos los planetas al mediodía; tu Sol y, por lo general, tu Luna siguen siendo precisos para ese día. El certificado de nacimiento, el libro del bebé o tu familia suelen ser las mejores fuentes.`
- [ ] Q: `¿Qué tan precisa es esta calculadora?` A: `Las posiciones planetarias se calculan con un motor astronómico profesional y se comparan de forma continua con datos de referencia de NASA JPL, con un margen de unas centésimas de grado. Las zonas horarias históricas, incluida la hora media local anterior a 1922 y los cambios de horario en tiempos de guerra, se resuelven con la base completa de IANA.`
- [ ] Q: `¿Qué ocurre con mis datos de nacimiento?` A: `La carta completa se calcula en tu navegador; no existe una API del servidor para las cartas ni necesitas una cuenta. Si guardas una carta, primero permanece en este dispositivo. La sincronización opcional solo sube las cartas guardadas después de que inicias sesión.`
- [ ] Q: `Casas por signo entero o Placidus: ¿cuál elijo?` A: `El sistema de casas por signo entero es el más antiguo y el más fácil de leer: cada casa ocupa un signo completo. Placidus es la opción moderna más habitual y divide las casas según el tiempo que tardan en ascender, por lo que su tamaño varía. Prueba ambos: tus planetas no se mueven; solo cambian los límites de las casas.`

### `/es/compatibility/`

- [ ] Schema name: `Calculadora de compatibilidad`.
- [ ] Schema description: `Calculadora gratuita de sinastría para comparar dos cartas natales en tu dispositivo.`
- [ ] FAQ heading: `Preguntas sobre la compatibilidad`.
- [ ] Q: `¿Cómo funciona la compatibilidad astrológica?` A: `La astrología compara dos cartas natales midiendo los ángulos entre los planetas de una persona y los de la otra; esta práctica se llama sinastría. Los trígonos y sextiles entre cartas se interpretan como facilidad, mientras que las cuadraturas y oposiciones señalan una fricción productiva. La compatibilidad entre signos solares es el resumen de una sola línea de una comparación mucho más amplia.`
- [ ] Q: `¿La compatibilidad entre signos solares es real?` A: `Es la capa útil más sencilla. Dos personas son mucho más que sus signos solares: en la práctica, la Luna, Venus y Marte suelen importar más. Las guías de parejas de signos son puntos de partida honestos, y la calculadora compara las dos cartas natales cuando tienes los datos de nacimiento.`
- [ ] Q: `¿Necesito las horas exactas de nacimiento para comparar dos cartas?` A: `Las horas ayudan, pero no son imprescindibles. Sin ellas, los planetas siguen siendo precisos para el día; solo se omiten los ascendentes y las casas. La Luna avanza unos 13 grados al día, así que una hora desconocida puede volver impreciso algún aspecto lunar.`

### `/es/moon-phase/`

- [ ] Schema name: `Herramienta de fases lunares`.
- [ ] FAQ heading: `Preguntas sobre las fases lunares`.
- [ ] Q: `¿En qué fase está la Luna esta noche?` A: `El indicador al principio de esta página la calcula en vivo en tu dispositivo: muestra el nombre de la fase actual, el porcentaje iluminado y el signo que ocupa la Luna ahora mismo, con la hora en tiempo universal.`
- [ ] Q: `¿Cuál era la fase lunar el día de mi cumpleaños?` A: `Ingresa tu fecha de nacimiento en el buscador. La fase puede calcularse con precisión a partir de la fecha, porque la Luna tarda unos 29,5 días en completar su ciclo. La astrología interpreta la fase natal como una nota de temperamento: se dice que quienes nacen con Luna nueva inician cosas y quienes nacen con Luna llena viven de forma más pública.`
- [ ] Q: `¿Cada cuánto hay Luna llena?` A: `Cada 29,5 días en promedio: ese periodo se llama mes sinódico. Su desfase con el calendario hace que la Luna llena cambie de fecha cada mes y que, en ocasiones, caiga una segunda Luna llena dentro del mismo mes calendario: la llamada Luna azul.`
- [ ] Q: `¿La fase lunar afecta a mi signo lunar?` A: `Son dos medidas distintas. La fase compara la Luna con el Sol; el signo lunar indica dónde estaba la Luna dentro del zodiaco. Puede haber Luna llena en cualquiera de los doce signos. El signo lunar es el que la astrología interpreta como una descripción del temperamento emocional.`

### `/es/moon-sign/`

- [ ] Schema name: `Calculadora de signo lunar`.
- [ ] FAQ heading: `Preguntas sobre el signo lunar`.
- [ ] Q: `¿Qué es el signo lunar?` A: `Tu signo lunar es el signo del zodiaco que ocupaba la Luna cuando naciste. Mientras que el signo solar describe tu identidad central, el signo lunar habla de tu vida emocional: cómo sientes, qué te calma y qué necesitas para sentirte a salvo. Muchas personas se reconocen más en su Luna que en su Sol.`
- [ ] Q: `¿Necesito mi hora de nacimiento para saber mi signo lunar?` A: `Normalmente no: la Luna permanece unos dos días y medio en cada signo, así que la mayoría de los días solo ocupa uno. Sin embargo, cambia de signo aproximadamente cada 60 horas, por lo que la hora sí importa en los días de transición. La calculadora te avisa con claridad si tu fecha es una de esas.`
- [ ] Q: `¿Por qué otra página me dio un signo lunar diferente?` A: `Casi siempre se debe a un problema de zona horaria: algunas calculadoras convierten mal la hora de nacimiento, sobre todo en fechas antiguas o lugares con cambios históricos de reloj. Aquí resolvemos el historial completo de la zona horaria de tu lugar, incluido el tiempo local anterior a la estandarización, y mostramos el instante UTC calculado para que puedas comprobarlo.`
- [ ] Q: `Sol, Luna y ascendente: ¿cuál es la diferencia?` A: `El resumen clásico es este: el Sol describe quién eres, la Luna cómo sientes y el ascendente cómo te perciben al conocerte. Juntos forman los tres grandes y son el resumen útil más rápido de una carta natal.`

### `/es/rising-sign/`

- [ ] Schema name: `Calculadora de ascendente`.
- [ ] FAQ heading: `Preguntas sobre el ascendente`.
- [ ] Q: `¿Qué es el ascendente?` A: `Tu ascendente es el signo del zodiaco que aparecía sobre el horizonte oriental en el momento en que naciste. Da forma a las primeras impresiones: cómo te perciben las personas antes de conocer tu signo solar. También establece la distribución de todas las casas de tu carta.`
- [ ] Q: `¿Por qué necesito mi hora exacta de nacimiento?` A: `El ascendente recorre los doce signos cada 24 horas: cambia de signo aproximadamente cada dos horas y, a veces, incluso más rápido. Cerca de un límite, quince minutos pueden importar. El certificado de nacimiento es la mejor fuente; después vienen los registros del hospital y la memoria familiar.`
- [ ] Q: `¿Qué pasa si mi hora de nacimiento está redondeada, por ejemplo a las 7:00?` A: `Las horas redondeadas son comunes en los registros. Si tu ascendente calculado cae dentro de los primeros o últimos grados de un signo, unos minutos pueden cambiar el resultado. Revisa también el signo vecino y, si puedes, confirma la hora con otra fuente; identificarte con una descripción no sustituye un dato preciso.`
- [ ] Q: `¿Qué es el regente de la carta?` A: `El planeta que rige tu ascendente se llama regente de la carta. La astrología trata su signo y su casa como un tema importante de tu vida. La calculadora lo identifica automáticamente y usa las regencias tradicionales para mantener la coherencia.`
- [ ] Q: `¿De verdad es tan importante el ascendente?` A: `En la lectura de una carta es, posiblemente, el punto individual más importante: fija las casas y decide en qué ámbitos de la vida cae cada planeta. También explica por qué dos personas nacidas el mismo día pueden tener vidas organizadas de manera muy distinta.`

### `/es/saturn-return/`

- [ ] Schema name: `Calculadora del retorno de Saturno`.
- [ ] FAQ heading: `Preguntas sobre el retorno de Saturno`.
- [ ] Q: `¿Qué es un retorno de Saturno?` A: `Es el momento en que Saturno en tránsito vuelve al grado exacto que ocupaba cuando naciste. Saturno tarda unos 29,4 años en recorrer el zodiaco, así que el primer retorno llega cerca de los 29 años, el segundo cerca de los 58 y el tercero alrededor de los 88. La astrología lo interpreta como una revisión de aquello que funciona por inercia en vez de por elección.`
- [ ] Q: `¿Cuándo es mi retorno de Saturno?` A: `Ingresa tu fecha de nacimiento. La calculadora recorre el movimiento real de Saturno y devuelve las fechas exactas, incluidas las pasadas retrógradas. La mayoría de los primeros retornos empieza entre los 28 y los 30 años; la idea popular de que “arruinó mis 29” suele describir la parte central del periodo.`
- [ ] Q: `¿Por qué mi retorno de Saturno tiene tres fechas?` A: `Saturno retrograda unos cuatro meses y medio cada año. Cuando ese bucle hacia atrás cruza tu grado natal, el planeta puede tocarlo tres veces: una avanzando, otra retrocediendo y una última al salir. Todo el intervalo, que suele durar de ocho a doce meses, forma parte del retorno.`
- [ ] Q: `¿Cuánto dura un retorno de Saturno?` A: `Los cruces exactos pueden abarcar desde unos días hasta cerca de un año, según intervenga o no el bucle retrógrado. La experiencia se interpreta de forma más amplia: normalmente se considera todo el tránsito de Saturno por el signo de tu Saturno natal, unos dos años y medio.`
- [ ] Q: `¿Es malo el retorno de Saturno?` A: `Tiene fama de demolición, pero funciona más como una inspección. Las carreras, relaciones y formas de vida que encajan se consolidan; las que se sostienen solo por costumbre pasan factura. Muchas personas lo consideran terrible a los 29 y formativo al mirarlo desde los 35.`

### `/es/transits/`

- [ ] Schema name: `Rastreador de tránsitos: el cielo sobre tu carta`.
- [ ] Schema description: `Consulta qué tránsitos están activos ahora en tu carta natal: el cielo de hoy comparado con tus planetas natales, con un orbe máximo de 3 grados.`
- [ ] Hero sentence: `Los planetas de hoy comparados con los tuyos, con un orbe máximo de 3°. Elige una carta guardada o ingresa tus datos; nada sale de tu dispositivo.`
- [ ] FAQ heading: `Preguntas sobre los tránsitos`.
- [ ] Q: `¿Qué es un tránsito?` A: `Los planetas siguieron moviéndose después de tu nacimiento. Un tránsito es la posición actual de un planeta comparada con una posición de tu carta natal. Por ejemplo, Saturno en tránsito en cuadratura con tu Luna natal significa que hoy Saturno está a noventa grados de la posición que ocupaba la Luna cuando naciste. Los tránsitos son la principal herramienta astrológica para estudiar los tiempos.`
- [ ] Q: `¿Qué tránsitos muestra esta página?` A: `Muestra los aspectos de los diez planetas del cielo de hoy con los diez planetas de tu carta natal cuando tienen un orbe de 3 grados o menos, el margen estrecho en el que suele considerarse activo un tránsito. La Luna en tránsito no aparece en la lista porque recorre toda tu carta cada mes; su posición actual se muestra en la franja del cielo.`
- [ ] Q: `¿Por qué importan más los tránsitos lentos?` A: `La velocidad determina la duración. El Sol cruza un punto natal en unos dos días y Marte en una o dos semanas, pero Saturno puede permanecer durante meses a menos de tres grados de un punto, y Plutón durante un par de años. Además, los bucles retrógrados hacen que los planetas lentos suelan pasar tres veces. La astrología interpreta esas visitas largas como capítulos, no como un estado pasajero.`
- [ ] Q: `¿Necesito mi hora exacta de nacimiento?` A: `Para la mayoría de los tránsitos, no. Los aspectos entre planetas funcionan con la fecha y el lugar de nacimiento. La excepción es la Luna: sin hora se calcula al mediodía y puede quedar hasta seis grados desplazada, así que los tránsitos lunares cerca del límite del orbe son inciertos. La herramienta te avisa cuando ocurre.`

### Other ES page schema strings

- [ ] Tools: `Herramientas gratis de astrología`.
- [ ] Tools description: `Calculadoras gratis de astrología, calculadas de forma privada en tu navegador.`
- [ ] Profile: `Cartas guardadas`.
- [ ] Profile description: `Guarda cartas en este dispositivo y sincronízalas con tu cuenta solo cuando tú lo decidas.`
- [ ] Methodology headline: `Cómo calculamos tu carta`.
- [ ] Methodology topic: `Metodología astronómica, tratamiento de zonas horarias y modelo de privacidad del motor de cartas de Zodiacs.org.`

## Route and fallback notes

- [ ] The homepage ghost CTA says `Ver pronósticos` and leads to
  `/es/horoscopes/`, the existing noindex bridge whose canonical is
  `/horoscopes/`.
- [ ] The directly reachable localized not-found page is `/es/404/` and is
  noindex. Vercel's automatic static fallback still serves the root English
  `/404.html` for an arbitrary missing `/es/...` URL. Locale-aware edge 404
  routing is outside this quality-only packet.
