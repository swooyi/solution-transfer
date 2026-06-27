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

const FACE_VECTORS = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const MIRROR_MATRICES = {
  mirrorLeftRight: [
    [-1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  mirrorFrontBack: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ],
  mirrorUpDown: [
    [1, 0, 0],
    [0, -1, 0],
    [0, 0, 1],
  ],
};

const ROTATION_VECTORS = {
  x: FACE_VECTORS.R,
  y: FACE_VECTORS.U,
  z: FACE_VECTORS.F,
};

const SLICE_VECTORS = {
  M: FACE_VECTORS.L,
  E: FACE_VECTORS.D,
  S: FACE_VECTORS.F,
};

const OUTPUT_TYPES = [
  "baseAlgorithm",
  "viewpoint",
  "viewpointInverse",
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

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * vector[index], 0),
  );
}

function multiplyVector(vector, scalar) {
  return vector.map((value) => value * scalar);
}

function dotVectors(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function crossVectors(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function determinant3x3(matrix) {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function vectorKey(vector) {
  return vector.join(",");
}

function findVectorName(vector, vectorMap) {
  const key = vectorKey(vector);
  return Object.entries(vectorMap).find(([, candidate]) => vectorKey(candidate) === key)?.[0];
}

function findAxisToken(vector, vectorMap) {
  const token = findVectorName(vector, vectorMap);

  if (token) {
    return {
      token,
      invertDirection: false,
    };
  }

  const inverseToken = findVectorName(multiplyVector(vector, -1), vectorMap);

  if (inverseToken) {
    return {
      token: inverseToken,
      invertDirection: true,
    };
  }

  return null;
}

function createMatrixFromBasis(oldBasis, newBasis) {
  const columns = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  oldBasis.forEach((oldVector, basisIndex) => {
    const axisIndex = oldVector.findIndex((value) => value !== 0);
    const sign = oldVector[axisIndex];
    columns[axisIndex] = multiplyVector(newBasis[basisIndex], sign);
  });

  return [0, 1, 2].map((rowIndex) => columns.map((column) => column[rowIndex]));
}

function createViewpointMatrix(viewpoint) {
  const xFace = viewpoint?.xFace ?? "U";
  const yFace = viewpoint?.yFace ?? "F";
  const xVector = FACE_VECTORS[xFace];
  const yVector = FACE_VECTORS[yFace];

  if (!xVector || !yVector || dotVectors(xVector, yVector) !== 0) {
    throw new NotationError(`{${xFace},${yFace}}`);
  }

  return createMatrixFromBasis(
    [xVector, yVector, crossVectors(xVector, yVector)],
    [FACE_VECTORS.U, FACE_VECTORS.F, crossVectors(FACE_VECTORS.U, FACE_VECTORS.F)],
  );
}

function mirrorFaceToken(token, matrix) {
  const mirroredFace = findVectorName(
    multiplyMatrixVector(matrix, FACE_VECTORS[token.face]),
    FACE_VECTORS,
  );

  if (!mirroredFace) {
    throw new NotationError(formatToken(token));
  }

  return {
    ...token,
    base: `${mirroredFace}${token.isWide ? "w" : ""}`,
    face: mirroredFace,
    suffix: invertSuffix(token.suffix),
  };
}

function transformFaceToken(token, matrix, shouldInvertSuffix) {
  const transformedFace = findVectorName(
    multiplyMatrixVector(matrix, FACE_VECTORS[token.face]),
    FACE_VECTORS,
  );

  if (!transformedFace) {
    throw new NotationError(formatToken(token));
  }

  return {
    ...token,
    base: `${transformedFace}${token.isWide ? "w" : ""}`,
    face: transformedFace,
    suffix: shouldInvertSuffix ? invertSuffix(token.suffix) : token.suffix,
  };
}

function mirrorAxisToken(token, matrix, vectorMap) {
  const determinant = determinant3x3(matrix);
  const mirroredAxis = findAxisToken(
    multiplyVector(multiplyMatrixVector(matrix, vectorMap[token.face]), determinant),
    vectorMap,
  );

  if (!mirroredAxis) {
    throw new NotationError(formatToken(token));
  }

  return {
    ...token,
    base: mirroredAxis.token,
    face: mirroredAxis.token,
    suffix: mirroredAxis.invertDirection ? invertSuffix(token.suffix) : token.suffix,
  };
}

function transformAxisToken(token, matrix, vectorMap) {
  const transformedAxis = findAxisToken(
    multiplyMatrixVector(matrix, vectorMap[token.face]),
    vectorMap,
  );

  if (!transformedAxis) {
    throw new NotationError(formatToken(token));
  }

  return {
    ...token,
    base: transformedAxis.token,
    face: transformedAxis.token,
    suffix: transformedAxis.invertDirection ? invertSuffix(token.suffix) : token.suffix,
  };
}

function mirrorToken(token, mirrorType) {
  const matrix = MIRROR_MATRICES[mirrorType];

  if (!matrix) {
    throw new NotationError(mirrorType);
  }

  if (token.face in FACE_VECTORS) {
    return mirrorFaceToken(token, matrix);
  }

  if (token.face in ROTATION_VECTORS) {
    return mirrorAxisToken(token, matrix, ROTATION_VECTORS);
  }

  if (token.face in SLICE_VECTORS) {
    return mirrorAxisToken(token, matrix, SLICE_VECTORS);
  }

  throw new NotationError(formatToken(token));
}

function transformViewpointToken(token, matrix) {
  if (token.face in FACE_VECTORS) {
    return transformFaceToken(token, matrix, false);
  }

  if (token.face in ROTATION_VECTORS) {
    return transformAxisToken(token, matrix, ROTATION_VECTORS);
  }

  if (token.face in SLICE_VECTORS) {
    return transformAxisToken(token, matrix, SLICE_VECTORS);
  }

  throw new NotationError(formatToken(token));
}

function formatToken(token, formatOptions = {}) {
  const base =
    formatOptions.wideMoveStyle === "lowercase" && token.isWide
      ? token.base[0].toLowerCase()
      : token.base;

  return `${base}${token.suffix}`;
}

function formatTokens(tokens, formatOptions = {}) {
  return tokens.map((token) => formatToken(token, formatOptions)).join(" ");
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

function transformViewpointAst(ast, matrix) {
  if (ast.type === "move") {
    return {
      type: "move",
      token: transformViewpointToken(ast.token, matrix),
    };
  }

  if (ast.type === "sequence") {
    return createSequence(ast.items.map((item) => transformViewpointAst(item, matrix)));
  }

  if (ast.type === "commutator") {
    return {
      type: "commutator",
      left: transformViewpointAst(ast.left, matrix),
      right: transformViewpointAst(ast.right, matrix),
    };
  }

  if (ast.type === "conjugate") {
    return {
      type: "conjugate",
      setup: transformViewpointAst(ast.setup, matrix),
      target: transformViewpointAst(ast.target, matrix),
    };
  }

  throw new NotationError(ast.type);
}

function formatAst(ast, formatOptions = {}) {
  if (ast.type === "move") {
    return formatToken(ast.token, formatOptions);
  }

  if (ast.type === "sequence") {
    return ast.items.map((item) => formatAst(item, formatOptions)).filter(Boolean).join(" ");
  }

  if (ast.type === "commutator") {
    return `[${formatAst(ast.left, formatOptions)}, ${formatAst(ast.right, formatOptions)}]`;
  }

  if (ast.type === "conjugate") {
    return `${formatAst(ast.setup, formatOptions)} : ${formatAst(ast.target, formatOptions)}`;
  }

  throw new NotationError(ast.type);
}

function formatOutput(ast, formatOptions = {}) {
  return {
    compact: formatAst(ast, formatOptions),
    expanded: formatTokens(expandAst(ast), formatOptions),
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

function transform3x3Line(line, viewpointMatrix, formatOptions) {
  const { algorithm, comment } = splitLineComment(line);
  const trimmedAlgorithm = normalizeReadableSeparators(algorithm).trim();

  if (!trimmedAlgorithm) {
    return createEmptyLineOutput(algorithm, comment);
  }

  const ast = parse3x3Expression(algorithm);
  const mirrorLeftRightAst = mirrorAst(ast, "mirrorLeftRight");
  const mirrorFrontBackAst = mirrorAst(ast, "mirrorFrontBack");
  const mirrorUpDownAst = mirrorAst(ast, "mirrorUpDown");
  const viewpointAst = transformViewpointAst(ast, viewpointMatrix);

  return {
    baseAlgorithm: appendCommentToOutput(formatOutput(ast, formatOptions), algorithm, comment),
    viewpoint: appendCommentToOutput(formatOutput(viewpointAst, formatOptions), algorithm, comment),
    viewpointInverse: appendCommentToOutput(
      formatOutput(invertAst(viewpointAst), formatOptions),
      algorithm,
      comment,
    ),
    inverse: appendCommentToOutput(formatOutput(invertAst(ast), formatOptions), algorithm, comment),
    mirrorLeftRight: appendCommentToOutput(
      formatOutput(mirrorLeftRightAst, formatOptions),
      algorithm,
      comment,
    ),
    mirrorLeftRightInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorLeftRightAst), formatOptions),
      algorithm,
      comment,
    ),
    mirrorFrontBack: appendCommentToOutput(
      formatOutput(mirrorFrontBackAst, formatOptions),
      algorithm,
      comment,
    ),
    mirrorFrontBackInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorFrontBackAst), formatOptions),
      algorithm,
      comment,
    ),
    mirrorUpDown: appendCommentToOutput(
      formatOutput(mirrorUpDownAst, formatOptions),
      algorithm,
      comment,
    ),
    mirrorUpDownInverse: appendCommentToOutput(
      formatOutput(invertAst(mirrorUpDownAst), formatOptions),
      algorithm,
      comment,
    ),
  };
}

export function transform3x3Algorithm(input, options = {}) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const viewpointMatrix = createViewpointMatrix(options.viewpoint);
  const formatOptions = {
    wideMoveStyle: options.wideMoveStyle ?? "wide",
  };
  const transformedLines = lines.map((line) =>
    transform3x3Line(line, viewpointMatrix, formatOptions),
  );

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
