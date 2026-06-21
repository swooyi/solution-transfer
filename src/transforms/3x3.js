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

const OUTPUT_TYPES = [
  "inverse",
  "mirrorLeftRight",
  "mirrorLeftRightInverse",
  "mirrorFrontBack",
  "mirrorFrontBackInverse",
  "mirrorUpDown",
  "mirrorUpDownInverse",
];

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
    return createSequence([]);
  }

  const conjugateIndex = findTopLevelCharacter(expression, ":");

  if (conjugateIndex !== -1) {
    return {
      type: "conjugate",
      setup: parse3x3Expression(expression.slice(0, conjugateIndex)),
      target: parse3x3Expression(expression.slice(conjugateIndex + 1)),
    };
  }

  if (expression[0] === "[") {
    const closeIndex = findMatchingBracket(expression, 0);

    if (closeIndex === expression.length - 1) {
      const [left, right] = splitCommutatorParts(expression.slice(1, -1));
      return {
        type: "commutator",
        left: parse3x3Expression(left),
        right: parse3x3Expression(right),
      };
    }
  }

  return parse3x3Sequence(expression);
}

function parse3x3Sequence(input) {
  const items = [];
  let segment = "";
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === "[") {
      pushSegmentItems(items, segment);
      segment = "";

      const closeIndex = findMatchingBracket(input, index);
      items.push(parse3x3Expression(input.slice(index, closeIndex + 1)));
      index = closeIndex + 1;
      continue;
    }

    if (char === "]" || char === ":") {
      throw new NotationError(char);
    }

    segment += char;
    index += 1;
  }

  pushSegmentItems(items, segment);

  return createSequence(items);
}

function pushSegmentItems(items, segment) {
  if (!segment.trim()) {
    return;
  }

  const tokens = parse3x3Algorithm(normalizeReadableSeparators(segment));
  items.push(...tokens.map((token) => ({ type: "move", token })));
}

function createSequence(items) {
  return {
    type: "sequence",
    items,
  };
}

function expandAst(ast) {
  if (ast.type === "move") {
    return [ast.token];
  }

  if (ast.type === "sequence") {
    return ast.items.flatMap(expandAst);
  }

  if (ast.type === "commutator") {
    const left = expandAst(ast.left);
    const right = expandAst(ast.right);
    return [...left, ...right, ...invertTokens(left), ...invertTokens(right)];
  }

  if (ast.type === "conjugate") {
    const setup = expandAst(ast.setup);
    const target = expandAst(ast.target);
    return [...setup, ...target, ...invertTokens(setup)];
  }

  throw new NotationError(ast.type);
}

function invertAst(ast) {
  if (ast.type === "move") {
    return {
      type: "move",
      token: invertToken(ast.token),
    };
  }

  if (ast.type === "sequence") {
    return createSequence([...ast.items].reverse().map(invertAst));
  }

  if (ast.type === "commutator") {
    return {
      type: "commutator",
      left: ast.right,
      right: ast.left,
    };
  }

  if (ast.type === "conjugate") {
    return {
      type: "conjugate",
      setup: ast.setup,
      target: invertAst(ast.target),
    };
  }

  throw new NotationError(ast.type);
}

function mirrorAst(ast, mirrorType) {
  if (ast.type === "move") {
    return {
      type: "move",
      token: mirrorToken(ast.token, mirrorType),
    };
  }

  if (ast.type === "sequence") {
    return createSequence(ast.items.map((item) => mirrorAst(item, mirrorType)));
  }

  if (ast.type === "commutator") {
    return {
      type: "commutator",
      left: mirrorAst(ast.left, mirrorType),
      right: mirrorAst(ast.right, mirrorType),
    };
  }

  if (ast.type === "conjugate") {
    return {
      type: "conjugate",
      setup: mirrorAst(ast.setup, mirrorType),
      target: mirrorAst(ast.target, mirrorType),
    };
  }

  throw new NotationError(ast.type);
}

function formatAst(ast) {
  if (ast.type === "move") {
    return formatToken(ast.token);
  }

  if (ast.type === "sequence") {
    return ast.items.map(formatAst).filter(Boolean).join(" ");
  }

  if (ast.type === "commutator") {
    return `[${formatAst(ast.left)}, ${formatAst(ast.right)}]`;
  }

  if (ast.type === "conjugate") {
    return `${formatAst(ast.setup)} : ${formatAst(ast.target)}`;
  }

  throw new NotationError(ast.type);
}

function formatOutput(ast) {
  return {
    compact: formatAst(ast),
    expanded: formatTokens(expandAst(ast)),
  };
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

function appendCommentToOutput(output, algorithmPart, comment) {
  return {
    compact: appendComment(output.compact, algorithmPart, comment),
    expanded: appendComment(output.expanded, algorithmPart, comment),
  };
}

function normalizeReadableSeparators(algorithm) {
  return algorithm.replace(/[(),/]/g, " ");
}

function createEmptyLineOutput(algorithm, comment) {
  return Object.fromEntries(
    OUTPUT_TYPES.map((type) => [
      type,
      {
        compact: appendComment("", algorithm, comment),
        expanded: appendComment("", algorithm, comment),
      },
    ]),
  );
}

function transform3x3Line(line) {
  const { algorithm, comment } = splitLineComment(line);
  const trimmedAlgorithm = normalizeReadableSeparators(algorithm).trim();

  if (!trimmedAlgorithm) {
    return createEmptyLineOutput(algorithm, comment);
  }

  const ast = parse3x3Expression(algorithm);
  const mirrorLeftRightAst = mirrorAst(ast, "mirrorLeftRight");
  const mirrorFrontBackAst = mirrorAst(ast, "mirrorFrontBack");
  const mirrorUpDownAst = mirrorAst(ast, "mirrorUpDown");

  return {
    inverse: appendCommentToOutput(formatOutput(invertAst(ast)), algorithm, comment),
    mirrorLeftRight: appendCommentToOutput(
      formatOutput(mirrorLeftRightAst),
      algorithm,
      comment,
    ),
    mirrorLeftRightInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorLeftRightAst)),
      algorithm,
      comment,
    ),
    mirrorFrontBack: appendCommentToOutput(
      formatOutput(mirrorFrontBackAst),
      algorithm,
      comment,
    ),
    mirrorFrontBackInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorFrontBackAst)),
      algorithm,
      comment,
    ),
    mirrorUpDown: appendCommentToOutput(formatOutput(mirrorUpDownAst), algorithm, comment),
    mirrorUpDownInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorUpDownAst)),
      algorithm,
      comment,
    ),
  };
}

export function transform3x3Algorithm(input) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const transformedLines = lines.map(transform3x3Line);

  return Object.fromEntries(
    OUTPUT_TYPES.map((type) => [
      type,
      {
        compact: transformedLines.map((line) => line[type].compact).join("\n"),
        expanded: transformedLines.map((line) => line[type].expanded).join("\n"),
      },
    ]),
  );
}
