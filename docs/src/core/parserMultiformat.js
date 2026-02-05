// parser.js - Brief parsing logic based on parsing_logic.txt

class BriefParser {
    constructor() {
        this.glossary = {
            spirits: /ксн|крепк|виски|коньяк|водка|текила|ром/gi,
            still_wine: /тих[иое]|вин[оа](?!\s*игрист)/gi,
            sparkling: /игрист|шампан|просекко|кава/gi,
            non_alcoholic: /б\/а|безалк/gi,
            accessories: /акссы|аксы|аксессуар/gi
        };

        this.typeKeywords = {
            new: /новинк|премьер/gi,
            selection: /подборк|хит|выбор покупателей/gi,
            promo: /скидк|%|sale|промо|распродаж/gi
        };
    }

    parse(markdown, filename = 'document.docx') {
        const result = {
            meta_info: {
                source_file: filename,
                parsing_date: new Date().toISOString().split('T')[0]
            },
            campaign: this.parseCampaign(markdown),
            mechanics: this.parseMechanics(markdown),
            assortment_normalized: this.parseAssortment(markdown),
            segments: this.parseSegments(markdown),
            formats_required: this.parseFormats(markdown),
            legal_constraints: this.parseLegalConstraints()
        };

        return result;
    }

    parseCampaign(text) {
        const campaign = {
            internal_name: this.extractInternalName(text),
            type: this.determineCampaignType(text),
            period: this.extractPeriod(text),
            key_message_inputs: this.extractKeyMessages(text)
        };

        return campaign;
    }

    extractInternalName(text) {
        // Look for "Название", "Тема", or first heading
        const nameMatch = text.match(/(?:Название|Тема|Кампания)[:\s]*([^\n]+)/i);
        if (nameMatch) {
            return nameMatch[1].trim();
        }

        // Try to find first heading
        const headingMatch = text.match(/^#\s+(.+)$/m);
        return headingMatch ? headingMatch[1].trim() : "Мультиформат";
    }

    determineCampaignType(text) {
        const textLower = text.toLowerCase();
        
        if (this.typeKeywords.new.test(textLower)) return "new";
        if (this.typeKeywords.selection.test(textLower)) return "selection";
        if (this.typeKeywords.promo.test(textLower)) return "promo";
        
        return "promo"; // default
    }

    extractPeriod(text) {
        const period = {
            start: null,
            end: null,
            raw_text: null,
            deep_discount_period: null
        };

        // Look for date patterns: DD.MM or DD.MM.YYYY
        const datePattern = /(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?/g;
        const periodSection = this.extractSection(text, /Срок|Период|Дат/i);
        
        if (periodSection) {
            const dates = [];
            let match;
            while ((match = datePattern.exec(periodSection)) !== null) {
                const day = match[1].padStart(2, '0');
                const month = match[2].padStart(2, '0');
                const year = match[3] || new Date().getFullYear();
                dates.push(`${year}-${month}-${day}`);
            }

            if (dates.length >= 2) {
                period.start = dates[0];
                period.end = dates[1];
                period.raw_text = periodSection.split('\n')[0].trim();
            } else if (dates.length === 1) {
                period.start = dates[0];
                period.raw_text = periodSection.split('\n')[0].trim();
            }
        }

        // Check for deep discount period
        if (/усиление промо|глубок[иое]+ скидк|2 дня|финал/i.test(text)) {
            const deepMatch = text.match(/(?:усиление|глубок[иое]+ скидк|финал)[^\n]*?(\d{1,2})[.\-](\d{1,2})/i);
            if (deepMatch) {
                period.deep_discount_period = {
                    description: deepMatch[0],
                    date: `${new Date().getFullYear()}-${deepMatch[2].padStart(2, '0')}-${deepMatch[1].padStart(2, '0')}`
                };
            }
        }

        return period;
    }

    extractKeyMessages(text) {
        const messages = {
            what_happens: null,
            main_line: null,
            sub_line: null,
            heroes_raw: null
        };

        // Extract copywriting sections
        const kvSection = this.extractSection(text, /КВ|Копирайт|Лайн/i);
        if (kvSection) {
            const lines = kvSection.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
                messages.main_line = lines[0].replace(/^[^\w]*/, '').trim();
                if (lines.length > 1) {
                    messages.sub_line = lines[1].replace(/^[^\w]*/, '').trim();
                }
            }
        }

        // Extract what happens
        const promoMatch = text.match(/(?:промо|акци|кампани)[:\s]*([^\n]+)/i);
        if (promoMatch) {
            messages.what_happens = promoMatch[1].trim();
        }

        // Extract product categories mentioned
        const assortSection = this.extractSection(text, /Ассортимент|Участвует|Товар/i);
        if (assortSection) {
            messages.heroes_raw = assortSection.replace(/^.*?:\s*/i, '').split('\n')[0].trim();
        }

        return messages;
    }

    parseMechanics(text) {
        const mechanics = {
            discount_percent: null,
            min_quantity: null,
            condition_text: null,
            is_deep_discount: false
        };

        const mechanicsSection = this.extractSection(text, /Механик|Условия|Скидк/i);
        const searchText = mechanicsSection || text;

        // Extract discount percentage
        const discountMatch = searchText.match(/(?:до\s+)?-?(\d{1,2})%/i);
        if (discountMatch) {
            const percent = discountMatch[1];
            mechanics.discount_percent = discountMatch[0].includes('до') || searchText.toLowerCase().includes('до') 
                ? `до -${percent}%` 
                : `-${percent}%`;
        }

        // Extract minimum quantity
        const qtyMatch = searchText.match(/от\s+(\d+)\s*(?:бут|шт|бутыл)/i);
        if (qtyMatch) {
            mechanics.min_quantity = parseInt(qtyMatch[1]);
            mechanics.condition_text = qtyMatch[0];
        } else {
            mechanics.min_quantity = 1;
            mechanics.condition_text = "от 1 бутылки";
        }

        // Check for deep discount
        mechanics.is_deep_discount = /углубл|усилен|глубок.+скидк|избранн.+хит/i.test(searchText);

        return mechanics;
    }

    parseAssortment(text) {
        const assortment = {
            categories: [],
            excludes_alcohol: false,
            has_sku_examples: false,
            sku_list: [],
            is_buyers_choice: false
        };

        const assortSection = this.extractSection(text, /Ассортимент|Участвует|Товар|SKU/i);
        const searchText = assortSection || text;

        // Normalize categories using glossary
        for (const [category, pattern] of Object.entries(this.glossary)) {
            if (pattern.test(searchText)) {
                if (!assortment.categories.includes(category)) {
                    assortment.categories.push(category);
                }
            }
        }

        // Check for non-alcoholic only
        assortment.excludes_alcohol = /только.*б\/а|только.*безалк/i.test(searchText);

        // Check for buyer's choice
        assortment.is_buyers_choice = /скю из вп|выбор покупател/i.test(searchText);

        // Extract SKU codes (s000000 format)
        const skuPattern = /s\d{5,7}[^\n]*/gi;
        const skuMatches = searchText.matchAll(skuPattern);
        
        for (const match of skuMatches) {
            const fullText = match[0];
            const code = fullText.match(/s\d{5,7}/i)[0];
            const name = fullText.replace(code, '').trim().split(/[,\n]/)[0];
            
            // Infer category
            let inferredCategory = null;
            for (const [cat, pattern] of Object.entries(this.glossary)) {
                if (pattern.test(fullText)) {
                    inferredCategory = cat;
                    break;
                }
            }

            assortment.sku_list.push({
                code: code.toLowerCase(),
                name: name || "Не указано",
                inferred_category: inferredCategory
            });
        }

        assortment.has_sku_examples = assortment.sku_list.length > 0;

        return assortment;
    }

    parseSegments(text) {
        const segments = [];
        const segmentSection = this.extractSection(text, /Сегмент|Аудитор|Кому|Получател/i);
        const searchText = segmentSection || text;

        // Check for different segment types
        if (/вся база|все пользовател|вся аудитор/i.test(searchText)) {
            segments.push({
                type: "all_base",
                raw: "вся база",
                channel: this.detectChannel(searchText, "вся база")
            });
        }

        if (/пассив|без заказа|неактивн/i.test(searchText)) {
            const dormantMatch = searchText.match(/(пассив[^\n]*|без заказа[^\n]*)/i);
            segments.push({
                type: "dormant",
                raw: dormantMatch ? dormantMatch[1].trim() : "пассивы",
                channel: this.detectChannel(searchText, dormantMatch ? dormantMatch[0] : "пассивы")
            });
        }

        if (/активн|с заказ/i.test(searchText)) {
            const activeMatch = searchText.match(/(активн[^\n]*)/i);
            segments.push({
                type: "active",
                raw: activeMatch ? activeMatch[1].trim() : "активные",
                channel: this.detectChannel(searchText, activeMatch ? activeMatch[0] : "активные")
            });
        }

        // If no segments detected, add default
        if (segments.length === 0) {
            segments.push({
                type: "all_base",
                raw: "вся база",
                channel: "push"
            });
        }

        return segments;
    }

    detectChannel(text, context) {
        const lowerText = text.toLowerCase();
        const lowerContext = context.toLowerCase();

        if (lowerContext.includes('смс') || lowerText.includes('смс')) return 'sms';
        if (lowerContext.includes('email') || lowerText.includes('email')) return 'email';
        if (lowerContext.includes('пуш') || lowerText.includes('пуш')) return 'push';
        
        return 'push'; // default
    }

    parseFormats(text) {
        const formats = {
            push: { needed: false, has_reminder: false, has_last_call: false },
            sms: { needed: false, has_alcohol_restriction: true },
            landing_page: { needed: true }, // почти всегда нужен
            ticker: { needed: false },
            sticky_banner: { needed: false, has_timer: false },
            tabs: { needed: false },
            yandex_maps: { needed: false },
            onboarding: { needed: false }
        };

        const textLower = text.toLowerCase();
        const formatSection = this.extractSection(text, /Формат|Канал|Где размещ/i);
        const searchText = (formatSection || text).toLowerCase();

        // Detect formats
        formats.push.needed = /пуш|push/i.test(searchText);
        formats.sms.needed = /смс|sms/i.test(searchText);
        formats.ticker.needed = /бегущ|тикер|ticker/i.test(searchText);
        formats.sticky_banner.needed = /стик|sticky|баннер/i.test(searchText);
        formats.tabs.needed = /таб|tab/i.test(searchText);
        formats.yandex_maps.needed = /яндекс|карт|map/i.test(searchText);
        formats.onboarding.needed = /онборд|onboard/i.test(searchText);

        // Timer detection
        formats.sticky_banner.has_timer = /таймер|счетчик|timer/i.test(searchText);

        // Calculate campaign duration
        const period = this.extractPeriod(text);
        let durationDays = 0;
        if (period.start && period.end) {
            const start = new Date(period.start);
            const end = new Date(period.end);
            durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }

        // Reminder and Last Call logic
        if (formats.push.needed) {
            formats.push.has_reminder = durationDays >= 5;
            formats.push.has_last_call = durationDays >= 3;
        }

        // If duration is short, enable timer
        if (durationDays > 0 && durationDays <= 2) {
            formats.sticky_banner.has_timer = true;
        }

        return formats;
    }

    parseLegalConstraints() {
        return {
            age_restriction: "18+",
            warnings: ["Чрезмерное употребление алкоголя вредит вашему здоровью"],
            specific_forbidden_words: ["напиток"]
        };
    }

    extractSection(text, headerPattern) {
        const lines = text.split('\n');
        let capturing = false;
        let section = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (headerPattern.test(line)) {
                capturing = true;
                section.push(line);
                continue;
            }

            if (capturing) {
                // Stop if we hit another header (# or **bold**)
                if (/^#+\s/.test(line) || /^\*\*[^*]+\*\*/.test(line)) {
                    break;
                }
                section.push(line);
            }
        }

        return section.length > 0 ? section.join('\n').trim() : null;
    }
}

// Export for use in app.js
window.BriefParser = BriefParser;
