const BASE_TOKENS = [
  "BLw",
  "BRw",
  "Uw",
  "Fw",
  "Lw",
  "Rw",
  "Bw",
  "Dw",
  "Us",
  "Fs",
  "Rs",
  "Ls",
  "BL",
  "BR",
  "U",
  "F",
  "L",
  "R",
  "B",
  "D",
  "S",
  "H",
];

const OUTPUT_TYPES = ["inverse"];

class NotationError extends Error {
  constructor(token) {
    super(`잘못된 FTO 표기입니다: ${token}`);
    this.name = "NotationError";
  }
}

function readInvalidToken(input, start) {
  const match = input.slice(start).match(/^\S+/);
  return match ? match[0] : input[start];
}

function normalizeReadableSeparators(algorithm) {
  return algorithm.replace(/[(),/]/g, " ");
}

function normalizeSuffix(rawSuffix, input, suffixStart) {
  if (rawSuffix === "" || rawSuffix === "'") {
    return rawSuffix;
  }

  if (rawSuffix === "2") {
    return "'";
  }

  throw new NotationError(readInvalidToken(input, suffixStart - 1));
}

function parseFtoAlgorithm(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const base = BASE_TOKENS.find((candidate) => input.startsWith(candidate, index));

    if (!base) {
      throw new NotationError(readInvalidToken(input, index));
    }

    index += base.length;

    const suffixStart = index;
    while (input[index] === "'" || /[0-9]/.test(input[index])) {
      index += 1;
    }

    tokens.push({
      base,
      suffix: normalizeSuffix(input.slice(suffixStart, index), input, suffixStart),
    });
  }

  return tokens;
}

function invertSuffix(suffix) {
  return suffix === "'" ? "" : "'";
}

function invertToken(token) {
  return {
    ...token,
    suffix: invertSuffix(token.suffix),
  };
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

function transformFtoLine(line) {
  const { algorithm, comment } = splitLineComment(line);
  const normalizedAlgorithm = normalizeReadableSeparators(algorithm);

  if (!normalizedAlgorithm.trim()) {
    return createEmptyLineOutput(algorithm, comment);
  }

  const inverse = formatTokens(invertTokens(parseFtoAlgorithm(normalizedAlgorithm)));
  const inverseWithComment = appendComment(inverse, algorithm, comment);

  return {
    inverse: {
      compact: inverseWithComment,
      expanded: inverseWithComment,
    },
  };
}

export function transformFtoAlgorithm(input) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const transformedLines = lines.map(transformFtoLine);

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
