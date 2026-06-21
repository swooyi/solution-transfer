const WIDE_ALIASES = {
  u: "Uw",
  d: "Dw",
  f: "Fw",
  b: "Bw",
  r: "Rw",
  l: "Lw",
};

const BASE_TOKENS = [
  "Uw",
  "Dw",
  "Fw",
  "Bw",
  "Rw",
  "Lw",
  "U",
  "D",
  "F",
  "B",
  "R",
  "L",
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
  "u",
  "d",
  "f",
  "b",
  "r",
  "l",
];

const MIRROR_RULES = {
  mirrorLeftRight: {
    invertOnly: new Set(["U", "D", "F", "B", "S", "E", "y", "z"]),
    keep: new Set(["M", "x"]),
    swap: {
      R: "L",
      L: "R",
    },
  },
  mirrorFrontBack: {
    invertOnly: new Set(["U", "D", "R", "L", "M", "E", "x", "y"]),
    keep: new Set(["S", "z"]),
    swap: {
      F: "B",
      B: "F",
    },
  },
  mirrorUpDown: {
    invertOnly: new Set(["F", "B", "R", "L", "M", "S", "x", "z"]),
    keep: new Set(["E", "y"]),
    swap: {
      U: "D",
      D: "U",
    },
  },
};

class NotationError extends Error {
  constructor(token) {
    super(`잘못된 3x3 표기입니다: ${token}`);
    this.name = "NotationError";
  }
}

function parse3x3Algorithm(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === ",") {
      throw new NotationError(",");
    }

    const base = BASE_TOKENS.find((candidate) =>
      input.startsWith(candidate, index),
    );

    if (!base) {
      throw new NotationError(readInvalidToken(input, index));
    }

    index += base.length;

    const suffixStart = index;
    while (input[index] === "'" || /[0-9]/.test(input[index])) {
      index += 1;
    }

    const suffix = normalizeSuffix(input.slice(suffixStart, index), input, suffixStart);

    tokens.push(normalizeToken({ base, suffix }));
  }

  return tokens;
}

function readInvalidToken(input, start) {
  const match = input.slice(start).match(/^\S+/);
  return match ? match[0] : input[start];
}

function normalizeSuffix(rawSuffix, input, suffixStart) {
  if (rawSuffix === "" || rawSuffix === "'" || rawSuffix === "2") {
    return rawSuffix;
  }

  if (rawSuffix === "'2") {
    return "2";
  }

  if (rawSuffix === "3") {
    return "'";
  }

  throw new NotationError(readInvalidToken(input, suffixStart - 1));
}

function normalizeToken(token) {
  const normalizedBase = WIDE_ALIASES[token.base] ?? token.base;
  return {
    base: normalizedBase,
    face: normalizedBase.endsWith("w") ? normalizedBase.slice(0, -1) : normalizedBase,
    isWide: normalizedBase.endsWith("w"),
    suffix: token.suffix,
  };
}

function invertSuffix(suffix) {
  if (suffix === "2") {
    return "2";
  }

  return suffix === "'" ? "" : "'";
}

function invertToken(token) {
  return {
    ...token,
    suffix: invertSuffix(token.suffix),
  };
}

function mirrorToken(token, mirrorType) {
  const rule = MIRROR_RULES[mirrorType];

  if (rule.keep.has(token.face)) {
    return token;
  }

  if (rule.swap[token.face]) {
    return {
      ...token,
      base: `${rule.swap[token.face]}${token.isWide ? "w" : ""}`,
      face: rule.swap[token.face],
      suffix: invertSuffix(token.suffix),
    };
  }

  if (rule.invertOnly.has(token.face)) {
    return invertToken(token);
  }

  throw new NotationError(formatToken(token));
}

function formatToken(token) {
  return `${token.base}${token.suffix}`;
}

function formatTokens(tokens) {
  return tokens.map(formatToken).join(" ");
}

function invertTokens(tokens) {
  return [...tokens].reverse().map(invertToken);
}

function findMatchingBracket(input, openIndex) {
  let depth = 0;

  for (let index = openIndex; index < input.length; index += 1) {
    if (input[index] === "[") {
      depth += 1;
    }

    if (input[index] === "]") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new NotationError("[");
}

function findTopLevelCharacter(input, character) {
  let depth = 0;

  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "[") {
      depth += 1;
      continue;
    }

    if (input[index] === "]") {
      depth -= 1;
      continue;
    }

    if (depth === 0 && input[index] === character) {
      return index;
    }
  }

  return -1;
}

function splitCommutatorParts(input) {
  const commaIndex = findTopLevelCharacter(input, ",");

  if (commaIndex === -1) {
    throw new NotationError(",");
  }

  return [input.slice(0, commaIndex), input.slice(commaIndex + 1)];
}

function parse3x3Expression(input) {
  const expression = input.trim();

  if (!expression) {
    return [];
  }

  const conjugateIndex = findTopLevelCharacter(expression, ":");

  if (conjugateIndex !== -1) {
    const setupTokens = parse3x3Expression(expression.slice(0, conjugateIndex));
    const targetTokens = parse3x3Expression(expression.slice(conjugateIndex + 1));
    return [...setupTokens, ...targetTokens, ...invertTokens(setupTokens)];
  }

  if (expression[0] === "[") {
    const closeIndex = findMatchingBracket(expression, 0);

    if (closeIndex === expression.length - 1) {
      const [left, right] = splitCommutatorParts(expression.slice(1, -1));
      const leftTokens = parse3x3Expression(left);
      const rightTokens = parse3x3Expression(right);
      return [
        ...leftTokens,
        ...rightTokens,
        ...invertTokens(leftTokens),
        ...invertTokens(rightTokens),
      ];
    }
  }

  return parse3x3Sequence(expression);
}

function parse3x3Sequence(input) {
  const tokens = [];
  let segment = "";
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === "[") {
      if (segment.trim()) {
        tokens.push(...parse3x3Algorithm(normalizeReadableSeparators(segment)));
        segment = "";
      }

      const closeIndex = findMatchingBracket(input, index);
      tokens.push(...parse3x3Expression(input.slice(index, closeIndex + 1)));
      index = closeIndex + 1;
      continue;
    }

    if (char === "]" || char === ":") {
      throw new NotationError(char);
    }

    segment += char;
    index += 1;
  }

  if (segment.trim()) {
    tokens.push(...parse3x3Algorithm(normalizeReadableSeparators(segment)));
  }

  return tokens;
}

function splitLineComment(line) {
  const commentStart = line.indexOf("//");

  if (commentStart === -1) {
    return {
      algorithm: line,
      comment: "",
    };
  }

  return {
    algorithm: line.slice(0, commentStart),
    comment: line.slice(commentStart),
  };
}

function appendComment(transformedAlgorithm, algorithmPart, comment) {
  if (!comment) {
    return transformedAlgorithm;
  }

  if (!transformedAlgorithm) {
    return `${algorithmPart}${comment}`;
  }

  const spacing = algorithmPart.match(/\s+$/)?.[0] ?? " ";
  return `${transformedAlgorithm}${spacing}${comment}`;
}

function normalizeReadableSeparators(algorithm) {
  return algorithm.replace(/[(),/]/g, " ");
}

function transform3x3Line(line) {
  const { algorithm, comment } = splitLineComment(line);
  const trimmedAlgorithm = normalizeReadableSeparators(algorithm).trim();

  if (!trimmedAlgorithm) {
    return {
      inverse: appendComment("", algorithm, comment),
      mirrorLeftRight: appendComment("", algorithm, comment),
      mirrorLeftRightInverse: appendComment("", algorithm, comment),
      mirrorFrontBack: appendComment("", algorithm, comment),
      mirrorFrontBackInverse: appendComment("", algorithm, comment),
      mirrorUpDown: appendComment("", algorithm, comment),
      mirrorUpDownInverse: appendComment("", algorithm, comment),
    };
  }

  const tokens = parse3x3Expression(algorithm);
  const mirrorLeftRightTokens = tokens.map((token) =>
    mirrorToken(token, "mirrorLeftRight"),
  );
  const mirrorFrontBackTokens = tokens.map((token) =>
    mirrorToken(token, "mirrorFrontBack"),
  );
  const mirrorUpDownTokens = tokens.map((token) =>
    mirrorToken(token, "mirrorUpDown"),
  );

  return {
    inverse: appendComment(formatTokens(invertTokens(tokens)), algorithm, comment),
    mirrorLeftRight: appendComment(
      formatTokens(mirrorLeftRightTokens),
      algorithm,
      comment,
    ),
    mirrorLeftRightInverse: appendComment(
      formatTokens(invertTokens(mirrorLeftRightTokens)),
      algorithm,
      comment,
    ),
    mirrorFrontBack: appendComment(
      formatTokens(mirrorFrontBackTokens),
      algorithm,
      comment,
    ),
    mirrorFrontBackInverse: appendComment(
      formatTokens(invertTokens(mirrorFrontBackTokens)),
      algorithm,
      comment,
    ),
    mirrorUpDown: appendComment(formatTokens(mirrorUpDownTokens), algorithm, comment),
    mirrorUpDownInverse: appendComment(
      formatTokens(invertTokens(mirrorUpDownTokens)),
      algorithm,
      comment,
    ),
  };
}

export function transform3x3Algorithm(input) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const transformedLines = lines.map(transform3x3Line);
  const outputTypes = [
    "inverse",
    "mirrorLeftRight",
    "mirrorLeftRightInverse",
    "mirrorFrontBack",
    "mirrorFrontBackInverse",
    "mirrorUpDown",
    "mirrorUpDownInverse",
  ];

  return Object.fromEntries(
    outputTypes.map((type) => [
      type,
      transformedLines.map((line) => line[type]).join("\n"),
    ]),
  );
}
