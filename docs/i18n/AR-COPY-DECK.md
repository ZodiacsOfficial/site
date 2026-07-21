# Arabic copy deck — zodiacs.org (`ar`, `/ar/`)

Author: Fable · 2026-07-22 · Final Modern Standard Arabic for the AR
launch surfaces. Region-neutral MSA; documents render `lang="ar"
dir="rtl"`; Gregorian calendar; **Latin digits everywhere** (dates,
times, degrees, UTC, coordinates, percentages, counts). `Zodiacs.org`
stays untranslated. Every `{token}` preserved byte-for-byte.

## 0. Direction, punctuation, and typography rules

1. **Bidi isolation.** Every technical value embedded in Arabic text —
   URLs, email addresses, `{email}`, dates like `2026-07-22`, times like
   `12:00 UTC`, degrees like `3°27′`, coordinates, engine versions,
   `GeoNames (CC BY 4.0)`, blockchain addresses — renders inside
   `<bdi>` (or `<span dir="ltr">` where a block is wholly LTR). In plain
   strings destined for `aria-*`/`<title>`, wrap with U+2066…U+2069
   (LRI…PDI). Never rely on first-strong heuristics for values that mix
   digits and separators.
2. **Punctuation.** Arabic comma «،» and question mark «؟» in Arabic
   sentences; Western period stays «.». The house «·» separator remains
   (neutral); the spaced dash becomes « — » unchanged (neutral em dash).
   Ellipsis: «…» (same character as EN keys, e.g. جارٍ الحساب…).
3. **No Latin casing or tracking.** Arabic has no uppercase: any CSS
   `text-transform: uppercase` and `letter-spacing` on kickers,
   mono-labels, and identity rows must be disabled under
   `[dir="rtl"]`/`:lang(ar)` (letter-spacing breaks joining). Emphasis
   comes from weight (500/600) and size, never tracking.
4. **Line breaking.** Normal Arabic breaking; never `word-break:
   break-all` on Arabic text (it severs joined letters). Long LTR values
   inside Arabic lines get `overflow-wrap: anywhere` on the `<bdi>` only.
   No hyphenation (`hyphens: none` for ar).
5. **What stays LTR verbatim** (never reordered, never translated):
   `Zodiacs.org` · `you@example.com` and all emails · all URLs/paths ·
   `UTC` timestamps (`{date} · 12 UTC`) · degree strings `3°27′` ·
   coordinates · `GeoNames (CC BY 4.0)` · `SDK` · `OFL` · `CC BY 4.0` ·
   engine version strings (`engine v…`) · `1080×1350` · house-system
   proper name «Placidus» keeps an Arabic gloss (بلاسيدوس) but the chart
   receipts may cite the Latin term.
6. **Mirroring.** Directional arrows in copy mirror: EN «→» becomes «←»
   in AR strings (see recordViewLink). The zodiac wheel, chart geometry,
   glyphs, pastel icons, and astronomical order NEVER mirror.

## 1. Navigation and site chrome

| Key | العربية |
| --- | --- |
| navPrimary | الأساسية |
| navSigns | الأبراج |
| navTools | الأدوات |
| navLearn | تعلَّم |
| navHoroscopes | التوقعات |
| navCollect | السجلّ |
| navSavedCharts | الخرائط المحفوظة |
| navMenu | القائمة |
| navSite | الموقع |
| navTwelve | الأبراج الاثنا عشر |
| skipContent | تخطَّ إلى المحتوى |
| open | افتح |
| openChart | افتح |
| read | اقرأ |
| rightNow | الآن |
| today | اليوم |
| or | أو |

## 2. Footer

| Key | العربية |
| --- | --- |
| footerTag | أدوات فلكية مجانية وأدلة للأبراج، تُحسب الخرائط بخصوصية داخل متصفحك. |
| footerStartHere | ابدأ من هنا |
| footerPlanets | الكواكب |
| footerHouses | البيوت |
| footerZodiacDates | تواريخ الأبراج |
| footerGlossary | المعجم |
| footerCompute | كيف نحسب |
| footerRegistry | نظرة عامة |
| footerThesis | الأطروحة |
| footerArchive | الأرشيف |
| footerSdk | SDK |
| footerCollectNote | جناح المقتنيات للقراءة فقط: لا حفظ مفاتيح، ولا توقيعات، ولا معاملات. لا شيء فيه نصيحة مالية. |
| footerMethodology | المنهجية |
| footerAbout | عن الموقع |
| footerPrivacy | الخصوصية |
| footerTerms | الشروط |
| footerPlaceData | بيانات الأماكن |
| footerFonts | الخطوط برخصة |
| footerWidgets | الودجات |
| footerDisclosure | الإفصاح |

Language selector self-name: **العربية** (`lang="ar"`, `hreflang="ar"`).
The selector row order follows the page's RTL flow; each name keeps its
own script and its own `lang`.

## 3. Tool names and common labels

| Key | العربية |
| --- | --- |
| birthChart | خريطة الميلاد |
| compatibility | التوافق |
| moonSign | برج القمر |
| risingSign | الطالع |
| moonPhase | طور القمر |
| saturnReturn | عودة زحل |
| transits | العبور |
| birthday | عيد الميلاد |
| retrogrades | التراجعات |
| sun | الشمس |
| moon | القمر |
| rising | الطالع |
| body | الجرم |
| position | الموضع |
| sign | البرج |
| house | البيت |
| chart | الخريطة |
| date | التاريخ |
| time | الوقت |
| place | المكان |
| motion | الحركة |
| optional | اختياري |
| speed | السرعة |
| day | يوم |
| dates | التواريخ |
| element | العنصر |
| ruler | الحاكم |
| natal | الميلادي |
| orb | فلَك التأثير |
| first | الأولى |
| second | الثانية |
| third | الثالثة |
| fourth | الرابعة |
| complete | انقضت |
| underwayNow | جارية الآن |
| aheadOfYou | أمامك |

(Ordinals agree with «عودة» — feminine.)

## 4. Birth-chart form, validation, lifecycle

| Key | العربية |
| --- | --- |
| birthDate | تاريخ الميلاد |
| birthTime | وقت الميلاد |
| birthplace | مكان الميلاد |
| houseSystem | نظام البيوت |
| wholeSignDefault | البروج الكاملة (الافتراضي) |
| placidus | بلاسيدوس |
| computing | جارٍ الحساب… |
| checking | جارٍ التحقق… |
| comparing | جارٍ المقارنة… |
| save | احفظ |
| rename | أعد التسمية |
| remove | احذف |
| getBirthChart | احصل على خريطة ميلادك مجانًا |
| findMoonSign | اعرف برجك القمري |
| findRisingSign | اعرف طالعك |
| enterBirthDetails | أدخل بيانات الميلاد… |
| privacyDevice | خصوصية افتراضيًا: بيانات ميلادك تبقى في هذا المتصفح. |
| placePlaceholder | ابدأ بكتابة اسم مدينة… |
| placeChange | غيِّر مكان الميلاد |
| placeNoResults | لا نتائج |
| placeError | تعذَّر تحميل فهرس الأماكن — تحقق من الاتصال وحاول مجددًا. |
| searchGeo | يشمل البحث نحو 34,000 مكان · GeoNames (CC BY 4.0) |
| chartError | حدث خطأ أثناء حساب الخريطة. حاول مجددًا. |
| moonError | حدث خطأ أثناء حساب هذا القمر. حاول مجددًا. |
| returnError | حدث خطأ أثناء حساب العودة. حاول مجددًا. |
| transitError | حدث خطأ أثناء حساب العبور. حاول مجددًا. |
| compareError | حدث خطأ أثناء مقارنة الخريطتين. حاول مجددًا. |
| noBirthTime | لا أعرفه |
| risingTimeHelp | يتغيّر الطالع كل ساعتين — الساعة هنا مهمة فعلًا. |
| chartTimeHelp | لا تعرف وقت الميلاد؟ ستحصل على الشمس والقمر على أي حال — الطالع وحده يحتاج الساعة. |
| chartSavedDevice | محفوظة · على هذا الجهاز |
| saveThisChart | احفظ هذه الخريطة |
| chartSavedStatus | حُفظت الخريطة على هذا الجهاز. |
| chartSaveFull | يمكن حفظ حتى 40 خريطة — احذف واحدة أولًا. |
| chartSaveError | تعذَّر الحفظ — قد يمنع المتصفح التخزين المحلي. |
| chartSavedMessage | حُفظت ضمن خرائطك. سجِّل الدخول هنا متى أردتها على كل أجهزتك. |
| linkCopied | نُسخ الرابط |
| copyChartLink | انسخ رابط هذه الخريطة |
| rendering | جارٍ الرسم… |
| cardSaved | حُفظت البطاقة |
| saveChartCard | احفظ بطاقة الخريطة |
| shareChart | شارك خريطتك |
| linkToChart | رابط إلى هذه الخريطة |
| chartLinkCopied | نُسخ رابط الخريطة إلى الحافظة. |
| chartCardSaved | حُفظت بطاقة الخريطة. |
| cardError | تعذَّر رسم البطاقة في هذا المتصفح — والعجلة أعلاه تُلتقط لقطةً بالجودة نفسها. |
| shareNote | يحمل الرابط بيانات الميلاد التي أدخلتها — لا يُرسل إلينا شيء، ولا يفتحه إلا من تعطيه إياه. البطاقة صورة 1080×1350 تُرسم على جهازك. |
| needsBirthTime | يلزمه وقت ميلاد |
| chartName | اسم الخريطة |

## 5. Chart result and guided reading

| Key | العربية |
| --- | --- |
| yourMoonSign | برجك القمري |
| yourRisingSign | طالعك |
| moonPhaseAtBirth | طور القمر عند الميلاد |
| chartRuler | حاكم الخريطة |
| planetSteering | الكوكب الذي يقود طالعك. |
| aspectsFound | الاتصالات |
| found | وُجدت |
| applying | متقارب |
| separating | متباعد |
| wholeSignHouses | بيوت البروج الكاملة |
| placidusHouses | بيوت بلاسيدوس |
| engine | engine v |
| readInOrder | نقرؤها بالترتيب |
| readIntro | من الأعلى إلى الأسفل، كما يتلقّاها المنجّم. الجداول أعلاه هي البيانات؛ وهذا ما تقوله. |
| readBigThree | ابدأ بالثلاثة الكبار |
| readBigThreeBody | الشمس والقمر والطالع — البطاقات الثلاث في الأعلى. الهوية والغريزة والمدخل. كل ما تحتها يدقّقها؛ ولا شيء يحلّ محلّها. |
| readRooms | الكواكب، غرفةً غرفة |
| readNoHouses | من دون وقت الميلاد لا بيوت، فيُقرأ كل كوكب ببرجه وحده. أضِف الوقت فيستعيد هذا القسم غرفه. |
| readAspects | الاتصالات الأكثر عملًا |
| readWeather | طقس الخريطة |
| readIn | في |
| dignityDomicile | البيت الأصلي |
| dignityExaltation | الشرف |
| dignityDetriment | الوبال |
| dignityFall | الهبوط |
| dignity | المكانة |
| inThisSign | في هذا البرج |
| inThisHouse | في هذا البيت |
| cusp | رأس البيت |
| span | الامتداد |
| emptyHouseNote | لا كواكب هنا. البيت الخالي ليس فراغًا — تجري موضوعاته عبر الكوكب الذي يحكمه. |
| angleAscNote | الطالع — الدرجة الصاعدة فوق الأفق الشرقي لحظة الميلاد، وعليها تُرسى العجلة كلها. |
| angleDscNote | الغارب — الدرجة الغاربة في الغرب، مقابل الطالع. الباب التقليدي إلى الشركاء. |
| angleMcNote | وسط السماء — الدرجة المتوّجة فوق الرأس عند الميلاد. المهنة والسمعة والحياة الظاهرة. |
| angleIcNote | تحت الأرض (IC) — أدنى نقطة في العجلة، مقابل وسط السماء. البيت والجذور والحياة الخاصة. |
| layersLabel | طبقات الخريطة |
| layerHouses | البيوت |
| explorerHint | المس أي كوكب أو برج أو بيت أو خط اتصال لفحصه — أو ركِّز على العجلة واستخدم مفاتيح الأسهم. |
| explorerLabel | خريطة ميلاد تفاعلية |
| selectionCleared | أُلغي التحديد. |
| inspectorClose | أغلق التفاصيل |
| tourStart | خذ الجولة |
| firstReadingLabel | قراءتك في دقيقتين |
| firstReadingTitle | ماذا تقول خريطتك عنك — وما التالي؟ |
| firstReadingBody | شاهد مزيج شخصيتك، وأين يتجلّى، ونمطًا واحدًا قد تعرفه — وكيف تحوّل الأسطرولوجيا خريطة الميلاد إلى استشراف. |
| firstReadingResumeTitle | قراءتك بانتظارك |
| firstReadingResumeBody | تابع من حيث توقفت على هذا الجهاز. |
| firstReadingStart | اقرأ خريطتي |
| firstReadingExplore | أستكشف بنفسي |
| firstReadingResume | تابع قراءتي |
| firstReadingStep | خطوة |
| firstReadingFullTour | كيف تعمل الخريطة — الجولة الموسّعة |
| firstReadingReplay | أعد سرد حكاية خريطتي |
| chartActionsMore | طرق أخرى لاستخدام هذه الخريطة |
| seeTodaySky | سماء اليوم |
| contextHelpCue | المصطلحات المنقّطة تُفتح لشرح بلغة بسيطة. |
| editorialHow | المعايير التحريرية |
| howWeCompute | كيف نحسب |
| whyThisReading | لماذا هذه القراءة |
| todayHoroscopeLink | التوقعات |
| editedBy | ينشره |

## 6. Notices (time, DST, poles)

| Key | العربية |
| --- | --- |
| dstGapNotice | وقع هذا التوقيت داخل قفزة التوقيت الصيفي فلم يوجد فعليًا — أزحناه إلى الأمام عبر الفجوة، وهي القاعدة المتَّبعة. |
| dstFoldNotice | تكررت تلك الساعة في مكان ميلادك؛ أخذنا المرور الأول. إن كنت تعلم أنه الثاني فخريطتك تكاد لا تتغيّر — يقطع القمر نحو نصف درجة في الساعة. |
| lmtNotice | ميلاد قبل توحيد المناطق الزمنية — استخدمنا التوقيت المحلي الوسطي لتلك الحقبة، وهي القاعدة نفسها في البرمجيات المهنية. |
| polarNotice | قرب القطب إلى هذا الحد لا تُعرَّف بيوت بلاسيدوس، فتستخدم هذه الخريطة بيوت البروج الكاملة. |
| noTimeNotice | من دون وقت الميلاد نحسب على الظهيرة: الكواكب دقيقة في حدود اليوم، أما الطالع والبيوت فيحتاجان الساعة. |
| moonAmbiguousNotice | بدّل القمر برجه في ذلك اليوم — وقراءة الجارَين كليهما إنصاف حتى يُعرف الوقت. |
| fromLinkNotice | فُتحت من رابط مُشارك — جاءت بيانات الميلاد في الرابط نفسه، وحُسبت الخريطة على جهازك للتو. |
| moonChangedNotice | بدّل القمر برجه في ذلك اليوم، ومن دون وقتٍ لا يمكن الجزم على أي جانب من الحد وُلدت. الطور لا يتأثر — فهو أبطأ من أن تُغيّره الساعات. |
| noTransitTimeNotice | لا وقت ميلاد لهذه الخريطة، فقمرها تقدير ظهيرة — قد يبعد حتى ست درجات، وقد يظهر عبورٌ إلى القمر عند حافة فلك التأثير أو يختفي مع الوقت الحقيقي. |
| compareNoTimeNotice | لا وقت ميلاد لدى |
| moonMiddayEstimate | فذلك القمر تقدير ظهيرة — قد يبعد حتى ست درجات، وقد يظهر اتصال قمري عند حافة فلك التأثير أو يختفي مع الوقت الحقيقي. |

## 7. Sky strip, moon pages, dates

| Key | العربية |
| --- | --- |
| skyMercuryRetrograde | عطارد متراجع |
| skyMercuryDirect | عطارد مستقيم |
| skyPlanetRetrograde | {planet} متراجع |
| skyFullMoon | بدر |
| skyNewMoon | محاق |
| skyMoonOn | {event} · {date} |
| skyAsOf | {date} · 12 UTC |
| skyTickerAria | مواضع السماء في {date} الساعة 12:00 UTC |
| moonDiscAria | القمر، مضاء بنسبة {percent}% |
| moonReadingSky | نقرأ السماء… |
| illuminated | مضاء |
| moonIn | القمر في |
| findThatMoon | اعثر على ذلك القمر |
| dateHelp | عيد ميلاد، ذكرى، أي تاريخ كان. |
| placeHelpMoon | يدقّق تحويل الساعة؛ والطور يكاد لا يحتاجه. |
| middayLocalCaption | قُرئ على ظهيرة التوقيت المحلي — وإضافة الساعة تثبّت الدرجة تمامًا. |
| utcTimeCaption | يُقرأ الوقت توقيتًا عالميًا — أضِف مكان الميلاد لتحويل ساعتك المحلية. |
| middayUtcCaption | قُرئ على ظهيرة التوقيت العالمي — الوقت والمكان يثبّتان الدرجة تمامًا. |
| birthChartForDate | احصل على خريطة الميلاد لهذا التاريخ |

`skyMoonOn`, `skyAsOf`: the whole value line renders inside `<bdi>` (it
is `{event} · {date}` with a Latin date). `moonIn` composes with the sign
name: «القمر في الحمل» — the genitive works by juxtaposition; no case
table needed, but keep the composed string in one Arabic run.

## 8. Saturn return, transits, compatibility

| Key | العربية |
| --- | --- |
| natalSaturn | زحلك الميلادي |
| addBirthDetails | أضِف وقت الميلاد ومكانه (اختياري) |
| findSaturnReturn | اعثر على عودة زحل عندك |
| saturnDateHelp | التاريخ وحده يثبّت سنوات عودتك. الوقت والمكان يدقّقان الأيام ببضعة أيام، لا السنة أبدًا. |
| saturnReturnHeading | العودة {ordinal} |
| returnApprox | حُسبت التواريخ على قراءة الظهيرة — ومع وقت الميلاد ومكانه قد تتزحزح بضعة أيام في أي اتجاه. |
| aroundAge29 | نحو سن 29 |
| aroundAge58 | نحو سن 58 |
| aroundAge88 | نحو سن 88 |
| retrogradePass | مرور تراجعي |
| threePasses | ثلاثة مرورات دقيقة: يعبر زحل درجتك، ويعود عليها متراجعًا، ثم يختمها في خروجه. العودة هي هذا الامتداد كله. |
| seeSaturnChart | زحل في خريطة ميلادك |
| whatSaturnMeans | ماذا يعني زحل |
| planetReturn | عودة {planet} |
| natalPlanet | {planet} الميلادي |
| yourChart | خريطتك |
| theSky | السماء |
| transitRingLede | ارسم خريطتك ثم حرّك المنزلق وشاهد الكواكب تسافر فوقها — إلى الأمام أو الخلف، حتى سنة كاملة. |
| checkTransits | افحص عبورك |
| savedChartHelp | الخرائط التي تحسبها وتحفظها تظهر هنا كخيارات بلمسة واحدة، فيتخطى الفحص التالي الكتابة. |
| skyAt | السماء في |
| noTransitsWithin | لا عبور ضمن |
| activeTransitsWithin | عبورات نشطة ضمن |
| activeTransitWithin | عبور نشط ضمن |
| ofExact | من التمام |
| transitMoonOmitted | أُسقط القمر العابر — فهو يقطع الخريطة كلها في شهر |
| quietSky | سماء هادئة بفلك التأثير الضيّق لهذه الصفحة. لا شيء ملحّ — عُد بعد أيام، أو وسّع القراءة إلى أحداث الشهر أدناه. |
| forYourChart | لخريطتك |
| allTransits | كل عبورك |
| transitMiddayUtc | {date} · ظهيرة UTC |
| personA | الشخص A |
| personB | الشخص B |
| sharedChart | خريطة مُشاركة |
| sharedWithYou | شُوركت معك |
| removeSharedChart | أزل الخريطة المشاركة |
| sharedSideHelp | جاء هذا الجانب في الرابط — امسحه لإدخال شخص آخر. |
| name | الاسم |
| compareCharts | قارن الخريطتين |
| sameChart | هذه الخريطة نفسها مرتين — اختر خريطتين مختلفتين. |
| compareSavedHelp | الخرائط المحفوظة تظهر هنا كخيارات بلمسة واحدة، فتكون المقارنة الثانية أسرع من الأولى. |
| crossChartAspects | اتصالًا بين الخريطتين |
| easeful | ميسَّرة |
| charged | مشحونة |
| readPairing | اقرأ الاقتران |
| inviteCompare | ادعُ شخصًا إلى المقارنة |
| inviteLink | رابط الدعوة |
| inviteNote | يحمل الرابط بيانات ميلاد هذا الشخص ويفتح الصفحة بذلك الجانب معبأً — لا يُرسل إلينا شيء. يجدر أخذ موافقته إن لم يكن أنت. |
| inviteCopied | نُسخ رابط الدعوة إلى الحافظة. |
| inviteWith | ادعُ شخصًا إلى مقارنةٍ مع {name} |
| inviteNamedNote | يحمل الرابط بيانات ميلاد {name} ويفتح هذه الصفحة بذلك الجانب معبأً — لا يُرسل إلينا شيء. يجدر أخذ الموافقة إن لم يكن أنت. |
| pairingCta | اقرأ اقتران {a} و{b} |
| compareSavedHeading | قارن {a} و{b} |
| compareSavedPitch | خريطتان محفوظتان مقارنةٌ تنتظر: كل اتصال بين الخريطتين، مقروءًا بأمانة، محسوبًا على هذا الجهاز. |
| compareThese | قارن هاتين الخريطتين |
| addAnotherChart | أضف خريطة أخرى |

## 9. Baby zodiac

| Key | العربية |
| --- | --- |
| babyDueDate | موعد الولادة المتوقع |
| babyCompute | اقرأ سماء موعد الولادة |
| babyNeedDate | أدخل موعد الولادة أولًا. |
| babyError | حدث خطأ أثناء حساب السماء. حاول مجددًا. |
| babySunHead | برج الشمس — شبه مؤكد |
| babySunSingle | الولادة في هذا التاريخ تضع الشمس في |
| babySunNearEdge | يقع التاريخ قرب حافة البرج، فقد يُميل وصولٌ أبكر أو أطول من يوم إلى |
| babySunNearEdgeTail | — تاريخ الولادة يحسم. |
| babySunSplitA | تبدّل الشمس برجها في هذا التاريخ: تخرج الولادة |
| babySunSplitOr | أو |
| babySunSplitTail | بحسب الساعة. لحظة الولادة نفسها تحسم. |
| babyNoonNote | تُقرأ الأبراج على ظهيرة التوقيت العالمي |
| babyMoonHead | برج القمر — واحد من بضعة |
| babyMoonBody | يبدّل القمر برجه كل يومين أو ثلاثة، فأسبوع الولادة يمتد عادةً على برجين أو ثلاثة قمرية. مواليد الأسبوع نفسه قد يحملون أبراجًا مختلفة — يحسم يوم الولادة وساعتها. |
| babyRetroHead | المتراجع عند الولادة |
| babyRetroBody | هذه الكواكب في امتدادها التراجعي حول موعد الولادة. في خريطة الميلاد يُقرأ الكوكب المتراجع أكثر اتجاهًا إلى الداخل — أمرٌ شائع ولا شيء فيه يُصلَح. |
| babyRisingHead | الطالع — لا يُعرف قبل الدقيقة |
| babyRisingBody | يتغيّر الطالع كل ساعتين تقريبًا، فلا يتنبأ به أي موعد ولادة. إنه الموضع الوحيد الذي ينتظر شهادة الميلاد. |
| babyDateLink | اقرأ هذا اليوم بعمق |
| babyChartLink | بعد الولادة: الخريطة الكاملة |

## 10. Profile, saved charts, sync, digest

| Key | العربية |
| --- | --- |
| savedCharts | الخرائط المحفوظة |
| profile | ملفك |
| welcomeBack | أهلًا بعودتك. |
| savedChartAria | خريطتك المحفوظة |
| todayAgainstChart | اليوم في مواجهة خريطتك |
| yourCharts | خرائطك |
| recommendedNext | الخطوة التالية |
| todayForName | ماذا يعني اليوم لـ{name} |
| savedChartTodayBody | خريطتك ثابتة، وسماء اليوم لا تثبت — ابدأ بما يتحرك لك الآن. |
| openSavedChart | افتح الخريطة المحفوظة |
| pfdToday | اليوم لهذه الخريطة |
| pfdComing | ما هو قادم لهذه الخريطة |
| pfdYearAhead | السنة المقبلة لهذه الخريطة |
| pfdYearBusy | نحسب السنة على جهازك — بضع ثوانٍ… |
| pfdYearNote | محسوب من خريطتك المحفوظة: تواريخ دقيقة للأشهر الاثني عشر المقبلة. |
| saveYearAheadNote | الخرائط المحفوظة تحصل في صفحة الملف على سنةٍ محسوبة مقبلة — العودة الشمسية، وتواريخ المشتري وزحل، ومواقع الكسوف والخسوف. |
| pfdChartPick | الخريطة |
| pfdQuietSky | سماء هادئة لهذه الخريطة اليوم — لا شيء ضمن 3° من نقطة ميلادية. |
| pfdQuietAhead | لا كبير في أفق هذه الخريطة ضمن النافذة المحسوبة. |
| pfdSaturnBusy | نحسب نوافذ زحل على جهازك… |
| pfdEmptyTitle | سماؤك، متى حفظت خريطة |
| pfdEmptyBody | احفظ خريطة ميلاد وستُفتح هذه الصفحة كل يوم بعبورها وبيوتها وما هو قادم لها. |
| pfdWindows | نوافذ |
| nothingSaved | لا شيء محفوظ بعد. |
| emptyProfile | الخرائط التي تحفظها ستقيم هنا، على جهازك أولًا. احسب خريطة واضغط «احفظ هذه الخريطة» لتبدأ. |
| saved | محفوظة |
| syncedWhenSignedIn | تتزامن بعد تسجيل الدخول |
| storedBrowser | مخزنة في هذا المتصفح |
| timeUnknown | الوقت غير معروف |
| needsTime | يلزمه وقت |
| syncOn | المزامنة مفعّلة |
| keepEveryDevice | خرائطك على كل جهاز |
| signedIn | تم تسجيل الدخول |
| signedInAs | مسجَّل الدخول باسم {email} |
| syncCopyOn | الخرائط المحفوظة وعمليات الحذف تتزامن بين الأجهزة. |
| syncCopyOff | احفظ الخرائط على هذا الجهاز، وسجِّل الدخول متى أردتها على كل أجهزتك. |
| checkEmail | افحص بريدك؛ فيه رابط الدخول. ستتزامن هذه الصفحة بعد عودتك. |
| syncFailed | تعذَّرت المزامنة. حاول مجددًا. |
| syncing | جارٍ التزامن… |
| synced | تمّت المزامنة |
| syncNow | زامن الآن |
| signOut | سجِّل الخروج |
| emailSyncAria | البريد لمزامنة الملف |
| sending | جارٍ الإرسال… |
| sendSignIn | أرسل رابط الدخول |
| removeChartConfirm | أتحذف «{name}» من هذا الجهاز؟ |
| chartSavedBeforeLink | حُفظت ضمن خرائطك. سجِّل الدخول |
| chartSavedLink | هنا |
| chartSavedAfterLink | متى أردتها على كل أجهزتك. |
| weeklyDigestTitle | بريد السماء الأسبوعي |
| weeklyDigestCopy | رسالة واحدة في الأسبوع: السماء في مواجهة خرائطك المحفوظة. يمكنك إلغاء الاشتراك متى شئت. |
| weeklyDigestAria | الاشتراك في الموجز الأسبوعي |
| digestSaved | حُفظ خيار الموجز. |
| digestFailed | تعذَّر تحديث خيار الموجز. حاول مجددًا. |

`{email}` and `{name}` values render inside `<bdi>`. `signedInAs` puts a
Latin email inside an Arabic sentence — the deck string is written so the
value sits at the end of the visual line.

## 11. Email capture and confirmation (growth keys)

| Key | العربية |
| --- | --- |
| emailCaptureKicker | توقع أسبوعي مجاني |
| emailCaptureTitle | أسبوعك المقبل. |
| emailCapturePersonalTitle | أسبوع {sign} المقبل. |
| emailCaptureCopy | توقع أسبوعي لبرجك. مجاني، وإلغاء الاشتراك متاح دائمًا. |
| emailCaptureEmailLabel | عنوان البريد |
| emailCaptureEmailPlaceholder | you@example.com |
| emailCaptureSignLegend | برجك الشمسي (اختياري) |
| emailCaptureNoSign | من دون برج |
| emailCaptureUsingSign | برجك الشمسي: {sign} |
| emailCaptureChangeSign | غيِّر |
| emailCaptureSubmit | أرسلوا لي أسبوعي |
| emailCaptureSubmitting | جارٍ الاشتراك… |
| emailCaptureSuccess | افحص بريدك لتأكيد الاشتراك. |
| emailCaptureErrorTitle | الاشتراك غير متاح |
| emailCaptureError | تعذَّر بدء الاشتراك. حاول مجددًا. |
| emailCapturePrivacy | نحفظ بريدك مع البرج الذي اخترته فقط — ولا نحفظ بيانات الميلاد أبدًا. |
| emailCaptureHoneypot | اترك هذا الحقل فارغًا |
| emailPendingTitle | افحص بريدك. |
| emailPendingBody | استخدم رابط التأكيد الذي أرسلناه — يبدأ الاشتراك بعد تأكيدك. |
| emailConfirmSubject | أكّد اشتراكك في Zodiacs.org |
| emailConfirmMessage | أكّد رغبتك في تلقّي رسائل Zodiacs.org: |
| emailConfirmIgnore | يعمل الرابط 48 ساعة. إن لم تطلب هذا فتجاهل الرسالة — لن يُشترك شيء. |
| emailConfirmTitle | تحقق أخير. |
| emailConfirmBody | أكّد الاشتراك ليبدأ. قبل ذلك لا شيء فعّال. |
| emailConfirmAction | أكّد الاشتراك |
| emailConfirmedTitle | تم تأكيد الاشتراك. |
| emailConfirmedBody | كل رسالة تحوي رابط إلغاء الاشتراك. |
| emailConfirmInvalidTitle | هذا الرابط غير صالح. |
| emailConfirmInvalidBody | ربما انتهت مدته — تعمل الروابط 48 ساعة — أو استُخدم من قبل. اطلب رابطًا جديدًا من أي نموذج اشتراك في الموقع. |
| emailReturnHome | العودة إلى Zodiacs.org |

## 12. Plural categories the current system cannot express

Arabic has six CLDR categories: `zero`, `one`, `two` (dual), `few`
(3–10), `many` (11–99), `other` (100+). Affected wherever a count
renders: charts (خريطة/خريطتان/خرائط/خريطة بصيغة العدّ), saved charts,
aspects (اتصال/اتصالان/اتصالات/اتصالًا), transits (عبور/عبوران/عبورات),
places, windows. Contract: the same `tp(locale, key, n)` helper as RU,
with keys `key.zero/.one/.two/.few/.many/.other`; the AR deck supplies
all six forms at implementation time for each counting key — the dual
(«خريطتان») must never be produced by templating «2 + plural».
Until `tp` exists, no AR surface may interpolate a bare count into a
noun phrase.

## 13. Sign names, dates, essences (signs.ts overrides)

Names (SIGN_NAME_OVERRIDES.ar): الحمل، الثور، الجوزاء، السرطان، الأسد،
العذراء، الميزان، العقرب، القوس، الجدي، الدلو، الحوت.

Dates (SIGN_DATES_OVERRIDES.ar — Latin digits, Arabic month names,
Gregorian): «21 مارس – 19 أبريل» · «20 أبريل – 20 مايو» · «21 مايو – 20
يونيو» · «21 يونيو – 22 يوليو» · «23 يوليو – 22 أغسطس» · «23 أغسطس – 22
سبتمبر» · «23 سبتمبر – 22 أكتوبر» · «23 أكتوبر – 21 نوفمبر» · «22
نوفمبر – 21 ديسمبر» · «22 ديسمبر – 19 يناير» · «20 يناير – 18 فبراير» ·
«19 فبراير – 20 مارس». Each date range renders inside `<bdi>` so the
digit–dash–digit run keeps its order in RTL context.

Essences (SIGN_ESSENCE_OVERRIDES.ar):

| البرج | الجوهر |
| --- | --- |
| الحمل | أول المنطلقين — مباشر وسريع ولا يهاب البدايات. |
| الثور | يدٌ ثابتة وذوقٌ حسن وذاكرة طويلة للراحة. |
| الجوزاء | سريع، فضولي، مخلوق للمحادثة. |
| السرطان | يشعر أولًا، يذكر كل شيء، ويحمي ما يحب. |
| الأسد | قلب دافئ وتعبير حاضر، وُلد للضوء. |
| العذراء | دقيقة ونافعة، تدير المشهد كله بهدوء. |
| الميزان | يزن كل شيء — للجمال وللإنصاف معًا. |
| العقرب | عمقٌ وثبات ونظرة لا تُردّ. |
| القوس | طريق بعيد وفكر رحب وضحكة صادقة. |
| الجدي | صعود طويل ودعابة جافة ونتيجة في موعدها. |
| الدلو | زاوية نظر خاصة وباب مفتوح للمستقبل. |
| الحوت | إصغاء رقيق للجميع وبحر في الداخل. |

## 14. Astrology vocabulary (astrology.ts + glossary)

Planets: الشمس، القمر، عطارد، الزهرة، المريخ، المشتري، زحل، أورانوس،
نبتون، بلوتو؛ العقدة الشمالية، العقدة الجنوبية.
Aspects: اقتران، تسديس، تربيع، تثليث، مقابلة.
Moon phases: محاق، هلال متزايد، التربيع الأول، أحدب متزايد، بدر، أحدب
متناقص، التربيع الأخير، هلال متناقص.
Elements: النار، التراب، الهواء، الماء. Modalities: انقلابي (cardinal)،
ثابت، متحول. Houses: «البيت {n}» with Latin digit («البيت 7»). Full
bilingual canonical table shared with Russian lives in the handoff
§Glossary.

## 15. Route metadata (title · description)

| Route | Title | Description |
| --- | --- | --- |
| /ar/ | Zodiacs.org — خرائط الميلاد والأسطرولوجيا بلغة هادئة | خرائط ميلاد مجانية وتوافق وأدلة للأبراج. كل شيء يُحسب بخصوصية في متصفحك ويُشرح بلغة بسيطة. |
| /ar/tools/ | أدوات فلكية — الخريطة والتوافق والعبور | أدوات مجانية: خريطة الميلاد، برج القمر، الطالع، طور القمر، عودة زحل، العبور. بخصوصية، داخل المتصفح. |
| /ar/birth-chart/ | خريطة ميلاد مجانية — الشمس والقمر والطالع | احسب خريطة ميلادك: الشمس والقمر والطالع والكواكب والبيوت ومعانيها. بخصوصية في متصفحك وبلغة بسيطة. |
| /ar/compatibility/ | التوافق بين خريطتي ميلاد | قارن خريطتين: كل اتصال بين الخريطتين محسوب بأمانة وخصوصية على جهازك. |
| /ar/moon-sign/ | برج القمر — اعرفه من تاريخ ميلادك | اعثر على برجك القمري من تاريخ الميلاد، مع إشارة صادقة متى بدّل القمر برجه في يومك. |
| /ar/rising-sign/ | الطالع — احسبه من وقت الميلاد | يتغيّر الطالع كل ساعتين. احسب طالعك من التاريخ والوقت والمكان — بخصوصية في المتصفح. |
| /ar/moon-phase/ | طور القمر عند الميلاد | اعرف طور القمر لأي تاريخ — نسبة الإضاءة والبرج والمعنى، من دون غموض. |
| /ar/saturn-return/ | عودة زحل — متى تقع وما معناها | سنوات عودتك وتواريخها الدقيقة محسوبة من التقاويم الفلكية، بمروراتها الثلاثة. |
| /ar/transits/ | عبور اليوم — السماء في مواجهة خريطتك | ارسم خريطتك وشاهد عبور اليوم إليها — بأفلاك التأثير والدرجات وتوقيت UTC. |
| /ar/baby-zodiac/ | أبراج المولود من موعد الولادة | ما الذي يُعرف قبل الولادة — بصدق: الشمس شبه مؤكدة، القمر واحد من بضعة، والطالع ينتظر الدقيقة. |
| /ar/profile/ | خرائطك المحفوظة | الخرائط التي حفظتها — على جهازك أولًا، وعلى كل أجهزتك بعد الدخول. |
| /ar/methodology/ | المنهجية — كيف نحسب | التقاويم الفلكية وأنظمة البيوت وأفلاك التأثير وقواعد النشر: هكذا تُبنى حسابات Zodiacs.org. |
| /ar/privacy/ | الخصوصية | ما نحفظه وما لا نحفظه، ولماذا تبقى الحسابات في متصفحك. |
| /ar/disclosure/ | الإفصاح | معلومات مفصحة عن المشروع ومصادر البيانات وجناح المقتنيات. |
| /ar/404/ | الصفحة غير موجودة | لا صفحة هنا. ابدأ من الرئيسية أو من الأدوات. |
| /ar/{sign}/ | {البرج}: التواريخ والطباع والتوافق | دليل برج {البرج}: التواريخ والعنصر والحاكم ومواطن القوة وسلوك البرج في العلاقات. |

## 16. English-only destination labels (deferred seams)

- Inline suffix: «— بالإنجليزية حاليًا» (e.g., «توقعات اليوم — بالإنجليزية
  حاليًا»).
- Tooltip/aria: «المحتوى متاح بالإنجليزية حاليًا».
- Section note: «الإصدارات اليومية تصدر بالإنجليزية حاليًا. البيانات
  المحسوبة أدناه صالحة بأي لغة.»
- No promises, no dates, no «قريبًا».

## 17. Legal and trust wording

| Context | العربية |
| --- | --- |
| Privacy anchor line | تُنفَّذ الحسابات في متصفحك. لا تُرسل بيانات الميلاد إلى أي خادم ما لم تفعّل المزامنة بنفسك. |
| Sync consent line | تحفظ المزامنة الخرائط التي تختارها في حسابك لعرضها على أجهزتك الأخرى. أنت وحدك من يفعّلها، وتُلغى بنقرة واحدة. |
| Non-determinism line | الأسطرولوجيا هنا لغة تأمّل لا حُكم مقضيّ. نصف الأنماط والتواريخ، ويبقى الاستنتاج لك. |
| No-advice line | لا شيء في الموقع نصيحة طبية أو مالية أو قانونية. |
| Registry note | جناح المقتنيات أرشيف سجلات: قراءة فقط، بلا محافظ ولا توقيعات ولا أي عرض للشراء. |
| Fonts line (footer) | الخطوط برخصة OFL. |
| GeoNames credit | بيانات الأماكن: GeoNames (CC BY 4.0). |

Never state or imply native-speaker/human review; never surface internal
tooling in consumer copy. Trust shows itself through receipts: UTC times,
degrees, and honest hedges — in Arabic exactly as in English.
