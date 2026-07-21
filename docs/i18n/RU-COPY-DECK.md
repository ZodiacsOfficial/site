# Russian copy deck — zodiacs.org (`ru`, `/ru/`)

Author: Fable · 2026-07-22 · Final copy for the RU launch surfaces.
Source of truth for keys: `src/lib/i18n/ui/en.ts` (+ `growth.ts` spread),
`src/lib/i18n/astrology.ts`, `src/lib/signs.ts` overrides. Every
`{token}` is preserved byte-for-byte. `Zodiacs.org` is never translated.

Conventions: contemporary standard Russian; «ёлочки» for quotes; spaced
em dash ( — ) matching the house style; no «ё» except where ambiguity
demands; sentence case everywhere (no Latin-style Title Case); calm,
non-deterministic astrology voice — the sky «подсказывает», never
«гарантирует». Dates/times/degrees/UTC/coordinates/URLs/emails keep Latin
digits and existing formats. The reflective register: no promises of fate,
health, money, or relationships — describe patterns, invite reflection.

## 1. Navigation and site chrome

| Key | Русский |
| --- | --- |
| navPrimary | Основное |
| navSigns | Знаки |
| navTools | Инструменты |
| navLearn | Разбор |
| navHoroscopes | Гороскопы |
| navCollect | Реестр |
| navSavedCharts | Сохранённые карты |
| navMenu | Меню |
| navSite | О сайте |
| navTwelve | Двенадцать знаков |
| skipContent | Перейти к содержимому |
| open | Открыть |
| openChart | Открыть |
| read | Читать |
| rightNow | Прямо сейчас |
| today | сегодня |
| or | или |

## 2. Footer

| Key | Русский |
| --- | --- |
| footerTag | Бесплатные астрологические инструменты и гиды по знакам. Карты считаются приватно, прямо в вашем браузере. |
| footerStartHere | С чего начать |
| footerPlanets | Планеты |
| footerHouses | Дома |
| footerZodiacDates | Даты знаков |
| footerGlossary | Глоссарий |
| footerCompute | Как мы считаем |
| footerRegistry | Обзор |
| footerThesis | Манифест |
| footerArchive | Архив |
| footerSdk | SDK |
| footerCollectNote | Коллекционное крыло доступно только для чтения: без хранения ключей, подписей и транзакций. Ничто там не является финансовым советом. |
| footerMethodology | Методология |
| footerAbout | О проекте |
| footerPrivacy | Конфиденциальность |
| footerTerms | Условия |
| footerPlaceData | Данные о местах |
| footerFonts | Шрифты под лицензией |
| footerWidgets | Виджеты |
| footerDisclosure | Раскрытие информации |

Language selector self-name: **Русский** (rendered with `lang="ru"`,
linked with `hreflang="ru"`). It sits in the same «·»-separated row.

## 3. Tool names and common labels

| Key | Русский |
| --- | --- |
| birthChart | Натальная карта |
| compatibility | Совместимость |
| moonSign | Лунный знак |
| risingSign | Асцендент |
| moonPhase | Фаза Луны |
| saturnReturn | Возвращение Сатурна |
| transits | Транзиты |
| birthday | День рождения |
| retrogrades | Ретроградности |
| sun | Солнце |
| moon | Луна |
| rising | Асцендент |
| body | Тело |
| position | Положение |
| sign | Знак |
| house | Дом |
| chart | Карта |
| date | Дата |
| time | Время |
| place | Место |
| motion | Движение |
| optional | необязательно |
| speed | Скорость |
| day | сутки |
| dates | Даты |
| element | Стихия |
| ruler | Управитель |
| natal | Натальный |
| orb | орбис |
| first | Первое |
| second | Второе |
| third | Третье |
| fourth | Четвёртое |
| complete | Позади |
| underwayNow | Идёт сейчас |
| aheadOfYou | Впереди |

## 4. Birth-chart form, validation, lifecycle

| Key | Русский |
| --- | --- |
| birthDate | Дата рождения |
| birthTime | Время рождения |
| birthplace | Место рождения |
| houseSystem | Система домов |
| wholeSignDefault | Целые знаки (по умолчанию) |
| placidus | Плацидус |
| computing | Считаем… |
| checking | Проверяем… |
| comparing | Сравниваем… |
| save | Сохранить |
| rename | Переименовать |
| remove | Удалить |
| getBirthChart | Постройте бесплатную натальную карту |
| findMoonSign | Узнайте свой лунный знак |
| findRisingSign | Узнайте свой асцендент |
| enterBirthDetails | Введите данные рождения… |
| privacyDevice | Приватно по умолчанию. Данные рождения остаются в этом браузере. |
| placePlaceholder | Начните вводить город… |
| placeChange | Изменить место рождения |
| placeNoResults | Ничего не найдено |
| placeError | Не удалось загрузить справочник мест — проверьте соединение и попробуйте ещё раз. |
| searchGeo | Поиск по ~34 000 мест · GeoNames (CC BY 4.0) |
| chartError | Не получилось рассчитать карту. Попробуйте ещё раз. |
| moonError | Не получилось рассчитать эту Луну. Попробуйте ещё раз. |
| returnError | Не получилось рассчитать возвращение. Попробуйте ещё раз. |
| transitError | Не получилось рассчитать транзиты. Попробуйте ещё раз. |
| compareError | Не получилось сравнить карты. Попробуйте ещё раз. |
| noBirthTime | Не знаю время |
| risingTimeHelp | Асцендент меняется каждые два часа — здесь важны именно часы. |
| chartTimeHelp | Нет времени рождения? Солнце и Луну вы всё равно получите — асценденту нужны часы. |
| chartSavedDevice | Сохранено · на этом устройстве |
| saveThisChart | Сохранить эту карту |
| chartSavedStatus | Карта сохранена на этом устройстве. |
| chartSaveFull | Можно хранить до 40 карт — сначала удалите одну. |
| chartSaveError | Не удалось сохранить — возможно, браузер блокирует локальное хранилище. |
| chartSavedMessage | Сохранено в ваши карты. Войдите здесь, если хотите видеть их на всех устройствах. |
| linkCopied | Ссылка скопирована |
| copyChartLink | Скопировать ссылку на эту карту |
| rendering | Рисуем… |
| cardSaved | Карточка сохранена |
| saveChartCard | Сохранить карточку карты |
| shareChart | Поделиться картой |
| linkToChart | Ссылка на эту карту |
| chartLinkCopied | Ссылка на карту скопирована в буфер обмена. |
| chartCardSaved | Карточка карты сохранена. |
| cardError | Не удалось нарисовать карточку в этом браузере — колесо выше отлично снимается и скриншотом. |
| shareNote | Ссылка содержит введённые данные рождения — нам ничего не отправляется, открыть её смогут только те, кому вы её передадите. Карточка — изображение 1080×1350, создаётся на вашем устройстве. |
| needsBirthTime | Нужно время рождения |
| chartName | Название карты |

## 5. Chart result and guided reading

| Key | Русский |
| --- | --- |
| yourMoonSign | Ваш лунный знак |
| yourRisingSign | Ваш асцендент |
| moonPhaseAtBirth | Фаза Луны при рождении |
| chartRuler | Управитель карты |
| planetSteering | планета, ведущая ваш асцендент. |
| aspectsFound | Аспекты |
| found | найдено |
| applying | сходящийся |
| separating | расходящийся |
| wholeSignHouses | Дома целых знаков |
| placidusHouses | Дома Плацидуса |
| engine | движок v |
| readInOrder | Читаем по порядку |
| readIntro | Сверху вниз — так карту читал бы астролог. Таблицы выше — данные; здесь — что они значат. |
| readBigThree | Начните с большой тройки |
| readBigThreeBody | Солнце, Луна, асцендент — три карточки наверху. Личность, инстинкт, вход. Всё, что ниже, уточняет их; ничто их не заменяет. |
| readRooms | Планеты, комната за комнатой |
| readNoHouses | Без времени рождения нет домов, поэтому каждая планета читается только по знаку. Добавьте время — и раздел обретёт свои комнаты. |
| readAspects | Аспекты, которые работают больше всего |
| readWeather | Погода карты |
| readIn | в |
| dignityDomicile | обитель |
| dignityExaltation | экзальтация |
| dignityDetriment | изгнание |
| dignityFall | падение |
| dignity | Достоинство |
| inThisSign | В этом знаке |
| inThisHouse | В этом доме |
| cusp | Куспид |
| span | Протяжённость |
| emptyHouseNote | Планет здесь нет. Пустой дом — не пробел: его темы идут через планету, которая им управляет. |
| angleAscNote | Асцендент — градус, восходящий над восточным горизонтом в момент рождения. Он держит всё колесо. |
| angleDscNote | Десцендент — градус, заходящий на западе, напротив асцендента. Традиционная дверь к партнёрам. |
| angleMcNote | Середина неба — градус, кульминирующий над головой при рождении. Карьера, репутация, видимая жизнь. |
| angleIcNote | IC — нижняя точка колеса, напротив Середины неба. Дом, корни, частная жизнь. |
| layersLabel | Слои карты |
| layerHouses | Дома |
| explorerHint | Коснитесь любой планеты, знака, дома или линии аспекта — или сфокусируйте колесо и листайте стрелками. |
| explorerLabel | Интерактивная натальная карта |
| selectionCleared | Выбор снят. |
| inspectorClose | Закрыть детали |
| tourStart | Пройти экскурсию |
| firstReadingLabel | Ваше чтение за 2 минуты |
| firstReadingTitle | Что ваша карта говорит о вас — и что дальше? |
| firstReadingBody | Посмотрите свой характерный расклад, где он разворачивается, один узнаваемый паттерн — и как астрология превращает карту в прогноз. |
| firstReadingResumeTitle | Ваше чтение ждёт |
| firstReadingResumeBody | Продолжите с того места, где остановились на этом устройстве. |
| firstReadingStart | Прочитать мою карту |
| firstReadingExplore | Разберусь сам(а) |
| firstReadingResume | Продолжить чтение |
| firstReadingStep | Шаг |
| firstReadingFullTour | Как устроена карта — расширенная экскурсия |
| firstReadingReplay | Проиграть историю карты заново |
| chartActionsMore | Ещё способы использовать эту карту |
| seeTodaySky | Небо сегодня |
| contextHelpCue | Термины с точечным подчёркиванием открывают пояснение простым языком. |
| editorialHow | редакционные стандарты |
| howWeCompute | Как мы считаем |
| whyThisReading | Почему такое чтение |
| todayHoroscopeLink | гороскоп |
| editedBy | Публикует |

## 6. Notices (time, DST, poles)

| Key | Русский |
| --- | --- |
| dstGapNotice | Это время попало в «прыжок» перевода часов и формально не существовало — мы сдвинули его вперёд через разрыв, как принято. |
| dstFoldNotice | В месте рождения этот час прошёл дважды; мы взяли первый проход. Если вы знаете, что был второй, карта почти не изменится — Луна проходит около полуградуса в час. |
| lmtNotice | Рождение до введения часовых поясов — мы использовали местное среднее время той эпохи, ту же конвенцию, что и профессиональные программы. |
| polarNotice | Так близко к полюсу дома Плацидуса не определены, поэтому карта использует дома целых знаков. |
| noTimeNotice | Без времени рождения считаем на полдень: планеты точны в пределах дня, а асценденту и домам нужны часы. |
| moonAmbiguousNotice | В этот день Луна сменила знак — пока время не найдено, честно читать обоих соседей. |
| fromLinkNotice | Открыто по ссылке — данные рождения пришли в самой ссылке, и карта только что рассчитана на вашем устройстве. |
| moonChangedNotice | В этот день Луна сменила знак, и без времени нельзя сказать, по какую сторону границы вы родились. Фаза не страдает — она движется слишком медленно, чтобы часы имели значение. |
| noTransitTimeNotice | У этой карты нет времени рождения, так что её Луна — полуденная оценка: она может отстоять до шести градусов, и транзит к Луне у края орбиса может появиться или исчезнуть с настоящим временем. |
| compareNoTimeNotice | Нет времени рождения у |
| moonMiddayEstimate | поэтому эта Луна — полуденная оценка: она может отстоять до шести градусов, и лунный аспект у края орбиса может появиться или исчезнуть с настоящим временем. |

## 7. Sky strip, moon pages, dates

| Key | Русский |
| --- | --- |
| skyMercuryRetrograde | Ретроградный Меркурий |
| skyMercuryDirect | Меркурий директный |
| skyPlanetRetrograde | Ретроградный {planet} |
| skyFullMoon | Полнолуние |
| skyNewMoon | Новолуние |
| skyMoonOn | {event} · {date} |
| skyAsOf | {date} · 12 UTC |
| skyTickerAria | Положения неба на {date}, 12:00 UTC |
| moonDiscAria | Луна, освещено {percent}% |
| moonReadingSky | Читаем небо… |
| illuminated | освещено |
| moonIn | Луна в: |
| findThatMoon | Найти эту Луну |
| dateHelp | День рождения, годовщина — любая дата. |
| placeHelpMoon | Уточняет пересчёт часов; фазе это почти не нужно. |
| middayLocalCaption | Считано на полдень местного времени — точное время суток закрепит градус. |
| utcTimeCaption | Время читается как всемирное — добавьте место рождения, чтобы пересчитать ваши часы. |
| middayUtcCaption | Считано на полдень всемирного времени — время и место закрепят градус точно. |
| birthChartForDate | Построить натальную карту на эту дату |

Note (`moonIn`): Russian needs the prepositional case after «в»
(«Луна в Овне»). The current `t()` concatenation `moonIn + name` cannot
inflect — see deck §12 (grammar table `signPrepositional`).

## 8. Saturn return, transits, compatibility

| Key | Русский |
| --- | --- |
| natalSaturn | Ваш натальный Сатурн |
| addBirthDetails | Добавить время и место рождения (необязательно) |
| findSaturnReturn | Найти своё возвращение Сатурна |
| saturnDateHelp | Одна дата уже закрепляет годы возвращения. Время и место уточняют даты на несколько дней — но не год. |
| saturnReturnHeading | {ordinal} возвращение |
| returnApprox | Даты рассчитаны по полуденному чтению — со временем и местом рождения они могут сдвинуться на несколько дней в любую сторону. |
| aroundAge29 | около 29 лет |
| aroundAge58 | около 58 лет |
| aroundAge88 | около 88 лет |
| retrogradePass | ретроградный проход |
| threePasses | Три точных прохода: Сатурн пересекает ваш градус, возвращается по нему ретроградно и закрепляет на выходе. Возвращение — весь этот отрезок. |
| seeSaturnChart | Сатурн в вашей натальной карте |
| whatSaturnMeans | Что значит Сатурн |
| planetReturn | Возвращение: {planet} |
| natalPlanet | Натальный {planet} |
| yourChart | Ваша карта |
| theSky | Небо |
| transitRingLede | Постройте карту, затем двигайте ползунок и смотрите, как планеты идут по ней — вперёд или назад, до года. |
| checkTransits | Проверить свои транзиты |
| savedChartHelp | Рассчитанные и сохранённые карты появляются здесь в один тап — следующая проверка обойдётся без ввода. |
| skyAt | Небо на |
| noTransitsWithin | Нет транзитов в пределах |
| activeTransitsWithin | активных транзитов в пределах |
| activeTransitWithin | активный транзит в пределах |
| ofExact | от точного |
| transitMoonOmitted | транзитная Луна не показана — она проходит всю карту за месяц |
| quietSky | Тихое небо по строгому орбису этой страницы. Ничего срочного — загляните через пару дней или расширьте чтение до событий месяца ниже. |
| forYourChart | Для вашей карты |
| allTransits | Все ваши транзиты |
| transitMiddayUtc | {date} · полдень UTC |
| personA | Человек A |
| personB | Человек B |
| sharedChart | Присланная карта |
| sharedWithYou | вам поделились |
| removeSharedChart | Убрать присланную карту |
| sharedSideHelp | Эта сторона пришла в ссылке — очистите её, чтобы ввести другого человека. |
| name | Имя |
| compareCharts | Сравнить карты |
| sameChart | Это одна и та же карта дважды — выберите две разные. |
| compareSavedHelp | Рассчитанные и сохранённые карты появляются здесь в один тап — второе сравнение быстрее первого. |
| crossChartAspects | межкартных аспектов |
| easeful | лёгкие |
| charged | напряжённые |
| readPairing | Читать пару |
| inviteCompare | Пригласить на сравнение |
| inviteLink | Ссылка-приглашение |
| inviteNote | Ссылка содержит данные рождения этого человека и открывает страницу с заполненной стороной — нам ничего не отправляется. Если это не вы, стоит спросить его согласия. |
| inviteCopied | Ссылка-приглашение скопирована в буфер обмена. |
| inviteWith | Пригласить кого-то сравниться с {name} |
| inviteNamedNote | Ссылка содержит данные рождения {name} и открывает эту страницу с заполненной стороной — нам ничего не отправляется. Если это не вы, стоит спросить согласия. |
| pairingCta | Читать пару {a} и {b} |
| compareSavedHeading | Сравнить: {a} и {b} |
| compareSavedPitch | Две сохранённые карты — это готовое сравнение: каждый межкартный аспект, честно рассчитанный на этом устройстве. |
| compareThese | Сравнить эти две карты |
| addAnotherChart | Добавить ещё карту |

## 9. Baby zodiac

| Key | Русский |
| --- | --- |
| babyDueDate | Предполагаемая дата родов |
| babyCompute | Прочитать небо на эту дату |
| babyNeedDate | Сначала введите дату. |
| babyError | Не получилось рассчитать небо. Попробуйте ещё раз. |
| babySunHead | Солнечный знак — почти наверняка |
| babySunSingle | Рождение в этот день даёт Солнце в |
| babySunNearEdge | Дата стоит у самой границы знака, так что приход на день с лишним раньше или позже может сместить в |
| babySunNearEdgeTail | — решает дата рождения. |
| babySunSplitA | В этот день Солнце меняет знак: рождение выходит |
| babySunSplitOr | или |
| babySunSplitTail | в зависимости от часа. Решает точный момент рождения. |
| babyNoonNote | знаки читаются на полдень всемирного времени |
| babyMoonHead | Лунный знак — один из нескольких |
| babyMoonBody | Луна меняет знак каждые два-три дня, так что неделя родов обычно охватывает два-три лунных знака. Дети, рождённые в одну неделю, могут нести разные — решают день и час рождения. |
| babyRetroHead | Ретроградные при рождении |
| babyRetroBody | эти планеты в своём ретроградном отрезке около даты родов. В натальной карте ретроградная планета читается как более обращённая внутрь — это обычное дело, чинить нечего. |
| babyRisingHead | Асцендент — не узнать до минуты |
| babyRisingBody | Асцендент меняется примерно каждые два часа, и никакая дата родов его не предскажет. Это единственная позиция, которая ждёт свидетельства о рождении. |
| babyDateLink | Разобрать этот день рождения подробно |
| babyChartLink | После рождения: полная карта |

## 10. Profile, saved charts, sync, digest

| Key | Русский |
| --- | --- |
| savedCharts | Сохранённые карты |
| profile | Ваш профиль |
| welcomeBack | С возвращением. |
| savedChartAria | Ваша сохранённая карта |
| todayAgainstChart | Сегодня на фоне вашей карты |
| yourCharts | Ваши карты |
| recommendedNext | Что дальше |
| todayForName | Что сегодня значит для {name} |
| savedChartTodayBody | Ваша карта не меняется. Сегодняшнее небо — меняется: начните с того, что движется для вас сейчас. |
| openSavedChart | Открыть сохранённую карту |
| pfdToday | Сегодня для этой карты |
| pfdComing | Что впереди у этой карты |
| pfdYearAhead | Год вперёд для этой карты |
| pfdYearBusy | Считаем год на вашем устройстве — несколько секунд… |
| pfdYearNote | Рассчитано по вашей сохранённой карте: точные даты на ближайшие двенадцать месяцев. |
| saveYearAheadNote | Для сохранённых карт профиль считает год вперёд — солнечное возвращение, даты Юпитера и Сатурна, попадания затмений. |
| pfdChartPick | Карта |
| pfdQuietSky | Тихое небо для этой карты сегодня — ничего в пределах 3° от натальных точек. |
| pfdQuietAhead | На горизонте этой карты в рассчитанном окне нет крупного. |
| pfdSaturnBusy | Считаем окна Сатурна на вашем устройстве… |
| pfdEmptyTitle | Ваше небо — после первой сохранённой карты |
| pfdEmptyBody | Сохраните натальную карту, и эта страница будет каждый день открываться её транзитами, домами и тем, что для неё впереди. |
| pfdWindows | окна |
| nothingSaved | Пока ничего не сохранено. |
| emptyProfile | Сохранённые карты будут жить здесь, сначала на вашем устройстве. Рассчитайте карту и нажмите «Сохранить эту карту». |
| saved | сохранено |
| syncedWhenSignedIn | синхронизируются после входа |
| storedBrowser | хранятся в этом браузере |
| timeUnknown | время неизвестно |
| needsTime | нужно время |
| syncOn | Синхронизация включена |
| keepEveryDevice | Карты на всех устройствах |
| signedIn | Вход выполнен |
| signedInAs | Вы вошли как {email} |
| syncCopyOn | Сохранённые карты и удаления синхронизируются между устройствами. |
| syncCopyOff | Сохраняйте карты на этом устройстве. Войдите, когда захотите видеть их везде. |
| checkEmail | Проверьте почту — там ссылка для входа. Страница синхронизируется после возвращения. |
| syncFailed | Синхронизация не удалась. Попробуйте ещё раз. |
| syncing | Синхронизируем… |
| synced | Синхронизировано |
| syncNow | Синхронизировать |
| signOut | Выйти |
| emailSyncAria | Почта для синхронизации профиля |
| sending | Отправляем… |
| sendSignIn | Отправить ссылку для входа |
| removeChartConfirm | Удалить «{name}» с этого устройства? |
| chartSavedBeforeLink | Сохранено в ваши карты. Войдите |
| chartSavedLink | здесь |
| chartSavedAfterLink | когда захотите видеть их на всех устройствах. |
| weeklyDigestTitle | Еженедельное письмо о небе |
| weeklyDigestCopy | Одно письмо в неделю: небо на фоне ваших сохранённых карт. Отписаться можно в любой момент. |
| weeklyDigestAria | Подписка на еженедельный дайджест |
| digestSaved | Настройка дайджеста сохранена. |
| digestFailed | Не удалось обновить настройку дайджеста. Попробуйте ещё раз. |

Counting forms (see §12): `chartSingular` карта · `chartPlural` карты/карт ·
`savedChartSingular` сохранённая карта · `savedChartPlural` сохранённые
карты/сохранённых карт — the current two-form system cannot pick
correctly; the plural helper decides (1 карта · 2 карты · 5 карт).

## 11. Email capture and confirmation (growth keys)

| Key | Русский |
| --- | --- |
| emailCaptureKicker | Бесплатный еженедельный прогноз |
| emailCaptureTitle | Ваша неделя впереди. |
| emailCapturePersonalTitle | Ваша неделя {sign} впереди. |
| emailCaptureCopy | Еженедельный прогноз для вашего знака. Бесплатно, отписка в любой момент. |
| emailCaptureEmailLabel | Адрес почты |
| emailCaptureEmailPlaceholder | you@example.com |
| emailCaptureSignLegend | Ваш солнечный знак (необязательно) |
| emailCaptureNoSign | Без знака |
| emailCaptureUsingSign | Ваш солнечный знак: {sign} |
| emailCaptureChangeSign | Изменить |
| emailCaptureSubmit | Прислать мою неделю |
| emailCaptureSubmitting | Подключаем… |
| emailCaptureSuccess | Проверьте почту, чтобы подтвердить подписку. |
| emailCaptureErrorTitle | Подписка недоступна |
| emailCaptureError | Не удалось оформить подписку. Попробуйте ещё раз. |
| emailCapturePrivacy | Мы храним вашу почту только с выбранным знаком — и никогда данные рождения. |
| emailCaptureHoneypot | Оставьте это поле пустым |
| emailPendingTitle | Проверьте почту. |
| emailPendingBody | Перейдите по ссылке подтверждения из письма — подписка начнётся после этого. |
| emailConfirmSubject | Подтвердите подписку на Zodiacs.org |
| emailConfirmMessage | Подтвердите, что хотите получать письма Zodiacs.org: |
| emailConfirmIgnore | Ссылка действует 48 часов. Если вы ничего не запрашивали, просто проигнорируйте письмо — ничего подписано не будет. |
| emailConfirmTitle | Последняя проверка. |
| emailConfirmBody | Подтвердите подписку, чтобы она началась. До этого ничего не активно. |
| emailConfirmAction | Подтвердить подписку |
| emailConfirmedTitle | Подписка подтверждена. |
| emailConfirmedBody | Каждое письмо содержит ссылку для отписки. |
| emailConfirmInvalidTitle | Ссылка недействительна. |
| emailConfirmInvalidBody | Она могла истечь — ссылки действуют 48 часов — или уже быть использованной. Запросите новую в любой форме подписки на сайте. |
| emailReturnHome | Вернуться на Zodiacs.org |

Note: the RU weekly capture launches with the weekly product (current
committed state). If the Phase 3 daily flag is on at RU release time, the
daily variants are translated in a follow-up deck revision — the daily
capture module is EN-only by design today.

## 12. Grammar the simple system cannot express (required additions)

1. **Plural categories.** Russian: `one` (1, 21, 31…), `few` (2–4,
   22–24…), `many` (0, 5–20, 25–30…), fractional `other`. Affected keys:
   chart counts («{n} карта / {n} карты / {n} карт»), saved-chart counts,
   aspect counts («{n} аспект / аспекта / аспектов»), transit counts
   («{n} активный транзит / активных транзита / активных транзитов»),
   place counts, window counts, year/day spans. Contract: Sol adds an
   `Intl.PluralRules`-backed `tp(locale, key, n)` with per-category
   message keys (`key.one/.few/.many`); the deck supplies all three
   forms wherever a count renders.
2. **Case after prepositions.** «Луна в {sign}» needs prepositional
   case: Овне, Тельце, Близнецах, Раке, Льве, Деве, Весах, Скорпионе,
   Стрельце, Козероге, Водолее, Рыбах. Contract: a
   `signPrepositional` map beside `SIGN_NAME_OVERRIDES.ru` — never
   string-concatenate the nominative into «в …».
3. **Ordinal returns.** `saturnReturnHeading` «{ordinal} возвращение»
   works with the provided Первое/Второе/Третье/Четвёртое (neuter
   agreement with «возвращение») — the EN First/Second keys map 1:1.

## 13. Sign names, dates, essences (signs.ts overrides)

Nominative names (SIGN_NAME_OVERRIDES.ru): Овен, Телец, Близнецы, Рак,
Лев, Дева, Весы, Скорпион, Стрелец, Козерог, Водолей, Рыбы.

Dates (SIGN_DATES_OVERRIDES.ru, Latin digits, RU month abbreviations):
21 мар – 19 апр · 20 апр – 20 мая · 21 мая – 20 июн · 21 июн – 22 июл ·
23 июл – 22 авг · 23 авг – 22 сен · 23 сен – 22 окт · 23 окт – 21 ноя ·
22 ноя – 21 дек · 22 дек – 19 янв · 20 янв – 18 фев · 19 фев – 20 мар.

Essences (SIGN_ESSENCE_OVERRIDES.ru):

| Знак | Суть |
| --- | --- |
| Овен | Первый со старта — прямой, быстрый, не боится начинать. |
| Телец | Твёрдые руки, хороший вкус и долгая память на уют. |
| Близнецы | Быстрые, любопытные, созданы для разговора. |
| Рак | Сначала чувствует, всё помнит, бережёт то, что любит. |
| Лев | Тёплое сердце, выразительность, рождён для света. |
| Дева | Точная, полезная, тихо ведёт всё хозяйство. |
| Весы | Взвешивают всё — ради красоты и ради справедливости. |
| Скорпион | Глубина, выдержка и взгляд, который не отвести. |
| Стрелец | Дальняя дорога, широкая мысль, честный смех. |
| Козерог | Долгий подъём, сухой юмор, результат по расписанию. |
| Водолей | Свой угол зрения — и дверь, открытая будущему. |
| Рыбы | Мягкая настройка на всех, море внутри. |

## 14. Astrology vocabulary (astrology.ts + glossary)

Planets: Солнце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран,
Нептун, Плутон; Северный узел, Южный узел.
Aspects (lowercase in-sentence): соединение, секстиль, квадратура,
трин, оппозиция.
Moon phases: Новолуние, Растущий серп, Первая четверть, Растущая Луна,
Полнолуние, Убывающая Луна, Последняя четверть, Убывающий серп.
Elements: огонь, земля, воздух, вода. Modalities: кардинальный,
фиксированный, мутабельный. Houses: «{n}-й дом» (1-й… 12-й), Дома —
term list: асцендент, десцендент, Середина неба (MC), IC, куспид,
орбис, ретроградный, директный, соединение узлов — see the bilingual
glossary in the handoff §Glossary for the full canonical table shared
with Arabic.

## 15. Route metadata (title · description)

| Route | Title | Description |
| --- | --- | --- |
| /ru/ | Zodiacs.org — натальные карты и астрология без мистики | Бесплатные натальные карты, совместимость и гиды по знакам. Всё считается приватно в вашем браузере и объясняется простым языком. |
| /ru/tools/ | Астроинструменты — карта, совместимость, транзиты | Бесплатные инструменты: натальная карта, лунный знак, асцендент, фаза Луны, возвращение Сатурна, транзиты. Приватно, в браузере. |
| /ru/birth-chart/ | Бесплатная натальная карта — Солнце, Луна и асцендент | Рассчитайте натальную карту: Солнце, Луна, асцендент, планеты, дома и их значение. Приватно в браузере, объяснено простым языком. |
| /ru/compatibility/ | Совместимость по натальным картам | Сравните две карты: каждый межкартный аспект, рассчитанный честно и приватно на вашем устройстве. |
| /ru/moon-sign/ | Лунный знак — узнать по дате рождения | Найдите свой лунный знак по дате рождения. Считается в браузере, с честными оговорками, когда Луна меняла знак. |
| /ru/rising-sign/ | Асцендент — рассчитать по времени рождения | Асцендент меняется каждые два часа. Рассчитайте свой по дате, времени и месту — приватно в браузере. |
| /ru/moon-phase/ | Фаза Луны при рождении | Узнайте фазу Луны на любую дату — освещённость, знак и что это значит, без мистики. |
| /ru/saturn-return/ | Возвращение Сатурна — когда и что это | Годы и точные даты вашего возвращения Сатурна, рассчитанные по эфемеридам, с тремя проходами. |
| /ru/transits/ | Транзиты сегодня — небо на фоне вашей карты | Постройте карту и смотрите сегодняшние транзиты к ней — с орбисами, градусами и временем UTC. |
| /ru/baby-zodiac/ | Знак ребёнка по дате родов | Что можно знать о знаках ребёнка до рождения — честно: Солнце почти наверняка, Луна — один из нескольких, асцендент ждёт минуты. |
| /ru/profile/ | Ваши сохранённые карты | Карты, которые вы сохранили, — сначала на устройстве, при входе на всех устройствах. |
| /ru/methodology/ | Методология — как мы считаем | Эфемериды, системы домов, орбисы и правила публикаций: как устроены расчёты Zodiacs.org. |
| /ru/privacy/ | Конфиденциальность | Что мы храним, чего не храним и почему расчёты остаются в вашем браузере. |
| /ru/disclosure/ | Раскрытие информации | Открытые сведения о проекте, источниках данных и коллекционном крыле. |
| /ru/404/ | Страница не найдена | Такой страницы нет. Начните с главной или с инструментов. |
| /ru/{sign}/ | {Знак}: даты, характер, совместимость | Гид по знаку {Знак}: даты, стихия, управитель, сильные стороны и как знак ведёт себя в отношениях. |

## 16. English-only destination labels (deferred seams)

Rule: an RU page never links an English destination silently. The link
keeps its RU label and carries one quiet suffix, comma-set, small:

- Inline suffix: «— пока по-английски» (e.g., «Сегодняшний гороскоп — пока
  по-английски»).
- Tooltip/aria: «Материал пока доступен по-английски».
- Section note (today/horoscope modules on RU pages):
  «Ежедневные выпуски пока выходят по-английски. Расчётные данные ниже —
  для любого языка.»
- Never «coming soon», no dates promised.

## 17. Legal and trust wording

| Context | Русский |
| --- | --- |
| Privacy anchor line | Расчёты выполняются в вашем браузере. Данные рождения не отправляются на сервер, если вы сами не включаете синхронизацию. |
| Sync consent line | Синхронизация хранит выбранные карты в вашем аккаунте, чтобы показывать их на других устройствах. Включается только вами и выключается в один клик. |
| Non-determinism line | Астрология здесь — язык наблюдения, а не приговор. Мы описываем паттерны и даты; выводы остаются за вами. |
| No-advice line | Ничто на сайте не является медицинским, финансовым или юридическим советом. |
| Registry note | Коллекционное крыло — архив записей: только чтение, без кошельков, подписей и предложений что-либо купить. |
| Fonts line (footer) | Шрифты под лицензией OFL. |
| GeoNames credit | Данные о местах: GeoNames (CC BY 4.0). |

Never state or imply native-speaker/human review; never mention internal
tooling in consumer copy. The trust register is the work itself: receipts,
UTC times, degrees.
