export const slugify = (...args: (string | number)[]): string => {
    const defaultReplacements = [
        ["[aàáâãäåāăąǻάαа]", "a"],
        ["[bбḃ]", "b"],
        ["[cçćĉċčћ]", "c"],
        ["[dðďđδдђḋ]", "d"],
        ["[eèéêëēĕėęěέεеэѐё]", "e"],
        ["[fƒφфḟ]", "f"],
        ["[gĝğġģγгѓґ]", "g"],
        ["[hĥħ]", "h"],
        ["[iìíîïĩīĭįıΐήίηιϊийіїѝ]", "i"],
        ["[jĵј]", "j"],
        ["[kķĸκкќ]", "k"],
        ["[lĺļľŀłλл]", "l"],
        ["[mμмṁ]", "m"],
        ["[nñńņňŉŋνн]", "n"],
        ["[oòóôõöōŏőοωόώо]", "o"],
        ["[pπпṗ]", "p"],
        ["q", "q"],
        ["[rŕŗřρр]", "r"],
        ["[sśŝşšſșςσсṡ]", "s"],
        ["[tţťŧțτтṫ]", "t"],
        ["[uùúûüũūŭůűųуў]", "u"],
        ["[vβв]", "v"],
        ["[wŵẁẃẅ]", "w"],
        ["[xξ]", "x"],
        ["[yýÿŷΰυϋύыỳ]", "y"],
        ["[zźżžζз]", "z"],
        ["[æǽ]", "ae"],
        ["[χч]", "ch"],
        ["[ѕџ]", "dz"],
        ["ﬁ", "fi"],
        ["ﬂ", "fl"],
        ["я", "ia"],
        ["[ъє]", "ie"],
        ["ĳ", "ij"],
        ["ю", "iu"],
        ["х", "kh"],
        ["љ", "lj"],
        ["њ", "nj"],
        ["[øœǿ]", "oe"],
        ["ψ", "ps"],
        ["ш", "sh"],
        ["щ", "shch"],
        ["ß", "ss"],
        ["[þθ]", "th"],
        ["ц", "ts"],
        ["ж", "zh"],

        // White_Space, General_Category=Dash_Punctuation and Control Codes
        ["[\\u0009-\\u000D\\u001C-\\u001F\\u0020\\u002D\\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\u058A\\u05BE\\u1400\\u1806\\u2010-\\u2015\\u2E17\\u2E1A\\u2E3A\\u2E3B\\u2E40\\u301C\\u3030\\u30A0\\uFE31\\uFE32\\uFE58\\uFE63\\uFF0D]", "-"],
    ];

    const replaceLoweringCase = (string: string, [regExp, replacement]: any) => string.replace(RegExp(regExp, "giu"), replacement);

    let value = args.join(" ");

    defaultReplacements.forEach(([a, b]) => {
        value = replaceLoweringCase(value, [a, b]);
    });

    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "-")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "-")
        .replace(/\s+/g, "-");
};
