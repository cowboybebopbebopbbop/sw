[CAMPAIGN type=promo brand=SimpleWine]

Поле (RAW)

Значение (RAW)

Смысл / Mapping

Заказчик

Белозерская Юля

[OWNER] Белозерская Юля

Дедлайн

**25 марта, до конца дня**

[DEADLINE raw="25 марта, до конца дня" iso=2025-03-25T23:59:59]

Дата отправки

27 марта

[SEND\_DATE raw="27 марта" iso=2025-03-27]

ЦА

клиенты SW

[AUDIENCE raw="клиенты SW" normalized="клиенты SimpleWine"]

Идея рассылки

Рассылка с главным акцентом на скидку до 50% в промо Blackout.

[IDEA raw="Рассылка с главным акцентом на скидку до 50% в промо Blackout."]

**Структура письма**

**Тема** (до 30 символов) // **Прехедер** (до 75 символов)

(минимум 3 варианта)

В теме подсветить до -50%.

[BLOCK id=header type=subject\_preheader]

[LIMIT subject<=30 preheader<=75]

[VAR subject=3 preheader=3]

\- requirement\_raw: "В теме подсветить до -50%"

**Главный баннер**

  
**Заголовок / Подзаголовок**

(минимум 3 варианта)

В заголовке буквально 2 слова, как на баннере

далее до -50%

и что-то под ним

**Текст**

до -50%

c 20 по 31 марта

Возьмите тайм-аут

Чтобы не перегореть, как лампочка, нужно замедляться. И мы нашли удачный повод — Час Земли! Предлагаем поддержать акцию и провести 60 минут с выключенным светом и гаджетами — только вы и что-нибудь интересное в бокале. Кстати, на интересное и замедляющее сейчас скидки до -50%. Успейте взять тайм-аут до 30 марта!

Небольшой текст с акцентом на до -50% до 30 марта.

**Кнопка**

(минимум 3 варианта)

**Ссылка:**

[https://simplewine.ru/stock/blackout-sale/](https://simplewine.ru/stock/blackout-sale/)

[BLOCK id=hero type=hero tag=blackout]

[VAR title=3 subtitle=3 cta=3]

[LIMIT subtitle=75-125]

FACTS:

\- title\_rule\_raw: В заголовке буквально 2 слова, как на баннере

\- subtitle\_rule\_raw: далее до -50%

и что-то под ним

\- text\_rule\_raw: Небольшой текст с акцентом на до -50% до 30 марта.

\- mechanic\_raw: "до -50%"

\- period\_raw: "c 20 по 31 марта"

\- url: “[https://simplewine.ru/stock/blackout-sale/](https://simplewine.ru/stock/blackout-sale/)”

[CTA style=button count=1 text="К акции Blackout"]

COPY\_BASE:

Возьмите тайм-аут

Чтобы не перегореть, как лампочка, нужно замедляться. И мы нашли удачный повод — Час Земли! Предлагаем поддержать акцию и провести 60 минут с выключенным светом и гаджетами — только вы и что-нибудь интересное в бокале. Кстати, на интересное и замедляющее сейчас скидки до -50%. Успейте взять тайм-аут до 30 марта!

**Заголовок для иконок-категорий**

красное / белое / крепкое / др.

[BLOCK id=blackout\_heading type=section\_title tag=partner\_list]

[VAR title=3]

FACTS:

\- title\_hint\_raw: Заголовок для иконок-категорий красное / белое / крепкое / др.

**Доп. баннер**

**Дегустации**

[BLOCK id=extra\_banner type=secondary\_banner]

[URL mode=missing]

[VALIDATE required=true]

[VALUE raw=null]

**Дисклеймер**

[BLOCK id=disclaimer type=disclaimer]

[VALUE raw=null]